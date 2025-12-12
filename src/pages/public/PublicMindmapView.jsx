import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Card, Typography, Button, Space, message, App } from 'antd';
import { ArrowLeftOutlined, LoginOutlined, SaveOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import MindElixir from 'mind-elixir';
import mindmapService from '../../api/mindmapService';
import useAuthStore from '../../store/authStore';
import '../mindmap/mind-elixir.css';
import '../mindmap/MindmapEditor.css';

const { Title } = Typography;

const PublicMindmapView = () => {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const { isAuthenticated, user } = useAuthStore();
  
  const mindmapRef = useRef(null);
  const containerRef = useRef(null);
  const mindElixirInstanceRef = useRef(null);
  const activeNodeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mindmapData, setMindmapData] = useState(null);
  const [error, setError] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (shareLink) {
      fetchPublicMindmap();
    }

    return () => {
      // Cleanup MindElixir instance
      if (mindElixirInstanceRef.current) {
        try {
          mindElixirInstanceRef.current.destroy?.();
        } catch (e) {
          console.error('Error destroying MindElixir:', e);
        }
      }
    };
  }, [shareLink]);

  // Auto-save every 30 seconds for public editable mindmaps
  useEffect(() => {
    if (!canEdit || !mindElixirInstanceRef.current || !hasChanges || !shareLink) return;

    const autoSaveInterval = setInterval(async () => {
      if (hasChanges && mindElixirInstanceRef.current && canEdit) {
        try {
          const data = mindElixirInstanceRef.current.getData();
          await mindmapService.updateByShareLink(shareLink, {
            data,
            updated_at: new Date()
          });
          setHasChanges(false);
          // Silent save - no toast notification
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 10000); // 10 seconds

    return () => clearInterval(autoSaveInterval);
  }, [shareLink, canEdit, hasChanges]);

  const fetchPublicMindmap = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await mindmapService.getByShareLink(shareLink);
      const data = response.data || response;
      
      if (data && data._id) {
        setMindmapData(data);
        setTitle(data.title || 'Untitled Mindmap');
        
        // Check if public permission allows editing
        const publicPermission = data.public_permission || 'view';
        const allowEdit = publicPermission === 'edit';
        setCanEdit(allowEdit);
        
        // Initialize MindElixir after data is loaded
        setTimeout(() => {
          initializeMindmap(data, allowEdit);
        }, 100);
      } else {
        throw new Error('Mindmap not found or not public');
      }
    } catch (error) {
      console.error('Error fetching public mindmap:', error);
      const errorMessage = typeof error === 'string' 
        ? error 
        : (error?.response?.data?.message || error?.message || 'Failed to load mindmap');
      setError(errorMessage);
      messageApi.error(errorMessage || 'Mindmap not found or not available');
    } finally {
      setLoading(false);
    }
  };

  const initializeMindmap = (data, allowEdit = false) => {
    if (!containerRef.current || !data) return;

    try {
      // Destroy existing instance if any
      if (mindElixirInstanceRef.current) {
        try {
          mindElixirInstanceRef.current.destroy?.();
        } catch (e) {
          console.error('Error destroying existing instance:', e);
        }
      }

      // Clear container
      containerRef.current.innerHTML = '';

      // Prepare data for MindElixir
      let mapData = data.data;
      if (!mapData || !mapData.nodeData) {
        mapData = MindElixir.new(data.title || 'Main Topic');
      } else {
        if (!mapData.arrows) mapData.arrows = [];
        if (!mapData.summaries) mapData.summaries = [];
        // Ensure direction is set to SIDE (balanced) if not set
        if (mapData.direction === undefined) {
          mapData.direction = MindElixir.SIDE;
        }
      }

      // Initialize MindElixir with appropriate permissions
      const mind = new MindElixir({
        el: containerRef.current,
        direction: data.data?.direction !== undefined ? data.data.direction : MindElixir.SIDE, // Default to SIDE (balanced)
        locale: 'en',
        draggable: true,  // Allow panning
        contextMenu: allowEdit,
        toolBar: allowEdit,
        nodeMenu: allowEdit,
        keypress: allowEdit,
      });

      // Add event listeners
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
        if (allowEdit) {
          // Track changes for save button
          if (operation && ['addChild', 'insertSibling', 'removeNodes', 'finishEdit', 'beginEdit'].includes(operation.name)) {
            setHasChanges(true);
          }
          
          // Auto-open inspector for new nodes
          if (['addChild', 'insertSibling', 'finishEdit', 'beginEdit'].includes(operation.name)) {
            setTimeout(() => {
              if (mind.currentNode) {
                setSelectedNode(mind.currentNode.nodeObj || mind.currentNode);
                activeNodeRef.current = mind.currentNode.nodeObj || mind.currentNode;
                setIsInspectorOpen(true);
              }
            }, 100);
          }
        }
      });

      // Init with data
      mind.init(mapData);
      
      // Apply theme if exists
      if (data.data?.theme) {
        mind.changeTheme(data.data.theme);
      }

      // Double click to open inspector
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

      mindElixirInstanceRef.current = mind;
      
      // Center after init
      setTimeout(() => {
        if (mindElixirInstanceRef.current) {
          mindElixirInstanceRef.current.toCenter();
        }
      }, 300);
    } catch (error) {
      console.error('Error initializing mindmap:', error);
      messageApi.error('Failed to render mindmap');
    }
  };

  // Save mindmap via public link (for edit permission)
  const handleSave = useCallback(async () => {
    if (!mindElixirInstanceRef.current || !mindmapData || !canEdit) return;
    
    try {
      setSaving(true);
      const currentData = mindElixirInstanceRef.current.getData();
      
      await mindmapService.updateByShareLink(shareLink, {
        data: {
          ...currentData,
          direction: mindElixirInstanceRef.current.direction,
          theme: mindmapData.data?.theme
        }
      });
      
      setHasChanges(false);
      toast.success(t('mindmap.saveSuccess') || 'Saved successfully!');
    } catch (error) {
      console.error('Error saving mindmap:', error);
      toast.error(t('mindmap.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [mindmapData, canEdit, shareLink, t]);

  const handleBack = () => {
    if (isAuthenticated) {
      // Navigate to user's mindmap list
      const rolePath = user?.role === 'teacher' ? 'teacher' : 'student';
      navigate(`/${rolePath}/mindmaps`);
    } else {
      // Navigate to login
      navigate('/login');
    }
  };

  const handleCenter = () => {
    if (mindElixirInstanceRef.current) {
      mindElixirInstanceRef.current.toCenter();
    }
  };

  const handleAddChild = () => {
    if (!canEdit) {
      toast.error(t('mindmap.viewOnlyPermission') || 'You only have view permission');
      return;
    }
    if (mindElixirInstanceRef.current) {
      if (!mindElixirInstanceRef.current.currentNode) {
        toast.error(t('mindmap.selectNodeFirst') || 'Please select a node first');
        return;
      }
      mindElixirInstanceRef.current.addChild();
    }
  };

  const handleAddSibling = () => {
    if (!canEdit) {
      toast.error(t('mindmap.viewOnlyPermission') || 'You only have view permission');
      return;
    }
    if (mindElixirInstanceRef.current) {
      const currentNode = mindElixirInstanceRef.current.currentNode;
      if (!currentNode) {
        toast.error(t('mindmap.selectNodeFirst') || 'Please select a node first');
        return;
      }
      if (currentNode.root) {
        toast.error(t('mindmap.cannotAddSiblingToRoot') || 'Cannot add sibling to root node');
        return;
      }
      mindElixirInstanceRef.current.insertSibling('after');
    }
  };

  const handleDeleteNode = () => {
    if (!canEdit) {
      toast.error(t('mindmap.viewOnlyPermission') || 'You only have view permission');
      return;
    }
    if (mindElixirInstanceRef.current) {
      if (!mindElixirInstanceRef.current.currentNode) {
        toast.error(t('mindmap.selectNodeFirst') || 'Please select a node first');
        return;
      }
      mindElixirInstanceRef.current.removeNodes([mindElixirInstanceRef.current.currentNode]);
      setSelectedNode(null);
      activeNodeRef.current = null;
      setIsInspectorOpen(false);
    }
  };

  const handleUndo = () => {
    if (mindElixirInstanceRef.current) {
      mindElixirInstanceRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (mindElixirInstanceRef.current) {
      mindElixirInstanceRef.current.redo();
    }
  };

  const handleOpenInspector = () => {
    if (mindElixirInstanceRef.current && mindElixirInstanceRef.current.currentNode) {
      const node = mindElixirInstanceRef.current.currentNode;
      const nodeData = node.nodeObj || node;
      if (nodeData && nodeData.id) {
        setSelectedNode({ ...nodeData });
        activeNodeRef.current = nodeData;
        setIsInspectorOpen(true);
      }
    } else {
      toast.error(t('mindmap.selectNodeFirst') || 'Please select a node first');
    }
  };

  const handleExport = async (type) => {
    if (!mindElixirInstanceRef.current) return;

    try {
      if (type === 'json') {
        const data = mindElixirInstanceRef.current.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'mindmap'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === 'png' || type === 'svg') {
        const mapCanvas = containerRef.current?.querySelector('.map-canvas');
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

        const nodes = mapCanvas.querySelectorAll('.node');
        const parentRect = mapCanvas.getBoundingClientRect();

        nodes.forEach(node => {
          const rect = node.getBoundingClientRect();
          updateBounds(rect, parentRect);
        });

        const padding = 20;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const width = maxX - minX;
        const height = maxY - minY;

        const canvas = await html2canvas(mapCanvas, {
          backgroundColor: '#ffffff',
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
      toast.error(t('mindmap.exportFailed') || 'Export failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 16
      }}>
        <Spin size="large" />
        <div>Loading mindmap...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: 24
      }}>
        <Card style={{ maxWidth: 500, textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3} type="danger">
                {t('publicMindmap.notAvailable') || 'Mindmap Not Available'}
              </Title>
              <div style={{ color: '#666', marginTop: 8 }}>
                {error}
              </div>
            </div>
            <Space>
              <Button 
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
              >
                {t('publicMindmap.login') || 'Login'}
              </Button>
              <Button onClick={handleBack}>
                {t('common.back') || 'Back'}
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div className="mindmap-editor-container">
      <div className="mindmap-toolbar">
        <div className="toolbar-left">
          <button className="back-btn" onClick={handleBack} title="Back">
            <span>←</span>
            <span className="btn-text">Back</span>
          </button>
          <div className="mindmap-title-wrapper">
            <div className="mindmap-title-display" style={{ cursor: 'default' }}>
              {title || 'Untitled Mindmap'}
            </div>
          </div>
        </div>
        <div className="editor-actions">
          <button className="action-btn" onClick={() => setIsTutorialOpen(true)} title="Tutorial">
            <span>❓</span>
            <span className="action-btn-text">Tutorial</span>
          </button>
          {canEdit && (
            <>
              <button className="action-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
                <span>↩️</span>
                <span className="action-btn-text">Undo</span>
              </button>
              <button className="action-btn" onClick={handleRedo} title="Redo (Ctrl+Y)">
                <span>↪️</span>
                <span className="action-btn-text">Redo</span>
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
              <button className="save-btn" onClick={handleSave} title="Save" disabled={!hasChanges}>
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
          {canEdit ? (
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
              ✏️ {t('publicMindmap.canEdit') || '(Can Edit)'}
            </span>
          ) : (
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
              👁️ {t('publicMindmap.readOnly') || '(Read-only)'}
            </span>
          )}
        </div>
        <div className="toolbar-right">
          {!isAuthenticated && !canEdit && (
            <Button 
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
              size="small"
            >
              {t('publicMindmap.loginToEdit') || 'Login to Edit'}
            </Button>
          )}
        </div>
      </div>

      <div className="editor-body">
        {showTips && canEdit && (
          <div className="mindmap-instructions">
            <small>💡 {t('mindmap.tips') || 'Tips: Select node then click "Properties" to edit. Right click and drag to move the map.'}</small>
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

        {/* Inspector Panel - Simplified version for public view */}
        {selectedNode && isInspectorOpen && (
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
                <label>Topic</label>
                <div style={{ 
                  padding: '8px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  minHeight: '40px',
                  wordBreak: 'break-word'
                }}>
                  {selectedNode.topic || 'No topic'}
                </div>
              </div>
              {selectedNode.image && (
                <div className="inspector-group">
                  <label>Image</label>
                  <img 
                    src={selectedNode.image.url} 
                    alt="Node" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }} 
                  />
                </div>
              )}
              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div className="inspector-group">
                  <label>Tags</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedNode.tags.map((tag, idx) => (
                      <span key={idx} style={{ 
                        padding: '2px 8px', 
                        background: '#e6f7ff', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedNode.hyperLink && (
                <div className="inspector-group">
                  <label>Hyperlink</label>
                  <a 
                    href={selectedNode.hyperLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff', wordBreak: 'break-all' }}
                  >
                    {selectedNode.hyperLink}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicMindmapView;
