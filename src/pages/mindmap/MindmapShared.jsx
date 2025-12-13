import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mindmapService from '../../api/mindmapService';
import './MindmapList.css';
import useAuthStore from '../../store/authStore';

const MindmapShared = () => {
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        fetchSharedMindmaps();
    }, []);

    const fetchSharedMindmaps = async () => {
        try {
            setLoading(true);
            const response = await mindmapService.getShared();
            if (response.success) {
                setMindmaps(response.data);
            }
        } catch (error) {
            console.error('Error fetching shared mindmaps:', error);
            setMindmaps([]);
        } finally {
            setLoading(false);
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
            <div className="mindmap-shared-container">
                <div className="loading-spinner">Loading shared mindmaps...</div>
            </div>
        );
    }

    return (
        <div className="mindmap-shared-container">
            <div className="mindmap-header">
                <h1>
                    <img src="/shared.png" alt="" className="header-icon" />
                    Shared with Me
                </h1>
            </div>

            <div className="mindmap-grid">
                {mindmaps.length === 0 ? (
                    <div className="empty-state">
                        <img src="/shared.png" alt="" className="empty-icon" />
                        <h3>No shared mindmaps yet</h3>
                        <p>When someone shares a mindmap with you, it will appear here</p>
                    </div>
                ) : (
                    mindmaps.map((mindmap) => (
                        <div
                            key={mindmap._id}
                            className="mindmap-card"
                            onClick={() => handleCardClick(mindmap._id)}
                        >
                            <div>
                                <h3>{mindmap.title || 'Untitled'}</h3>
                                <p>{mindmap.desc || 'No description'}</p>
                                {mindmap.owner && (
                                    <span className="shared-by">
                                        {mindmap.owner.name || mindmap.owner.email}
                                    </span>
                                )}
                            </div>
                            <div className="mindmap-card-footer">
                                <span className="date-badge">
                                    📅 {formatDate(mindmap.sharedAt || mindmap.updated_at)}
                                </span>
                                <span className={`permission-badge ${mindmap.myPermission}`}>
                                    {mindmap.myPermission === 'edit' ? '✏️ Can Edit' : '👁️ View Only'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MindmapShared;
