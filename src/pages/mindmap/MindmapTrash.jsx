import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mindmapService from '../../api/mindmapService';
import './MindmapList.css';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const MindmapTrash = () => {
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { t } = useTranslation();

    // Delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMindmapId, setDeletingMindmapId] = useState(null);

    useEffect(() => {
        fetchTrash();
    }, []);

    const fetchTrash = async () => {
        try {
            setLoading(true);
            const response = await mindmapService.getTrash();
            if (response.success) {
                setMindmaps(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch trash:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (e, id) => {
        e.stopPropagation();
        try {
            await mindmapService.restore(id);
            setMindmaps(mindmaps.filter(m => m._id !== id));
        } catch (error) {
            console.error('Failed to restore mindmap:', error);
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
                await mindmapService.permanentDelete(deletingMindmapId);
                setMindmaps(mindmaps.filter(m => m._id !== deletingMindmapId));
            } catch (error) {
                console.error('Failed to delete mindmap permanently:', error);
            }
        }
        closeDeleteModal();
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
            <div className="mindmap-trash-container">
                <div className="loading-spinner">Loading trash...</div>
            </div>
        );
    }

    return (
        <div className="mindmap-trash-container">
            <div className="mindmap-header">
                <h1>
                    <img src="/trash.png" alt="" className="header-icon" />
                    Trash
                </h1>
            </div>

            <div className="mindmap-grid">
                {mindmaps.length === 0 ? (
                    <div className="empty-state">
                        <img src="/trash.png" alt="" className="empty-icon" />
                        <h3>Trash is empty</h3>
                        <p>Deleted mindmaps will appear here for 30 days before permanent deletion</p>
                    </div>
                ) : (
                    mindmaps.map((mindmap) => (
                        <div
                            key={mindmap._id}
                            className="mindmap-card"
                            style={{ cursor: 'default' }}
                        >
                            <div>
                                <h3>{mindmap.title || 'Untitled'}</h3>
                                <p>{mindmap.desc || 'No description'}</p>
                            </div>
                            <div className="mindmap-card-footer" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    width: '100%',
                                    alignItems: 'center'
                                }}>
                                    <span className="date-badge">
                                        📅 Deleted: {formatDate(mindmap.deleted_at)}
                                    </span>
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '0.5rem', 
                                    width: '100%',
                                    justifyContent: 'flex-end'
                                }}>
                                    <button
                                        className="icon-btn restore"
                                        onClick={(e) => handleRestore(e, mindmap._id)}
                                        title="Restore"
                                        style={{ 
                                            width: 'auto', 
                                            padding: '0.5rem 1rem',
                                            display: 'flex',
                                            gap: '0.35rem',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ♻️ Restore
                                    </button>
                                    <button
                                        className="icon-btn delete"
                                        onClick={(e) => openDeleteModal(e, mindmap._id)}
                                        title={t('mindmap.deleteForever')}
                                        style={{ 
                                            width: 'auto', 
                                            padding: '0.5rem 1rem',
                                            display: 'flex',
                                            gap: '0.35rem',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ❌ {t('mindmap.deleteForever')}
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
                            <h2>{t('mindmap.deleteForeverConfirmTitle')}</h2>
                        </div>
                        <div className="modal-body">
                            <p>{t('mindmap.deleteForeverConfirmMessage')}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn cancel" onClick={closeDeleteModal}>
                                {t('mindmap.cancel')}
                            </button>
                            <button className="modal-btn danger" onClick={confirmDelete}>
                                {t('mindmap.deleteForever')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindmapTrash;
