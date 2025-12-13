import { useEffect, useRef, useState, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MindElixir from 'mind-elixir';
import toast from 'react-hot-toast';
import './mind-elixir.css';
import mindmapService from '../../api/mindmapService';
import uploadService from '../../api/uploadService';
import './MindmapEditor.css';
import useAuthStore from '../../store/authStore';

const MindmapEditor = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [title, setTitle] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [showTips, setShowTips] = useState(true);
    const [isDirty, setIsDirty] = useState(false); // Track unsaved changes
    const [isViaShareLink, setIsViaShareLink] = useState(false); // Access via share link
    
    // Share modal states
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareInfo, setShareInfo] = useState({ shared_with: [], is_public: false, share_link: null, public_permission: 'view' });
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState('view');
    const [shareLoading, setShareLoading] = useState(false);
    const [isOwner, setIsOwner] = useState(true);
    const [myPermission, setMyPermission] = useState('edit'); // 'view' or 'edit'
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Auto-save every 30 seconds (works for both new and existing mindmaps)
    useEffect(() => {
        // Don't auto-save if read-only, no mindmap instance, or no id
        if (isReadOnly || !mindRef.current || !id) return;

        const autoSaveInterval = setInterval(async () => {
            // Auto-save if there are changes (works for both new and existing mindmaps)
            // This includes newly created mindmaps that have been modified
            if (isDirty && mindRef.current && id) {
                try {
                    const data = mindRef.current.getData();
                    await mindmapService.update(id, {
                        title,
                        data,
                        updated_at: new Date()
                    });
                    setIsDirty(false);
                    // Silent save - no toast notification
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }, 10000); // 10 seconds

        return () => clearInterval(autoSaveInterval);
    }, [id, title, isDirty, isReadOnly]);

    // Theme state
    const [theme, setTheme] = useState({
        '--main-color': '#444446',
        '--main-bgcolor': '#ffffff',
        '--color': '#777777',
        '--bgcolor': '#f6f6f6',
        '--panel-color': '#444446',
        '--panel-bgcolor': '#ffffff',
        '--root-color': '#ffffff',
        '--root-bgcolor': '#2c3e50',
        '--root-radius': '5px',
        '--main-radius': '5px',
        '--main-gap-x': '30px',
        '--main-gap-y': '30px',
        '--node-gap-x': '30px',
        '--node-gap-y': '30px',
    });
    const [isThemeOpen, setIsThemeOpen] = useState(false);

    const handleUpdateGap = (type, value) => {
        setTheme(prev => ({
            ...prev,
            [`--${type}-gap-x`]: value,
            [`--${type}-gap-y`]: value
        }));
    };

    const handleUpdateTheme = (key, value) => {
        setTheme(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const mindRef = useRef(null);
    const containerRef = useRef(null);
    const activeNodeRef = useRef(null);
    const fileInputRef = useRef(null);
    const observerRef = useRef(null);

    const initMindmap = (data, readOnly = false) => {
        if (!containerRef.current) return;

        if (mindRef.current) {
            containerRef.current.innerHTML = '';
            mindRef.current = null;
        }

        const options = {
            el: containerRef.current,
            direction: data?.direction !== undefined ? data.direction : MindElixir.SIDE, // Default to SIDE (balanced)
            draggable: !readOnly, // Allow panning even in read-only
            contextMenu: !readOnly, // Disable context menu in read-only
            toolBar: !readOnly, // Disable toolbar in read-only
            nodeMenu: !readOnly, // Disable node menu in read-only
            keypress: !readOnly, // Disable keyboard shortcuts in read-only
            locale: 'en',
            theme: {
                name: 'Vibrant',
                palette: ['#FF5722', '#FFC107', '#8BC34A', '#03A9F4', '#9C27B0', '#009688', '#E91E63', '#3F51B5'],
            },
        };

        try {
            const mind = new MindElixir(options);

            mind.bus.addListener('selectNode', (node) => {
                setSelectedNode(node.nodeObj || node);
                activeNodeRef.current = node.nodeObj || node;
                setIsInspectorOpen(true);
            });

            mind.bus.addListener('unselectNode', () => {
                setSelectedNode(null);
                activeNodeRef.current = null;
                setIsInspectorOpen(false);
            });

            mind.bus.addListener('operation', (operation) => {
                // Block operations in read-only mode
                if (readOnly) {
                    return;
                }
                
                setIsDirty(true);
                if (['addChild', 'insertSibling', 'finishEdit', 'beginEdit'].includes(operation.name)) {
                    setTimeout(() => {
                        if (mind.currentNode) {
                            setSelectedNode(mind.currentNode.nodeObj || mind.currentNode);
                            activeNodeRef.current = mind.currentNode.nodeObj || mind.currentNode;
                            setIsInspectorOpen(true);
                        }
                    }, 100);
                }
            });

            mind.init(data);

            if (containerRef.current) {
                containerRef.current.ondblclick = () => {
                    setTimeout(() => {
                        if (mind.currentNode) {
                            setSelectedNode(mind.currentNode.nodeObj || mind.currentNode);
                            activeNodeRef.current = mind.currentNode.nodeObj || mind.currentNode;
                            setIsInspectorOpen(true);
                        }
                    }, 100);
                };
            }

            if (theme) {
                mind.changeTheme({
                    name: 'Custom',
                    palette: ['#FF5722', '#FFC107', '#8BC34A', '#03A9F4', '#9C27B0', '#009688', '#E91E63', '#3F51B5'],
                    cssVar: theme
                });
            }

            mindRef.current = mind;

        } catch (error) {
            console.error('MindElixir initialization error:', error);
        }
    };

    // Helper to find a node by ID in the data tree
    const getTargetNode = (node, targetId) => {
        if (node.id === targetId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = getTargetNode(child, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    const updateNodeData = (key, value, nodeId = null) => {
        if (!mindRef.current || isReadOnly) return; // Block updates in read-only mode

        // Helper to update a single node
        const updateSingleNode = (id, k, v) => {
            if (mindRef.current.nodeData) {
                const node = getTargetNode(mindRef.current.nodeData, id);
                if (node) {
                    node[k] = v;
                    return true;
                }
            }
            //Fallback to getData()
            const currentData = mindRef.current.getData();
            const node = getTargetNode(currentData.nodeData || currentData, id);
            if (node) {
                node[k] = v;
                return true;
            }
            return false;
        };

        const targetId = nodeId || selectedNode?.id;
        if (!targetId) return;

        if (updateSingleNode(targetId, key, value)) {
            try {
                mindRef.current.refresh();
                setIsDirty(true);
                if (targetId === selectedNode?.id) {
                    setSelectedNode(prev => ({ ...prev, [key]: value }));
                }
            } catch (err) {
                console.warn(err);
            }
        }
    };

    const fetchMindmap = async () => {
        try {
            // Always use getOne for normal mindmap routes (/teacher/mindmaps/:id or /student/mindmaps/:id)
            // Share link routes use /mindmap/public/:shareLink which uses PublicMindmapView component
            const response = await mindmapService.getOne(id);
            if (response.success) {
                setTitle(response.data.title);
                const ownerStatus = response.data.isOwner !== false;
                setIsOwner(ownerStatus);
                setIsViaShareLink(false); // This is normal access, not via share link

                // Check user's permission if not owner
                let userPermission = 'edit'; // Default to edit for owner
                if (!ownerStatus && response.data.shared_with && Array.isArray(response.data.shared_with)) {
                    const userId = user?._id || user?.id;
                    const userShare = response.data.shared_with.find(
                        share => String(share.user_id) === String(userId) || share.email === user?.email
                    );
                    if (userShare) {
                        userPermission = userShare.permission || 'view';
                    } else {
                        userPermission = 'view'; // Default to view if shared but permission not found
                    }
                }
                
                setMyPermission(userPermission);
                const readOnlyMode = !ownerStatus && userPermission === 'view';
                setIsReadOnly(readOnlyMode);

                let mapData = response.data.data;
                if (!mapData || !mapData.nodeData) {
                    mapData = MindElixir.new('Main Topic');
                } else {
                    if (!mapData.arrows) mapData.arrows = [];
                    if (!mapData.summaries) mapData.summaries = [];
                    // Ensure direction is set to SIDE (balanced) if not set
                    if (mapData.direction === undefined) {
                        mapData.direction = MindElixir.SIDE;
                    }
                }

                initMindmap(mapData, readOnlyMode);
            }
        } catch (error) {
            console.error('Failed to fetch mindmap:', error);
            toast.error(t('mindmap.loadFailed') || 'Failed to load mindmap');
        }
    };

    // Share functionality
    const fetchShareInfo = async () => {
        try {
            const response = await mindmapService.getShareInfo(id);
            if (response.success) {
                setShareInfo(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch share info:', error);
        }
    };

    const handleOpenShare = async () => {
        setIsShareOpen(true);
        await fetchShareInfo();
    };

    const handleShare = async () => {
        if (!shareEmail.trim()) return;
        
        try {
            setShareLoading(true);
            const response = await mindmapService.share(id, {
                email: shareEmail,
                permission: sharePermission
            });
            if (response.success) {
                setShareInfo(prev => ({ ...prev, shared_with: response.data.shared_with }));
                setShareEmail('');
                toast.success(t('mindmap.share.shareSuccess') + ' ' + shareEmail);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('mindmap.share.shareFailed'));
        } finally {
            setShareLoading(false);
        }
    };

    const handleUnshare = async (userId) => {
        try {
            const response = await mindmapService.unshare(id, userId);
            if (response.success) {
                setShareInfo(prev => ({ ...prev, shared_with: response.data.shared_with }));
                toast.success(t('mindmap.share.removeAccess'));
            }
        } catch (error) {
            toast.error(t('mindmap.share.shareFailed'));
        }
    };

    const handleUpdateUserPermission = async (userEmail, newPermission) => {
        try {
            const response = await mindmapService.share(id, {
                email: userEmail,
                permission: newPermission
            });
            if (response.success) {
                setShareInfo(prev => ({ ...prev, shared_with: response.data.shared_with }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('mindmap.share.shareFailed'));
        }
    };

    const handleTogglePublic = async (isPublic, permission) => {
        try {
            const response = await mindmapService.togglePublic(id, {
                is_public: isPublic,
                permission: permission || shareInfo.public_permission || 'view'
            });
            if (response.success) {
                setShareInfo(prev => ({
                    ...prev,
                    is_public: response.data.is_public,
                    share_link: response.data.share_link,
                    public_permission: response.data.public_permission || 'view'
                }));
            }
        } catch (error) {
            toast.error(t('mindmap.share.shareFailed'));
        }
    };

    const handleUpdatePublicPermission = async (newPermission) => {
        if (!shareInfo.is_public) return;
        try {
            const response = await mindmapService.togglePublic(id, {
                is_public: true,
                permission: newPermission
            });
            if (response.success) {
                setShareInfo(prev => ({
                    ...prev,
                    public_permission: response.data.public_permission || 'view'
                }));
            }
        } catch (error) {
            toast.error(t('mindmap.share.shareFailed'));
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/mindmap/public/${shareInfo.share_link}`;
        navigator.clipboard.writeText(link);
        toast.success(t('mindmap.share.linkCopied'));
    };

    const updateNodeStyle = (prop, value, nodeId = null) => {
        setIsDirty(true); // Mark as dirty
        if (!mindRef.current) return;

        const currentData = mindRef.current.getData();
        let targetId = nodeId || selectedNode?.id;

        if (!targetId && mindRef.current.currentNode) {
            const nodeData = mindRef.current.currentNode.nodeObj || mindRef.current.currentNode;
            targetId = nodeData?.id;
        }

        const node = getTargetNode(currentData.nodeData || currentData, targetId);
        if (!node) return;

        if (mindRef.current.updateNodeStyle) {
            mindRef.current.updateNodeStyle(node, prop, value);
        } else {
            if (!node.style) node.style = {};
            node.style[prop] = value;
        }

        if (!mindRef.current.updateNodeStyle) {
            mindRef.current.refresh(currentData);
        }

        if (mindRef.current.layout) mindRef.current.layout();
        if (mindRef.current.linkDiv) mindRef.current.linkDiv();

        if (selectedNode && node.id === selectedNode.id) {
            setSelectedNode(prev => ({
                ...prev,
                style: { ...prev.style, [prop]: value }
            }));
        }
    };

    const updateNodeTags = (tags, nodeId) => {
        updateNodeData('tags', tags, nodeId);
    };

    const updateNodeIcons = (icons, nodeId) => {
        updateNodeData('icons', icons, nodeId);
    };

    const handleUpdateHyperlink = (url, nodeId) => {
        updateNodeData('hyperLink', url, nodeId);
    };

    const handleTopicChange = (e) => {
        const newTopic = e.target.value;
        setSelectedNode(prev => ({ ...prev, topic: newTopic }));
        // Note: isDirty handled in onBlur -> updateNodeData, but UI state is local until then
    };

    const handleTopicBlur = (e) => {
        const value = e.target.value;
        const hasImage = selectedNode && selectedNode.image;

        let finalValue = value;
        if (!value.trim()) {
            if (hasImage) {
                finalValue = '';
            } else {
                finalValue = '\u200B';
            }
        }
        updateNodeData('topic', finalValue, selectedNode?.id);
    };

    useEffect(() => {
        fetchMindmap();
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [id]);

    useEffect(() => {
        if (mindRef.current && theme) {
            mindRef.current.changeTheme({
                name: 'Custom',
                palette: ['#FF5722', '#FFC107', '#8BC34A', '#03A9F4', '#9C27B0', '#009688', '#E91E63', '#3F51B5'],
                cssVar: theme
            });

            if (containerRef.current) {
                Object.keys(theme).forEach(key => {
                    containerRef.current.style.setProperty(key, theme[key]);
                });
            }

            setTimeout(() => {
                if (mindRef.current.layout) mindRef.current.layout();
                if (mindRef.current.linkDiv) mindRef.current.linkDiv();
            }, 200);
        }
    }, [theme]);

    // Helper to extract text from topic (simple version)
    const extractTextFromTopic = (topicHtml) => {
        if (!topicHtml) return '';
        if (typeof topicHtml === 'string' && (topicHtml.includes('<img') || topicHtml.includes('<div>'))) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = topicHtml;
            return tempDiv.textContent || tempDiv.innerText || '';
        }
        return topicHtml;
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        if (!selectedNode) {
            toast.error(t('mindmap.selectNodeFirst'));
            return;
        }

        try {
            const response = await uploadService.uploadImage(file);

            const url = response.url || (response.data && response.data.url);

            if (url) {
                const getImageDimensions = (src) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const maxWidth = 300;
                            const maxHeight = 300;
                            let width = img.width;
                            let height = img.height;

                            if (width > maxWidth) {
                                height = (maxWidth / width) * height;
                                width = maxWidth;
                            }
                            if (height > maxHeight) {
                                width = (maxHeight / height) * width;
                                height = maxHeight;
                            }
                            resolve({ width: Math.round(width), height: Math.round(height) });
                        };
                        img.onerror = () => {
                            resolve({ width: 100, height: 100 });
                        };
                        img.src = src;
                    });
                };

                const dimensions = await getImageDimensions(url);

                const imageObj = {
                    url: url,
                    width: dimensions.width,
                    height: dimensions.height
                };

                // Get current text content (clean up any previous HTML)
                const currentText = extractTextFromTopic(selectedNode.topic);

                const newTopic = currentText;

                if (mindRef.current) {
                    const targetId = selectedNode.id;
                    let node = null;

                    // Try to find node in current data
                    if (mindRef.current.nodeData) {
                        node = getTargetNode(mindRef.current.nodeData, targetId);
                    }

                    if (!node) {
                        const currentData = mindRef.current.getData();
                        node = getTargetNode(currentData.nodeData || currentData, targetId);
                    }

                    if (node) {
                        node.image = imageObj;
                        node.topic = newTopic;
                        try {
                            mindRef.current.refresh();
                        } catch (err) {
                            console.warn(err);
                        }
                    }
                }

                // Update local state
                setSelectedNode(prev => ({
                    ...prev,
                    image: imageObj,
                    topic: newTopic
                }));
            } else {
                toast.error(t('mindmap.uploadFailed'));
            }
        } catch (error) {
            toast.error(t('mindmap.uploadFailed') + ': ' + error.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleInsertImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSave = async () => {
        if (!mindRef.current || isReadOnly) return; // Block save in read-only mode

        try {
            const data = mindRef.current.getData();
            
            // Normal save via ObjectID (share link routes use PublicMindmapView component)
            await mindmapService.update(id, {
                title,
                data,
                updated_at: new Date()
            });
            
            setIsDirty(false); // Reset dirty state on save
            toast.success(t('mindmap.saveSuccess'));
        } catch (error) {
            toast.error(t('mindmap.saveFailed') + ': ' + error.message);
        }
    };

    const handleBack = () => {
        const rolePath = user?.role === 'teacher' ? 'teacher' : 'student';
        navigate(`/${rolePath}/mindmaps`);
    };

    const handleExport = async (type) => {
        if (!mindRef.current) return;

        try {
            if (type === 'json') {
                const data = mindRef.current.getData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title || 'mindmap'}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else if (type === 'png' || type === 'svg') {
                const mapCanvas = containerRef.current.querySelector('.map-canvas');
                if (!mapCanvas) return;

                await new Promise(resolve => setTimeout(resolve, 500));

                const html2canvas = (await import('html2canvas')).default;

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                const updateBounds = (rect, parentRect) => {
                    const left = rect.left - parentRect.left;
                    const top = rect.top - parentRect.top;
                    if (left < minX) minX = left;
                    if (top < minY) minY = top;
                    if (left + rect.width > maxX) maxX = left + rect.width;
                    if (top + rect.height > maxY) maxY = top + rect.height;
                };

                const parentRect = mapCanvas.getBoundingClientRect();
                const elements = mapCanvas.querySelectorAll('*');

                Array.from(elements).forEach(child => {
                    if (child.style.display === 'none') return;
                    const rect = child.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        updateBounds(rect, parentRect);
                    }
                });

                if (minX === Infinity) {
                    minX = 0; minY = 0;
                    maxX = mapCanvas.offsetWidth;
                    maxY = mapCanvas.offsetHeight;
                }

                const padding = 60;
                minX -= padding;
                minY -= padding;
                maxX += padding;
                maxY += padding;

                const width = maxX - minX;
                const height = maxY - minY;

                const canvas = await html2canvas(mapCanvas, {
                    backgroundColor: theme['--main-bgcolor'] || '#ffffff',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    x: minX,
                    y: minY,
                    width: width,
                    height: height,
                    ignoreElements: () => false,
                    onclone: (clonedDoc) => {
                        const clonedCanvas = clonedDoc.querySelector('.map-canvas');
                        if (clonedCanvas) {
                            clonedCanvas.style.transform = 'none';
                        }
                    }
                });

                if (type === 'png') {
                    const pngUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = `${title || 'mindmap'}.png`;
                    a.click();
                } else if (type === 'svg') {
                    const pngUrl = canvas.toDataURL('image/png');
                    const svgString = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                        <image href="${pngUrl}" x="0" y="0" width="${width}" height="${height}" />
                    </svg>`;
                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${title || 'mindmap'}.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }
        } catch (error) {
            toast.error(t('mindmap.exportFailed') + ': ' + error.message);
        }
    };

    const handleCenter = () => {
        if (mindRef.current) {
            mindRef.current.toCenter();
        }
    };

    const handleAddChild = () => {
        if (isReadOnly) {
            toast.error(t('mindmap.viewOnlyPermission'));
            return;
        }
        if (mindRef.current) {
            if (!mindRef.current.currentNode) {
                toast.error(t('mindmap.selectNodeFirst'));
                return;
            }
            mindRef.current.addChild();
        }
    };

    const handleAddSibling = () => {
        if (isReadOnly) {
            toast.error(t('mindmap.viewOnlyPermission'));
            return;
        }
        if (mindRef.current) {
            const currentNode = mindRef.current.currentNode;
            if (!currentNode) {
                toast.error(t('mindmap.selectNodeFirst'));
                return;
            }
            if (currentNode.root) {
                toast.error(t('mindmap.cannotAddSiblingToRoot'));
                return;
            }
            mindRef.current.insertSibling('after');
        }
    };

    const handleDeleteNode = () => {
        if (isReadOnly) {
            toast.error(t('mindmap.viewOnlyPermission'));
            return;
        }
        if (mindRef.current) {
            if (!mindRef.current.currentNode) {
                toast.error(t('mindmap.selectNodeFirst'));
                return;
            }
            mindRef.current.removeNodes([mindRef.current.currentNode]);
            setSelectedNode(null);
            activeNodeRef.current = null;
            setIsInspectorOpen(false);
        }
    };

    const handleUndo = () => {
        if (mindRef.current) mindRef.current.undo();
    };

    const handleRedo = () => {
        if (mindRef.current) mindRef.current.redo();
    };

    const handleOpenInspector = () => {
        if (mindRef.current && mindRef.current.currentNode) {
            const node = mindRef.current.currentNode;
            const nodeData = node.nodeObj || node;
            if (nodeData && nodeData.id) {
                setSelectedNode({ ...nodeData });
                activeNodeRef.current = nodeData;
                setIsInspectorOpen(true);
            }
        } else {
            toast.error(t('mindmap.selectNodeFirst'));
        }
    };

    return (
        <div className="mindmap-editor-container">
            <div className="mindmap-toolbar">
                <div className="toolbar-left">
                    <button className="back-btn" onClick={handleBack} title="Back">
                        <span>←</span>
                        <span className="btn-text">Back</span>
                    </button>
                    <div className="mindmap-title-wrapper">
                        {isEditingTitle && !isViaShareLink && isOwner ? (
                            <input
                                type="text"
                                className="mindmap-title-input"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setIsDirty(true);
                                }}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingTitle(false);
                                }}
                                autoFocus
                                onFocus={(e) => {
                                    const val = e.target.value;
                                    e.target.setSelectionRange(val.length, val.length);
                                }}
                                placeholder="Mindmap Title"
                            />
                        ) : (
                            <div
                                className="mindmap-title-display"
                                onClick={() => !isViaShareLink && isOwner && setIsEditingTitle(true)}
                                title={title}
                                style={{ cursor: (isViaShareLink || !isOwner) ? 'default' : 'pointer' }}
                            >
                                {title || 'Untitled Mindmap'}
                                {!isOwner && (
                                    <span style={{ 
                                        marginLeft: '8px', 
                                        fontSize: '11px', 
                                        color: '#999',
                                        fontWeight: 'normal'
                                    }}>
                                        {isReadOnly ? '(View Only)' : '(Can Edit)'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="editor-actions">
                    <button className="action-btn" onClick={() => setIsTutorialOpen(true)} title="Tutorial">
                        <span>❓</span>
                        <span className="action-btn-text">Tutorial</span>
                    </button>
                    {!isReadOnly && (
                        <>
                            <button className="action-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
                                <span>↩️</span>
                                <span className="action-btn-text">Undo</span>
                            </button>
                            <button className="action-btn" onClick={handleRedo} title="Redo (Ctrl+Y)">
                                <span>↪️</span>
                                <span className="action-btn-text">Redo</span>
                            </button>
                            <button className="action-btn" onClick={() => setIsThemeOpen(!isThemeOpen)} title="Customize Theme">
                                <span>🎨</span>
                                <span className="action-btn-text">Theme</span>
                            </button>
                            <button className="action-btn" onClick={handleAddChild} title="Add Child Node (Tab)">
                                <span>➕</span>
                                <span className="action-btn-text">Child</span>
                            </button>
                            <button className="action-btn" onClick={handleAddSibling} title="Add Sibling Node (Enter)">
                                <span>➕</span>
                                <span className="action-btn-text">Sibling</span>
                            </button>
                            <button className="action-btn" onClick={handleDeleteNode} title="Delete Node (Del)">
                                <span>🗑️</span>
                                <span className="action-btn-text">Delete</span>
                            </button>
                            <button className="save-btn" onClick={handleSave} title="Save">
                                <span>💾</span>
                                <span className="btn-text">Save</span>
                            </button>
                        </>
                    )}
                    <button className="action-btn" onClick={handleOpenInspector} title="Open Node Properties">
                        <span>⚙️</span>
                        <span className="action-btn-text">Properties</span>
                    </button>
                    <button className="action-btn" onClick={handleCenter} title="Center Map">
                        <span>🎯</span>
                        <span className="action-btn-text">Center</span>
                    </button>
                    <div className="dropdown">
                        <button className="action-btn" title="Export">
                            <span>⬇️</span>
                            <span className="action-btn-text">Export</span>
                        </button>
                        <div className="dropdown-content">
                            <button onClick={() => handleExport('json')}>JSON</button>
                            <button onClick={() => handleExport('png')}>PNG</button>
                            <button onClick={() => handleExport('svg')}>SVG</button>
                        </div>
                    </div>
                    {isOwner && (
                        <button className="action-btn share-btn" onClick={handleOpenShare} title="Share Mindmap">
                            <span>🔗</span>
                            <span className="action-btn-text">Share</span>
                        </button>
                    )}
                    {!isOwner && (
                        <>
                            {isReadOnly ? (
                                <span className="read-only-badge" style={{ 
                                    padding: '8px 12px', 
                                    background: '#fff3cd', 
                                    color: '#856404', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    👁️ {t('mindmap.viewOnly') || 'View Only'}
                                </span>
                            ) : (
                                <span className="can-edit-badge" style={{ 
                                    padding: '8px 12px', 
                                    background: '#d4edda', 
                                    color: '#155724', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    ✏️ {t('mindmap.canEdit') || 'Can Edit'}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="toolbar-right">
                    {user?.profile?.avatar || user?.avatar ? (
                        <img 
                            src={user?.profile?.avatar || user?.avatar} 
                            alt={user?.name || 'User'} 
                            className="user-avatar-header"
                            title={user?.name || user?.email || 'User'}
                            onClick={handleBack}
                        />
                    ) : (
                        <div 
                            className="user-avatar-placeholder"
                            title={user?.name || user?.email || 'User'}
                            onClick={handleBack}
                        >
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            <div className="editor-body">
                {showTips && (
                        <div className="mindmap-instructions">
                        <small>💡 {t('mindmap.tips') || 'Tips: Change theme for all nodes. Select node then click "Properties" to edit. Right click and drag to move the map.'}</small>
                        <button 
                            className="tips-close-btn" 
                            onClick={() => setShowTips(false)}
                            title="Hide tips"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div
                    id="mindmap-canvas"
                    ref={containerRef}
                    className="mindmap-canvas"
                ></div>

                {/* Tutorial Modal */}
                {isTutorialOpen && (
                    <div className="modal-backdrop" onClick={() => setIsTutorialOpen(false)}>
                        <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>
                                {t('mindmap.tutorial.title') || 'Mindmap Shortcuts'}
                                <button onClick={() => setIsTutorialOpen(false)}>&times;</button>
                            </h3>
                            <div className="tutorial-content">
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.createChild') || 'Create child node'}</span>
                                    <span className="shortcut-key">Tab</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.createSibling') || 'Create sibling node'}</span>
                                    <span className="shortcut-key">Enter</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.deleteNode') || 'Delete node'}</span>
                                    <span className="shortcut-key">Del / Backspace</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.centerMap') || 'Center map'}</span>
                                    <span className="shortcut-key">F1 / Ctrl + Enter</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.editNode') || 'Edit node'}</span>
                                    <span className="shortcut-key">Dbl Click / F2</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.zoom') || 'Zoom In/Out'}</span>
                                    <span className="shortcut-key">Ctrl + Scroll</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.zoomIn') || 'Zoom in mind map'}</span>
                                    <span className="shortcut-key">Ctrl + +</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.zoomOut') || 'Zoom out mind map'}</span>
                                    <span className="shortcut-key">Ctrl + -</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.resetZoom') || 'Reset zoom'}</span>
                                    <span className="shortcut-key">Ctrl + 0</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.collapseAll') || 'Collapse all nodes'}</span>
                                    <span className="shortcut-key">Ctrl + K, Ctrl + 0</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.expandAll') || 'Expand all nodes'}</span>
                                    <span className="shortcut-key">Ctrl + K, Ctrl + =</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.expandToLevel') || 'Expand to level N'}</span>
                                    <span className="shortcut-key">Ctrl + K, Ctrl + 1-9</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.moveNode') || 'Move Node'}</span>
                                    <span className="shortcut-key">{t('mindmap.tutorial.drag') || 'Drag'}</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.moveMap') || 'Move Map'}</span>
                                    <span className="shortcut-key">{t('mindmap.tutorial.rightClickDrag') || 'Right Click + Drag'}</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('mindmap.tutorial.openContextMenu') || 'Open Context Menu'}</span>
                                    <span className="shortcut-key">{t('mindmap.tutorial.rightClick') || 'Right Click'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Theme Editor Panel */}
                {isThemeOpen && (
                    <div className="theme-editor" onMouseDown={(e) => e.stopPropagation()}>
                        <h3>Theme Customization
                            <button onClick={() => setIsThemeOpen(false)}>&times;</button>
                        </h3>
                        <div className="theme-scroll-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="theme-section">
                                <h4>Root Node</h4>
                                <div className="theme-group">
                                    <label>Text Color</label>
                                    <input type="color" value={theme['--root-color']} onChange={(e) => handleUpdateTheme('--root-color', e.target.value)} />
                                </div>
                                <div className="theme-group">
                                    <label>Background</label>
                                    <input type="color" value={theme['--root-bgcolor']} onChange={(e) => handleUpdateTheme('--root-bgcolor', e.target.value)} />
                                </div>
                                <div className="theme-group">
                                    <label>Radius</label>
                                    <input type="number" value={parseInt(theme['--root-radius'])} onChange={(e) => handleUpdateTheme('--root-radius', e.target.value + 'px')} />
                                </div>
                            </div>

                            <div className="theme-section">
                                <h4>Main Nodes</h4>
                                <div className="theme-group">
                                    <label>Text Color</label>
                                    <input type="color" value={theme['--main-color']} onChange={(e) => handleUpdateTheme('--main-color', e.target.value)} />
                                </div>
                                <div className="theme-group">
                                    <label>Background</label>
                                    <input type="color" value={theme['--main-bgcolor']} onChange={(e) => handleUpdateTheme('--main-bgcolor', e.target.value)} />
                                </div>
                                <div className="theme-group">
                                    <label>Radius</label>
                                    <input type="number" value={parseInt(theme['--main-radius'])} onChange={(e) => handleUpdateTheme('--main-radius', e.target.value + 'px')} />
                                </div>
                            </div>

                            <div className="theme-section">
                                <h4>Sub Nodes</h4>
                                <div className="theme-group">
                                    <label>Text Color</label>
                                    <input type="color" value={theme['--color']} onChange={(e) => handleUpdateTheme('--color', e.target.value)} />
                                </div>
                                <div className="theme-group">
                                    <label>Background</label>
                                    <input type="color" value={theme['--bgcolor']} onChange={(e) => handleUpdateTheme('--bgcolor', e.target.value)} />
                                </div>
                            </div>

                            <div className="theme-section">
                                <h4>Layout</h4>
                                <div className="theme-group">
                                    <label>Main Gap</label>
                                    <input type="number" value={parseInt(theme['--main-gap-x'])} onChange={(e) => handleUpdateGap('main', e.target.value + 'px')} />
                                </div>
                                <div className="theme-group">
                                    <label>Node Gap</label>
                                    <input type="number" value={parseInt(theme['--node-gap-x'])} onChange={(e) => handleUpdateGap('node', e.target.value + 'px')} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(selectedNode && isInspectorOpen) && (
                    <div
                        className="node-inspector"
                        key={selectedNode.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>
                            Node Properties
                            <button
                                onClick={() => setIsInspectorOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#999', padding: '0 0.5rem' }}
                                title="Close Inspector"
                            >
                                &times;
                            </button>
                        </h3>
                        <div className="inspector-scroll-container">
                            <div className="inspector-group">
                                <label>Topic (HTML supported)</label>
                                <textarea
                                    rows="3"
                                    value={selectedNode.topic || ''}
                                    onChange={handleTopicChange}
                                    onBlur={handleTopicBlur}
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.5rem', 
                                        borderRadius: '6px', 
                                        border: '1px solid #ddd',
                                        backgroundColor: isReadOnly ? '#f5f5f5' : 'white',
                                        cursor: isReadOnly ? 'not-allowed' : 'text'
                                    }}
                                />
                                {!isReadOnly && (
                                    <button onClick={handleInsertImage} style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                        🖼️ Insert Image
                                    </button>
                                )}
                            </div>
                            {selectedNode.image && (
                                <div className="inspector-group">
                                    <label>Image</label>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        <img src={selectedNode.image.url} alt="Node" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => {
                                                    updateNodeData('image', null, selectedNode.id);
                                                    setSelectedNode(prev => {
                                                        const newState = { ...prev };
                                                        delete newState.image;
                                                        return newState;
                                                    });
                                                }}
                                                style={{ color: '#ff4d4f', border: '1px solid #ff4d4f', background: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {!isReadOnly && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>Width (px)</label>
                                                <input
                                                    type="number"
                                                    value={selectedNode.image.width}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const newImage = { ...selectedNode.image, width: val };
                                                        setSelectedNode(prev => ({ ...prev, image: newImage }));
                                                        updateNodeData('image', newImage, selectedNode.id);
                                                    }}
                                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>Height (px)</label>
                                                <input
                                                    type="number"
                                                    value={selectedNode.image.height}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const newImage = { ...selectedNode.image, height: val };
                                                        setSelectedNode(prev => ({ ...prev, image: newImage }));
                                                        updateNodeData('image', newImage, selectedNode.id);
                                                    }}
                                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isReadOnly && (
                                <>
                                    <div className="inspector-group">
                                        <label>Style</label>
                                        <div className="style-controls">
                                            <input
                                                type="color"
                                                title="Text Color"
                                                value={selectedNode.style?.color || '#000000'}
                                                onChange={(e) => updateNodeStyle('color', e.target.value, selectedNode.id)}
                                            />
                                            <input
                                                type="color"
                                                title="Background Color"
                                                value={selectedNode.style?.background || '#ffffff'}
                                                onChange={(e) => updateNodeStyle('background', e.target.value, selectedNode.id)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Size"
                                                min="12" max="60"
                                                style={{ width: '50px' }}
                                                value={parseInt(selectedNode.style?.fontSize) || 15}
                                                onChange={(e) => updateNodeStyle('fontSize', e.target.value + 'px', selectedNode.id)}
                                            />
                                            <button
                                                className={`style-btn ${selectedNode.style?.fontWeight === 'bold' ? 'active' : ''}`}
                                                onClick={() => updateNodeStyle('fontWeight', selectedNode.style?.fontWeight === 'bold' ? 'normal' : 'bold', selectedNode.id)}
                                                title="Bold"
                                            >
                                                <span style={{ fontWeight: 'bold' }}>B</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="inspector-group">
                                        <label>Tags (comma separated)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Important, Todo"
                                            value={selectedNode.tags ? selectedNode.tags.join(', ') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedNode(prev => ({ ...prev, tags: val.split(',').map(t => t.trim()) }));
                                            }}
                                            onBlur={(e) => updateNodeTags(e.target.value.split(',').filter(t => t.trim()), selectedNode.id)}
                                        />
                                    </div>
                                    <div className="inspector-group">
                                        <label>Icons (comma separated)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 😀, 🚀"
                                            value={selectedNode.icons ? selectedNode.icons.join(', ') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedNode(prev => ({ ...prev, icons: val.split(',').map(t => t.trim()) }));
                                            }}
                                            onBlur={(e) => updateNodeIcons(e.target.value.split(',').filter(t => t.trim()), selectedNode.id)}
                                        />
                                    </div>
                                    <div className="inspector-group">
                                        <label>Hyperlink</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com"
                                            value={selectedNode.hyperLink || ''}
                                            onChange={(e) => setSelectedNode(prev => ({ ...prev, hyperLink: e.target.value }))}
                                            onBlur={(e) => handleUpdateHyperlink(e.target.value, selectedNode.id)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Share Modal - Google Drive Style */}
            {isShareOpen && (
                <div className="modal-backdrop" onClick={() => setIsShareOpen(false)}>
                    <div className="share-modal google-style" onClick={(e) => e.stopPropagation()}>
                        <div className="share-modal-header">
                            <h3>{t('mindmap.share.title')} "{title || 'Untitled Mindmap'}"</h3>
                            <button className="close-btn" onClick={() => setIsShareOpen(false)}>&times;</button>
                        </div>
                        
                        <div className="share-modal-body">
                            {/* Share by Email Input */}
                            <div className="share-input-wrapper">
                                <input
                                    type="email"
                                    className="share-email-input"
                                    placeholder={t('mindmap.share.addPeople')}
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                                />
                                {shareEmail.trim() && (
                                    <div className="share-input-actions">
                                        <select 
                                            value={sharePermission} 
                                            onChange={(e) => setSharePermission(e.target.value)}
                                            className="share-permission-select"
                                        >
                                            <option value="view">{t('mindmap.share.viewer')}</option>
                                            <option value="edit">{t('mindmap.share.editor')}</option>
                                        </select>
                                        <button 
                                            className="share-add-btn"
                                            onClick={handleShare}
                                            disabled={shareLoading || !shareEmail.trim()}
                                        >
                                            {shareLoading ? '...' : t('mindmap.share.shareButton')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* People with Access Section */}
                            <div className="share-section">
                                <label className="share-section-title">
                                    {t('mindmap.share.peopleWithAccess')} ({1 + (shareInfo.shared_with?.length || 0)})
                                </label>
                                <div className="shared-users-list">
                                    {/* Owner */}
                                    <div className="shared-user-item owner">
                                        <div className="shared-user-info">
                                            <div className="shared-user-avatar" style={{
                                                backgroundImage: user?.profile?.avatar ? `url(${user.profile.avatar})` : undefined,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}>
                                                {!user?.profile?.avatar && (user?.name?.charAt(0).toUpperCase() || 'U')}
                                            </div>
                                            <div className="shared-user-details">
                                                <span className="shared-user-name">{user?.name || 'You'} ({t('mindmap.share.you')})</span>
                                                <span className="shared-user-email">{user?.email}</span>
                                            </div>
                                        </div>
                                        <span className="owner-badge">{t('mindmap.share.owner')}</span>
                                    </div>

                                    {/* Shared Users */}
                                    {shareInfo.shared_with && shareInfo.shared_with.map((share, index) => (
                                        <div key={index} className="shared-user-item">
                                            <div className="shared-user-info">
                                                <div className="shared-user-avatar">
                                                    {share.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="shared-user-details">
                                                    <span className="shared-user-name">{share.name || share.email}</span>
                                                    <span className="shared-user-email">{share.email}</span>
                                                </div>
                                            </div>
                                            <div className="shared-user-actions">
                                                <select
                                                    value={share.permission || 'view'}
                                                    onChange={(e) => handleUpdateUserPermission(share.email, e.target.value)}
                                                    className="permission-dropdown"
                                                >
                                                    <option value="view">{t('mindmap.share.viewer')}</option>
                                                    <option value="edit">{t('mindmap.share.editor')}</option>
                                                </select>
                                                <button 
                                                    className="remove-share-btn"
                                                    onClick={() => handleUnshare(share.user_id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* General Access Section */}
                            <div className="share-section">
                                <label className="share-section-title">{t('mindmap.share.generalAccess')}</label>
                                <div className="general-access-box">
                                    <div className="access-icon">
                                        {shareInfo.is_public ? (
                                            <span className="icon-public">🌐</span>
                                        ) : (
                                            <span className="icon-restricted">🔒</span>
                                        )}
                                    </div>
                                    <div className="access-details">
                                        <select
                                            value={shareInfo.is_public ? 'public' : 'restricted'}
                                            onChange={(e) => handleTogglePublic(e.target.value === 'public', shareInfo.public_permission || 'view')}
                                            className="access-type-select"
                                        >
                                            <option value="restricted">{t('mindmap.share.restricted')}</option>
                                            <option value="public">{t('mindmap.share.anyoneWithLink')}</option>
                                        </select>
                                        <span className="access-description">
                                            {shareInfo.is_public 
                                                ? (shareInfo.public_permission === 'edit' 
                                                    ? t('mindmap.share.anyoneWithLinkEditDesc')
                                                    : t('mindmap.share.anyoneWithLinkDesc'))
                                                : t('mindmap.share.restrictedDesc')}
                                        </span>
                                    </div>
                                    {shareInfo.is_public && (
                                        <select
                                            value={shareInfo.public_permission || 'view'}
                                            onChange={(e) => handleUpdatePublicPermission(e.target.value)}
                                            className="permission-dropdown"
                                        >
                                            <option value="view">{t('mindmap.share.viewer')}</option>
                                            <option value="edit">{t('mindmap.share.editor')}</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="share-modal-footer">
                            {shareInfo.is_public && shareInfo.share_link && (
                                <button className="copy-link-btn" onClick={handleCopyLink}>
                                    🔗 {t('mindmap.share.copyLink')}
                                </button>
                            )}
                            <button className="share-done-btn" onClick={() => setIsShareOpen(false)}>
                                {t('mindmap.share.done')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindmapEditor;