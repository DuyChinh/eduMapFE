import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mindmapService from '../../api/mindmapService';
import './MindmapList.css';
import useAuthStore from '../../store/authStore';

const MindmapList = () => {
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [editingMindmap, setEditingMindmap] = useState(null);
    const [newTitle, setNewTitle] = useState('');

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
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const response = await mindmapService.create({
                title: 'New Mindmap',
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
                const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
                navigate(`/${rolePath}/mindmaps/${response.data._id}`);
            }
        } catch (error) {
            // Silent error
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this mindmap?')) {
            try {
                await mindmapService.delete(id);
                setMindmaps(mindmaps.filter(m => m._id !== id));
            } catch (error) {
                // Silent error
            }
        }
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
            // Silent error
        }
    };

    const handleCardClick = (id) => {
        const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
        navigate(`/${rolePath}/mindmaps/${id}`);
    };

    if (loading) {
        return <div className="loading-spinner">Loading mindmaps...</div>;
    }

    return (
        <div className="mindmap-list-container">
            <div className="mindmap-header">
                <h1>My Mindmaps</h1>
                <div className="header-actions">
                    <button
                        className="btn trash-btn"
                        onClick={() => {
                            const rolePath = user.role === 'teacher' ? 'teacher' : 'student';
                            navigate(`/${rolePath}/mindmaps/trash`);
                        }}
                    >
                        🗑️ Trash
                    </button>
                    <button className="btn create-btn" onClick={handleCreate}>
                        + Create New
                    </button>
                </div>
            </div>

            <div className="mindmap-grid">
                {mindmaps.length === 0 ? (
                    <div className="empty-state">
                        <h3>No mindmaps found</h3>
                        <p>Create your first mindmap to get started!</p>
                    </div>
                ) : (
                    mindmaps.map((mindmap) => (
                        <div
                            key={mindmap._id}
                            className="mindmap-card"
                            onClick={() => handleCardClick(mindmap._id)}
                        >
                            <div>
                                <h3>{mindmap.title}</h3>
                                <p>{mindmap.desc}</p>
                            </div>
                            <div className="mindmap-card-footer">
                                <span className="date-badge">{new Date(mindmap.updated_at).toLocaleDateString()}</span>
                                <div className="card-actions">
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => openRenameModal(e, mindmap)}
                                        title="Rename"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="icon-btn delete"
                                        onClick={(e) => handleDelete(e, mindmap._id)}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="modal-overlay" onClick={closeRenameModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Rename Mindmap</h2>
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
                                placeholder="Enter mindmap title"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn cancel" onClick={closeRenameModal}>
                                Cancel
                            </button>
                            <button className="modal-btn save" onClick={handleRenameSubmit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindmapList;
