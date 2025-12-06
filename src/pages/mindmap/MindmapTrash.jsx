import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mindmapService from '../../api/mindmapService';
import './MindmapList.css'; // Reuse the same CSS
import useAuthStore from '../../store/authStore';

const MindmapTrash = () => {
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

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

    const handlePermanentDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to PERMANENTLY delete this mindmap? This action cannot be undone.')) {
            try {
                await mindmapService.permanentDelete(id);
                setMindmaps(mindmaps.filter(m => m._id !== id));
            } catch (error) {
                console.error('Failed to delete mindmap permanently:', error);
            }
        }
    };

    const handleBack = () => {
        const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
        navigate(`/${rolePath}/mindmaps`);
    };

    if (loading) {
        return <div className="loading-spinner">Loading trash...</div>;
    }

    return (
        <div className="mindmap-list-container">
            <div className="mindmap-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="back-btn"
                        onClick={handleBack}
                        style={{
                            fontSize: '1rem',
                            padding: '0.5rem 1rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span>&larr;</span> Back
                    </button>
                    <h1 style={{ margin: 0 }}>Trash</h1>
                </div>
            </div>

            <div className="mindmap-grid">
                {mindmaps.length === 0 ? (
                    <div className="empty-state">
                        <h3>Trash is empty</h3>
                        <p>Deleted mindmaps will appear here.</p>
                    </div>
                ) : (
                    mindmaps.map((mindmap) => (
                        <div
                            key={mindmap._id}
                            className="mindmap-card"
                            style={{ cursor: 'default', opacity: 0.9, height: 'auto', minHeight: '200px' }}
                        >
                            <div>
                                <h3>{mindmap.title}</h3>
                                <p>{mindmap.desc}</p>
                            </div>
                            <div className="mindmap-card-footer" style={{ display: 'block', marginTop: '1.5rem' }}>
                                <div style={{ marginBottom: '0.8rem', fontSize: '0.85rem', color: '#888' }}>
                                    Deleted: {new Date(mindmap.deleted_at).toLocaleDateString()}
                                </div>
                                <div className="card-actions" style={{ justifyContent: 'flex-end', gap: '0.8rem' }}>
                                    <button
                                        onClick={(e) => handleRestore(e, mindmap._id)}
                                        title="Restore"
                                        style={{
                                            color: '#2e7d32',
                                            background: '#e8f5e9',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        ♻️ Restore
                                    </button>
                                    <button
                                        onClick={(e) => handlePermanentDelete(e, mindmap._id)}
                                        title="Delete Permanently"
                                        style={{
                                            color: '#c62828',
                                            background: '#ffebee',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        ❌ Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MindmapTrash;
