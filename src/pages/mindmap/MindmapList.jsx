import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import MindElixir from 'mind-elixir';
import '../mindmap/mind-elixir.css';
import mindmapService from '../../api/mindmapService';
import './MindmapList.css';
import useAuthStore from '../../store/authStore';

// Thumbnail component for mindmap preview
const MindmapThumbnail = ({ data }) => {
    const containerRef = useRef(null);
    const instanceRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !data) return;

        try {
            // Clean up previous instance
            if (instanceRef.current) {
                try {
                    instanceRef.current.destroy?.();
                } catch (e) {
                    console.error('Error destroying thumbnail instance:', e);
                }
            }

            containerRef.current.innerHTML = '';

            let mapData = data;
            if (!mapData || !mapData.nodeData) {
                mapData = MindElixir.new('Main Topic');
            } else {
                if (!mapData.arrows) mapData.arrows = [];
                if (!mapData.summaries) mapData.summaries = [];
            }

            const mind = new MindElixir({
                el: containerRef.current,
                direction: mapData.direction !== undefined ? mapData.direction : MindElixir.SIDE,
                locale: 'en',
                draggable: false,
                contextMenu: false,
                toolBar: false,
                nodeMenu: false,
                keypress: false,
                readonly: true,
            });

            mind.init(mapData);
            
            if (mapData.theme) {
                mind.changeTheme(mapData.theme);
            }

            instanceRef.current = mind;
            
            // Center and scale for thumbnail
            setTimeout(() => {
                if (instanceRef.current) {
                    instanceRef.current.toCenter();
                    // Scale down for thumbnail view
                    const scale = 0.3;
                    if (instanceRef.current.scale) {
                        instanceRef.current.scale(scale);
                    }
                }
            }, 300);
        } catch (error) {
            console.error('Error rendering thumbnail:', error);
        }

        return () => {
            if (instanceRef.current) {
                try {
                    instanceRef.current.destroy?.();
                } catch (e) {
                    console.error('Error cleaning up thumbnail:', e);
                }
            }
        };
    }, [data]);

    return (
        <div 
            ref={containerRef} 
            className="mindmap-thumbnail"
            style={{
                width: '100%',
                height: '180px',
                overflow: 'hidden',
                borderRadius: '8px',
                background: '#f9fafb',
                marginBottom: '12px',
                position: 'relative'
            }}
        />
    );
};

const MindmapList = () => {
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { t } = useTranslation();

    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [editingMindmap, setEditingMindmap] = useState(null);
    const [newTitle, setNewTitle] = useState('');

    // Delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMindmapId, setDeletingMindmapId] = useState(null);

    // AI Generate modal
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiTitle, setAiTitle] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [descriptionError, setDescriptionError] = useState(false);

    useEffect(() => {
        fetchMindmaps();
    }, []);

    const fetchMindmaps = async () => {
        try {
            setLoading(true);
            const response = await mindmapService.getAll();
            if (response.success) {
                setMindmaps(response.data);
            }
        } catch (error) {
            console.error('Error fetching mindmaps:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            setCreateLoading(true);
            const response = await mindmapService.create({
                title: 'Untitled Mindmap',
                desc: 'Created on ' + new Date().toLocaleDateString(),
                data: {
                    nodeData: {
                        id: 'root',
                        topic: 'Main Topic',
                        root: true,
                        children: []
                    },
                    arrows: [],
                    summaries: []
                }
            });
            if (response.success) {
                const rolePath = user?.role === 'teacher' ? 'teacher' : 'student';
                navigate(`/${rolePath}/mindmaps/${response.data._id}`);
            }
        } catch (error) {
            console.error('Error creating mindmap:', error);
            toast.error('Failed to create mindmap');
        } finally {
            setCreateLoading(false);
        }
    };

    const openAIModal = () => {
        setIsAIModalOpen(true);
        setAiPrompt('');
        setAiTitle('');
        setDescriptionError(false);
    };

    const closeAIModal = () => {
        setIsAIModalOpen(false);
        setAiPrompt('');
        setAiTitle('');
        setDescriptionError(false);
    };

    const handleGenerateWithAI = async () => {
        if (!aiPrompt.trim()) {
            setDescriptionError(true);
            toast.error(t('mindmap.pleaseEnterPrompt') || 'Please enter a prompt');
            return;
        }
        setDescriptionError(false);

        try {
            setAiGenerating(true);
            const response = await mindmapService.generateWithAI(aiPrompt.trim(), aiTitle.trim() || undefined);
            
            if (response.success) {
                toast.success('Mindmap generated successfully!');
                closeAIModal();
                const rolePath = user?.role === 'teacher' ? 'teacher' : 'student';
                navigate(`/${rolePath}/mindmaps/${response.data._id}`);
            } else {
                toast.error(response.message || 'Failed to generate mindmap');
            }
        } catch (error) {
            console.error('Error generating mindmap with AI:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to generate mindmap';
            toast.error(errorMessage);
        } finally {
            setAiGenerating(false);
        }
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeletingMindmapId(id);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingMindmapId(null);
    };

    const confirmDelete = async () => {
        if (deletingMindmapId) {
            try {
                await mindmapService.delete(deletingMindmapId);
                setMindmaps(mindmaps.filter(m => m._id !== deletingMindmapId));
            } catch (error) {
                console.error('Error deleting mindmap:', error);
            }
        }
        closeDeleteModal();
    };

    const openRenameModal = (e, mindmap) => {
        e.stopPropagation();
        setEditingMindmap(mindmap);
        setNewTitle(mindmap.title);
        setIsRenameModalOpen(true);
    };

    const closeRenameModal = () => {
        setIsRenameModalOpen(false);
        setEditingMindmap(null);
        setNewTitle('');
    };

    const handleRenameSubmit = async () => {
        if (!editingMindmap || !newTitle.trim()) return;

        try {
            await mindmapService.update(editingMindmap._id, { title: newTitle });
            setMindmaps(mindmaps.map(m => m._id === editingMindmap._id ? { ...m, title: newTitle } : m));
            closeRenameModal();
        } catch (error) {
            console.error('Error renaming mindmap:', error);
        }
    };

    const handleCardClick = (id) => {
        const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
        navigate(`/${rolePath}/mindmaps/${id}`);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="mindmap-list-container">
                <div className="loading-spinner">{t('mindmap.loadingMindmaps') || 'Loading your mindmaps...'}</div>
            </div>
        );
    }

    return (
        <div className="mindmap-list-container">
            <div className="mindmap-header">
                <h1>
                    <img src="/my_maps.png" alt="" className="header-icon" />
                    {t('mindmap.myMindmaps') || 'My Mindmaps'}
                </h1>
                <div className="header-actions">
                    <button 
                        className="btn create-btn" 
                        onClick={handleCreate}
                        disabled={createLoading}
                        style={{ marginRight: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {createLoading ? (
                            <>⏳ {t('mindmap.creating') || 'Creating...'}</>
                        ) : (
                            <>
                                <PlusOutlined style={{ fontSize: '16px' }} />
                                {t('mindmap.createNew') || 'Create New'}
                            </>
                        )}
                    </button>
                    <button 
                        className="btn create-btn" 
                        onClick={openAIModal}
                        disabled={aiGenerating}
                        style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                        }}
                    >
                        ✨ {t('mindmap.createWithAI') || 'Create with AI'}
                    </button>
                </div>
            </div>

            <div className="mindmap-grid">
                {mindmaps.length === 0 ? (
                    <div className="empty-state">
                        <img src="/my_maps.png" alt="" className="empty-icon" />
                        <h3>{t('mindmap.startFirstMindmap') || 'Start your first mindmap'}</h3>
                        <p>{t('mindmap.startFirstMindmapDesc') || 'Create a new mindmap to visualize your ideas and boost your productivity'}</p>
                    </div>
                ) : (
                    mindmaps.map((mindmap) => (
                        <div
                            key={mindmap._id}
                            className="mindmap-card"
                            onClick={() => handleCardClick(mindmap._id)}
                        >
                            <div className="mindmap-card-preview">
                                {mindmap.data && (
                                    <MindmapThumbnail data={mindmap.data} />
                                )}
                            </div>
                            <div>
                                <h3>{mindmap.title || t('mindmap.untitled') || 'Untitled'}</h3>
                                <p>{mindmap.desc || t('mindmap.noDescription') || 'No description'}</p>
                            </div>
                            <div className="mindmap-card-footer">
                                <span className="date-badge">
                                    📅 {t('mindmap.lastOpened') || 'Last opened'}: {formatDate(mindmap.updated_at)}
                                </span>
                                <div className="card-actions always-visible">
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => openRenameModal(e, mindmap)}
                                        title="Rename"
                                    >
                                        <img src="/edit.png" alt="Edit" className="action-icon" />
                                    </button>
                                    <button
                                        className="icon-btn delete"
                                        onClick={(e) => openDeleteModal(e, mindmap._id)}
                                        title={t('mindmap.moveToTrash')}
                                    >
                                        <img src="/trash.png" alt="Delete" className="action-icon" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{t('mindmap.deleteConfirmTitle')}</h2>
                        </div>
                        <div className="modal-body">
                            <p>{t('mindmap.deleteConfirmMessage')}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn cancel" onClick={closeDeleteModal}>
                                {t('mindmap.cancel')}
                            </button>
                            <button className="modal-btn danger" onClick={confirmDelete}>
                                {t('mindmap.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="modal-overlay" onClick={closeRenameModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{t('mindmap.renameMindmap') || 'Rename Mindmap'}</h2>
                            <p>{t('mindmap.renameMindmapDesc') || 'Give your mindmap a new title'}</p>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                className="modal-input"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit();
                                    if (e.key === 'Escape') closeRenameModal();
                                }}
                                autoFocus
                                placeholder={t('mindmap.enterMindmapTitle') || 'Enter mindmap title'}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn cancel" onClick={closeRenameModal}>
                                {t('mindmap.cancel') || 'Cancel'}
                            </button>
                            <button className="modal-btn save" onClick={handleRenameSubmit}>
                                {t('mindmap.saveChanges') || 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Generate Modal */}
            {isAIModalOpen && (
                <div className="modal-overlay" onClick={closeAIModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>🤖 {t('mindmap.createMindmapWithAI') || 'Create Mindmap with AI'}</h2>
                            <p>{t('mindmap.createMindmapWithAIDesc') || 'Describe what you want to create and AI will generate a mindmap for you'}</p>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                    {t('mindmap.mindmapName') || 'Mindmap Name'} ({t('mindmap.optional') || 'Optional'})
                                </label>
                                <input
                                    type="text"
                                    className="modal-input"
                                    value={aiTitle}
                                    onChange={(e) => setAiTitle(e.target.value)}
                                    placeholder={t('mindmap.titlePlaceholder') || 'e.g., Project Planning, Study Guide...'}
                                    disabled={aiGenerating}
                                />
                                <div style={{ 
                                    marginTop: '6px', 
                                    fontSize: '12px', 
                                    color: '#888',
                                    fontStyle: 'italic'
                                }}>
                                    ⚠️ {t('mindmap.titleNote') || 'Note: Title is not used for AI generation. Please describe clearly in description.'}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                    {t('mindmap.describeMindmap') || 'Describe your mindmap'} <span style={{ color: '#ff4d4f' }}>*</span>
                                </label>
                                <textarea
                                    className="modal-input"
                                    value={aiPrompt}
                                    onChange={(e) => {
                                        setAiPrompt(e.target.value);
                                        if (e.target.value.trim()) setDescriptionError(false);
                                    }}
                                    placeholder={t('mindmap.describeMindmapPlaceholder') || 'e.g., Create a mindmap about the water cycle with main stages and processes'}
                                    rows={6}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: descriptionError ? '1px solid #ff4d4f' : '1px solid #ddd',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        minHeight: '120px'
                                    }}
                                    disabled={aiGenerating}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') closeAIModal();
                                    }}
                                />
                                {descriptionError && (
                                    <div style={{ 
                                        marginTop: '6px', 
                                        fontSize: '12px', 
                                        color: '#ff4d4f',
                                        fontWeight: 500
                                    }}>
                                        {t('mindmap.descriptionRequired') || 'Description is required'}
                                    </div>
                                )}
                                <div style={{ 
                                    marginTop: '8px', 
                                    fontSize: '12px', 
                                    color: '#666',
                                    fontStyle: 'italic'
                                }}>
                                    {t('mindmap.aiTip') || '💡 Tip: Be specific about the topic and structure you want'}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="modal-btn cancel" 
                                onClick={closeAIModal}
                                disabled={aiGenerating}
                            >
                                {t('mindmap.cancel') || 'Cancel'}
                            </button>
                            <button 
                                className="modal-btn save" 
                                onClick={handleGenerateWithAI}
                                disabled={aiGenerating || !aiPrompt.trim()}
                                style={{
                                    background: (aiGenerating || !aiPrompt.trim()) ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: (aiGenerating || !aiPrompt.trim()) ? 'not-allowed' : 'pointer',
                                    opacity: (aiGenerating || !aiPrompt.trim()) ? 0.6 : 1
                                }}
                            >
                                {aiGenerating ? `⏳ ${t('mindmap.generating') || 'Generating...'}` : t('mindmap.generateMindmap') || '✨ Generate Mindmap'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindmapList;
