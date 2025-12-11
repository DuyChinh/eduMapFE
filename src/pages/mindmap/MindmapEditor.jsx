import { useEffect, useRef, useState, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate, useBlocker } from 'react-router-dom'; // Added useBlocker
import { useTranslation } from 'react-i18next';
import MindElixir from 'mind-elixir';
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
    const [isDirty, setIsDirty] = useState(false); // Track unsaved changes

    // Handle browser tab close / refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Handle React Router navigation (Back button, Sidebar, etc.)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            const confirmLeave = window.confirm(t('mindmap.unsavedChanges'));
            if (confirmLeave) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        }
    }, [blocker]);

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

    const initMindmap = (data) => {
        if (!containerRef.current) return;

        if (mindRef.current) {
            containerRef.current.innerHTML = '';
            mindRef.current = null;
        }

        const options = {
            el: containerRef.current,
            direction: MindElixir.LEFT,
            draggable: true,
            contextMenu: true,
            toolBar: true,
            nodeMenu: true,
            keypress: true,
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
        if (!mindRef.current) return;

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
            const response = await mindmapService.getOne(id);
            if (response.success) {
                setTitle(response.data.title);

                let mapData = response.data.data;
                if (!mapData || !mapData.nodeData) {
                    mapData = MindElixir.new('Main Topic');
                } else {
                    if (!mapData.arrows) mapData.arrows = [];
                    if (!mapData.summaries) mapData.summaries = [];
                }

                initMindmap(mapData);
            }
        } catch (error) {
            console.error('Failed to fetch mindmap:', error);
        }
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
            alert('Please select a node first');
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
                alert('Upload failed: No URL returned');
            }
        } catch (error) {
            alert('Failed to upload image: ' + error.message);
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
        if (!mindRef.current) return;

        try {
            const data = mindRef.current.getData();
            await mindmapService.update(id, {
                title,
                data,
                updated_at: new Date()
            });
            setIsDirty(false); // Reset dirty state on save
            alert('Mindmap saved successfully!');
        } catch (error) {
            alert('Failed to save mindmap: ' + error.message);
        }
    };

    const handleBack = () => {
        const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
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
            alert('Export failed. Please ensure html2canvas is installed and try again. Error: ' + error.message);
        }
    };

    const handleCenter = () => {
        if (mindRef.current) {
            mindRef.current.toCenter();
        }
    };

    const handleAddChild = () => {
        if (mindRef.current) {
            if (!mindRef.current.currentNode) {
                alert('Please select a node first');
                return;
            }
            mindRef.current.addChild();
        }
    };

    const handleAddSibling = () => {
        if (mindRef.current) {
            const currentNode = mindRef.current.currentNode;
            if (!currentNode) {
                alert('Please select a node first');
                return;
            }
            if (currentNode.root) {
                alert('Cannot add sibling to root node');
                return;
            }
            mindRef.current.insertSibling('after');
        }
    };

    const handleDeleteNode = () => {
        if (mindRef.current) {
            if (!mindRef.current.currentNode) {
                alert('Please select a node first');
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
            alert('Please select a node on the map first.');
        }
    };

    return (
        <div className="mindmap-editor-container">
            <div className="mindmap-toolbar">
                <div className="toolbar-left">
                    <button className="back-btn" onClick={handleBack}>
                        &larr; Back
                    </button>
                    <div className="mindmap-title-wrapper">
                        {isEditingTitle ? (
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
                                onClick={() => setIsEditingTitle(true)}
                                title={title}
                            >
                                {title || 'Untitled Mindmap'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="editor-actions">
                    <button className="action-btn" onClick={() => setIsTutorialOpen(true)} title="Tutorial">
                        ❓ Tutorial
                    </button>
                    <button className="action-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
                        ↩️ Undo
                    </button>
                    <button className="action-btn" onClick={handleRedo} title="Redo (Ctrl+Y)">
                        ↪️ Redo
                    </button>
                    <button className="action-btn" onClick={() => setIsThemeOpen(!isThemeOpen)} title="Customize Theme">
                        🎨 Theme
                    </button>
                    <button className="action-btn" onClick={handleAddChild} title="Add Child Node (Tab)">
                        ➕ Child
                    </button>
                    <button className="action-btn" onClick={handleAddSibling} title="Add Sibling Node (Enter)">
                        ➕ Sibling
                    </button>
                    <button className="action-btn" onClick={handleDeleteNode} title="Delete Node (Del)">
                        🗑️ Delete
                    </button>
                    <button className="action-btn" onClick={handleOpenInspector} title="Open Node Properties">
                        ⚙️ Properties
                    </button>
                    <button className="action-btn" onClick={handleCenter} title="Center Map">
                        🎯 Center
                    </button>
                    <div className="dropdown">
                        <button className="action-btn" title="Export">
                            ⬇️ Export
                        </button>
                        <div className="dropdown-content">
                            <button onClick={() => handleExport('json')}>JSON</button>
                            <button onClick={() => handleExport('png')}>PNG</button>
                            <button onClick={() => handleExport('svg')}>SVG</button>
                        </div>
                    </div>
                    <button className="save-btn" onClick={handleSave}>
                        💾 Save
                    </button>
                </div >
            </div >

            <div className="editor-body">
                <div className="mindmap-instructions">
                    <small>💡 Tips: Change theme for all nodes. Select node then click &quot;Properties&quot; to edit.</small>
                </div>
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
                                Mindmap Shortcuts
                                <button onClick={() => setIsTutorialOpen(false)}>&times;</button>
                            </h3>
                            <div className="tutorial-content">
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Create child node</span>
                                    <span className="shortcut-key">Tab</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Create sibling node</span>
                                    <span className="shortcut-key">Enter</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Delete node</span>
                                    <span className="shortcut-key">Del / Backspace</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Center map</span>
                                    <span className="shortcut-key">F1 / Ctrl + Enter</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Edit node</span>
                                    <span className="shortcut-key">Dbl Click / F2</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Zoom In/Out</span>
                                    <span className="shortcut-key">Ctrl + Scroll</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Move Node</span>
                                    <span className="shortcut-key">Drag</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">Open Context Menu</span>
                                    <span className="shortcut-key">Right Click</span>
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
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                                <button onClick={handleInsertImage} style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                    🖼️ Insert Image
                                </button>
                            </div>
                            {selectedNode.image && (
                                <div className="inspector-group">
                                    <label>Image</label>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        <img src={selectedNode.image.url} alt="Node" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
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
                                    </div>
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
                                </div>
                            )}
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
        </div>
    );
};

export default MindmapEditor;