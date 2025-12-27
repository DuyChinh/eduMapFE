import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, List, Avatar, Typography, Space, Spin, Empty, theme } from 'antd';
import { BellOutlined, UserOutlined } from '@ant-design/icons';
import { FaRegBell } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import notificationService from '../../api/notificationService';
import { useTranslation } from 'react-i18next';
import formatTimeAgo from '../../utils/formatTimeAgo';
import useAuthStore from '../../store/authStore';

const { Text } = Typography;

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { token } = theme.useToken();
    const { user } = useAuthStore();

    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(10);

    const fetchNotifications = async (customLimit = null) => {
        try {
            const currentLimit = customLimit || limit;
            const res = await notificationService.getMyNotifications({ limit: currentLimit });
            const data = res.data || res;
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    // Initial load with spinner
    const initialLoad = async () => {
        setLoading(true);
        await fetchNotifications(10);
        setLoading(false);
    }

    useEffect(() => {
        initialLoad();
        const interval = setInterval(() => fetchNotifications(), 5000);
        return () => clearInterval(interval);
    }, [limit]); // Re-create interval if limit changes

    const handleViewAll = () => {
        const newLimit = limit + 10;
        setLimit(newLimit);
        fetchNotifications(newLimit);
    };

    const handleRead = async (item) => {
        setOpen(false);
        if (!item.isRead) {
            try {
                await notificationService.markAsRead(item._id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isRead: true } : n));
            } catch (error) { console.error(error); }
        }

        if (item.classId) {
            // Ensure classId is a string
            let cid = item.classId;
            if (typeof cid === 'object') {
                cid = cid._id || cid.id || String(cid);
            }
            cid = String(cid);
            
            const userRole = user?.role || 'teacher';
            const basePath = userRole === 'teacher' ? '/teacher' : '/student';

            // Check if this is a feed-related notification (new post, comment)
            // Check both type and content to handle all cases
            const isFeedNotification = item.type === 'NEW_POST' ||
                item.type === 'NEW_COMMENT' ||
                item.content === 'NOTIFICATION_NEW_POST' ||
                item.content === 'NOTIFICATION_NEW_COMMENT_OWN' ||
                item.content === 'NOTIFICATION_NEW_COMMENT_OTHER' ||
                item.content?.includes('đã đăng bài mới') ||
                item.content?.includes('đã bình luận') ||
                item.onModel === 'FeedPost';

            if (isFeedNotification) {
                // Navigate to newsfeed tab with postId
                const relatedId = item.relatedId ? (typeof item.relatedId === 'object' ? (item.relatedId._id || item.relatedId.id || String(item.relatedId)) : String(item.relatedId)) : null;
                if (relatedId) {
                    navigate(`${basePath}/classes/${cid}?tab=newsfeed&postId=${relatedId}`);
                } else {
                    navigate(`${basePath}/classes/${cid}?tab=newsfeed`);
                }
            } else if (item.relatedId) {
                const relatedId = typeof item.relatedId === 'object' ? (item.relatedId._id || item.relatedId.id || String(item.relatedId)) : String(item.relatedId);
                navigate(`${basePath}/classes/${cid}?postId=${relatedId}`);
            } else {
                navigate(`${basePath}/classes/${cid}`);
            }
        } else {
            // Handle notifications without classId (e.g. System, Mindmap, Exam)
            const userRole = user?.role || 'teacher';
            const basePath = userRole === 'teacher' ? '/teacher' : '/student';

            if (item.type === 'MINDMAP_SHARED' || item.onModel === 'Mindmap') {
                navigate(`${basePath}/mindmaps/shared`);
            } else if (item.type === 'EXAM_PUBLISHED') {
                navigate(`${basePath}/classes`); 
            } else if (item.type === 'LATE_SUBMISSION') {
                // Teacher: go to exams or dashboard
                navigate(`${basePath}/exams`);
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) { console.error(error); }
    };

    const notificationMenu = (
        <div style={{
            width: 360,
            maxHeight: 500,
            overflowY: 'auto',
            background: token.colorBgElevated,
            boxShadow: token.boxShadowSecondary,
            borderRadius: token.borderRadiusLG
        }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <Text strong style={{ fontSize: 16 }}>{t('notifications.title') || 'Thông báo'}</Text>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={handleMarkAllRead} style={{ padding: 0 }}>
                        {t('notifications.markAllRead') || 'Đánh dấu đã đọc'}
                    </Button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 20, textAlign: 'center' }}><Spin /></div>
            ) : notifications.length === 0 ? (
                <Empty description={t('notifications.noNotifications') || 'Không có thông báo mới'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={item => (
                        <List.Item
                            className="notification-item"
                            onClick={() => handleRead(item)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: item.isRead ? token.colorBgContainer : token.colorPrimaryBg,
                                transition: 'background 0.3s',
                                borderBottom: `1px solid ${token.colorBorderSecondary}`
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = item.isRead ? token.colorBgTextHover : token.colorPrimaryBgHover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = item.isRead ? token.colorBgContainer : token.colorPrimaryBg; }}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar src={item.sender?.profile?.avatar || item.sender?.avatar} icon={<UserOutlined />} />
                                }
                                title={
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'normal' }}>
                                            <Text strong>{item.sender?.name || 'Người dùng'}</Text> {(() => {
                                                const content = item.content;
                                                const className = item.classId?.name || '';

                                                // Check for keys first
                                                if (content === 'NOTIFICATION_NEW_POST' ||
                                                    content === 'NOTIFICATION_NEW_COMMENT_OWN' ||
                                                    content === 'NOTIFICATION_NEW_COMMENT_OTHER' ||
                                                    content === 'NOTIFICATION_CLASS_REMOVAL' ||
                                                    content === 'NOTIFICATION_CLASS_ADDITION' ||
                                                    content === 'EXAM_PUBLISHED' ||
                                                    content === 'SUBMISSION_GRADED' ||
                                                    content === 'LATE_SUBMISSION' ||
                                                    content === 'MINDMAP_SHARED') {
                                                    return t(`notifications.${content}`, { className, defaultValue: content });
                                                }
                                                // Handle legacy formats containing "đã ..."
                                                if (content.includes('đã đăng bài mới trong lớp')) {
                                                    return t('notifications.NOTIFICATION_NEW_POST', { className, defaultValue: content });
                                                }
                                                if (content.includes('đã bình luận về bài viết của bạn trong lớp')) {
                                                    return t('notifications.NOTIFICATION_NEW_COMMENT_OWN', { className, defaultValue: content });
                                                }
                                                if (content.includes('đã bình luận về một bài viết trong lớp')) {
                                                    return t('notifications.NOTIFICATION_NEW_COMMENT_OTHER', { className, defaultValue: content });
                                                }

                                                // Fallback for direct keys or raw text
                                                return t(content, { className, defaultValue: content });
                                            })()}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                                            {formatTimeAgo(item.createdAt, t)}
                                        </Text>
                                    </div>
                                }
                            />
                            {!item.isRead && <div style={{ width: 10, height: 10, borderRadius: '50%', background: token.colorPrimary, marginLeft: 8, flexShrink: 0 }} />}
                        </List.Item>
                    )}
                />
            )}

            {notifications.length < total && (
                <div style={{ textAlign: 'center', padding: '8px 0', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Button type="link" onClick={handleViewAll}>
                        {t('notifications.viewMore') || 'Xem thêm'}
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <Dropdown
            popupRender={(menu) => notificationMenu}
            trigger={['click']}
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
        >
            <Badge count={unreadCount} overflowCount={99} size="small" offset={[-7, 9]}>
                <Button
                    type="text"
                    icon={<FaRegBell style={{ fontSize: 20 }} />}
                    className="notification-btn"
                />
            </Badge>
        </Dropdown>
    );
};

export default NotificationDropdown;
