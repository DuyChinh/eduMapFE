import React, { useState, useEffect } from 'react';
import {
    Card,
    Avatar,
    Input,
    Button,
    List,
    Space,
    Tooltip,
    Image,
    message,
    Popconfirm,
    Upload,
    Typography,
    Divider,
    Spin,
    Dropdown,
    Menu,
    Switch,
    Modal
} from 'antd';
import {
    UserOutlined,
    PictureOutlined,
    SendOutlined,
    LikeOutlined,
    LikeFilled,
    MessageOutlined,
    DeleteOutlined,
    EllipsisOutlined,
    EditOutlined,
    LockOutlined,
    SaveOutlined,
    CloseOutlined,
    ExclamationCircleOutlined,
    SyncOutlined,
    HeartOutlined,
    HeartFilled
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import feedService from '../../api/feedService';
import uploadService from '../../api/uploadService';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;
const { Paragraph } = Typography;

// Helper to format relative time
const formatTimeAgo = (dateString, t) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return t('feed.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('feed.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('feed.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('feed.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return t('feed.monthsAgo', { count: months });
    return t('feed.yearsAgo', { count: Math.floor(months / 12) });
};

const ClassFeed = ({ classId }) => {
    const { user } = useAuthStore();
    const { theme } = useThemeStore();
    const { t } = useTranslation();

    const isDark = theme === 'dark';
    const cardBg = isDark ? '#1f1f1f' : '#fff';
    const textColor = isDark ? '#fff' : '#000'; // Main text is white in dark mode
    const subTextColor = isDark ? '#bfbfbf' : '#65676b';
    const borderColor = isDark ? '#303030' : '#f0f0f0';
    const inputBg = isDark ? '#262626' : '#fff';
    const lockBg = isDark ? '#141414' : '#f5f5f5';
    const placeholderColor = isDark ? 'rgba(255, 255, 255, 0.45)' : undefined; // AntD handles placeholder via CSS usually, but for inline styles we might need care. Using class is better but inline styles were used here.


    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [fileList, setFileList] = useState([]);
    const [newPostLocked, setNewPostLocked] = useState(false);
    const [postBtnHover, setPostBtnHover] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchPosts();
    }, [classId]);

    const fetchPosts = async (params = {}) => {
        try {
            setLoading(true);
            const res = await feedService.getPosts(classId, { page: 1, limit: 10, ...params });
            setPosts(res.posts || []);
            setTotalPages(res.totalPages || 1);
            setPage(res.currentPage || 1);
        } catch (error) {
            console.error('Fetch posts error:', error);
            message.error(t('feed.fetchFailed') || 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && fileList.length === 0) return;

        setCreating(true);
        try {
            // Upload images first
            const imageUrls = [];
            if (fileList.length > 0) {
                for (const file of fileList) {
                    const res = await uploadService.uploadImage(file.originFileObj);
                    if (res?.data?.url) {
                        imageUrls.push(res.data.url);
                    } else if (res?.url) {
                        imageUrls.push(res.url);
                    }
                }
            }

            const newPost = await feedService.createPost(classId, {
                content: newPostContent,
                images: imageUrls,
                isLocked: newPostLocked
            });

            setPosts(prev => [newPost.data || newPost, ...prev]);

            setNewPostContent('');
            setFileList([]);
            setNewPostLocked(false);
            message.success(t('feed.postCreated'));
        } catch (error) {
            console.error('Create post error:', error);
            message.error(t('feed.createFailed'));
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await feedService.deletePost(postId);
            setPosts(prev => prev.filter(p => p._id !== postId));
            message.success(t('feed.postDeleted'));
        } catch (error) {
            message.error(t('feed.deleteFailed'));
        }
    };

    const handleUpdatePost = async (postId, content) => {
        try {
            const res = await feedService.updatePost(postId, { content });
            const updatedPost = res.data || res;
            setPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    return { ...p, content: updatedPost.content };
                }
                return p;
            }));
            message.success(t('feed.updateSuccess'));
        } catch (error) {
            message.error(t('feed.updateFailed'));
        }
    };

    const handleToggleLock = async (postId) => {
        try {
            const res = await feedService.toggleLock(postId);
            const { isLocked } = res.data || res;
            setPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    return { ...p, isLocked };
                }
                return p;
            }));
            message.success(isLocked ? t('feed.lockSuccess') : t('feed.unlockSuccess'));
        } catch (error) {
            message.error(t('feed.actionFailed'));
        }
    };

    const handleLike = async (postId) => {
        try {
            const res = await feedService.toggleLike(postId);
            const updatedLikes = res.data || res;

            setPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    return { ...p, likes: updatedLikes };
                }
                return p;
            }));
        } catch (error) {
            console.error('Like error:', error);
        }
    };

    const handleRefreshPost = async (postId) => {
        try {
            const res = await feedService.getPost(postId);
            const updatedPost = res.data || res;
            setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
            message.success(t('feed.refreshSuccess'));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="text"
                    icon={<SyncOutlined />}
                    onClick={() => fetchPosts()}
                    style={{ color: '#1890ff' }}
                >
                    {t('feed.refresh')}
                </Button>
            </div>

            {/* Create Post - Only for Teacher */}
            {user?.role === 'teacher' && (
                <Card style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: cardBg, border: isDark ? '1px solid #303030' : undefined }} bodyStyle={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <TextArea
                            placeholder={t('feed.placeholder')}
                            autoSize={{ minRows: 3, maxRows: 8 }}
                            value={newPostContent}
                            onChange={e => setNewPostContent(e.target.value)}
                            style={{
                                border: 'none',
                                padding: 0,
                                fontSize: '15px',
                                resize: 'none',
                                boxShadow: 'none',
                                backgroundColor: isDark ? 'transparent' : undefined,
                                color: textColor,
                                caretColor: textColor
                            }}
                        />

                        {/* Image Preview */}
                        {
                            fileList.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList}
                                        onChange={({ fileList }) => setFileList(fileList)}
                                        beforeUpload={() => false}
                                        maxCount={5}
                                    >
                                        {fileList.length < 5 && t('feed.upload')}
                                    </Upload>
                                </div>
                            )
                        }

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 12 }}>

                            {/* Lock Toggle */}
                            <Tooltip title={newPostLocked ? t('feed.locking') : t('feed.lock')}>
                                <Button
                                    type="text"
                                    icon={<LockOutlined style={{ fontSize: '20px', color: newPostLocked ? '#1890ff' : '#888' }} />}
                                    onClick={() => setNewPostLocked(!newPostLocked)}
                                    style={{ background: newPostLocked ? (isDark ? '#112a45' : '#e6f7ff') : 'transparent' }}
                                />
                            </Tooltip>

                            <Upload
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    setFileList([...fileList, { originFileObj: file, uid: file.uid }]);
                                    return false;
                                }}
                                multiple
                            >
                                <Button type="text" icon={<PictureOutlined style={{ fontSize: '20px', color: '#52c41a' }} />} />
                            </Upload>

                            <Button
                                type="primary"
                                onClick={handleCreatePost}
                                loading={creating}
                                disabled={!newPostContent.trim() && fileList.length === 0}
                                onMouseEnter={() => setPostBtnHover(true)}
                                onMouseLeave={() => setPostBtnHover(false)}
                                style={{
                                    borderRadius: 6,
                                    background: (!newPostContent.trim() && fileList.length === 0) ? '#f5f5f5' : (postBtnHover ? '#40a9ff' : '#1890ff'),
                                    borderColor: (!newPostContent.trim() && fileList.length === 0) ? '#d9d9d9' : (postBtnHover ? '#40a9ff' : '#1890ff'),
                                    color: (!newPostContent.trim() && fileList.length === 0) ? 'rgba(0, 0, 0, 0.25)' : '#fff',
                                    fontWeight: 500,
                                    paddingLeft: 24,
                                    paddingRight: 24,
                                    height: 36,
                                    transition: 'all 0.3s'
                                }}
                            >
                                {t('feed.post')}
                            </Button>
                        </div>
                    </div >
                </Card >
            )}

            {/* Post List */}
            {
                loading && posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : (
                    <List
                        itemLayout="vertical"
                        dataSource={posts}
                        renderItem={(post) => (
                            <PostItem
                                key={post._id}
                                post={post}
                                currentUser={user}
                                onDelete={handleDeletePost}
                                onUpdate={handleUpdatePost}
                                onToggleLock={handleToggleLock}
                                onLike={handleLike}
                                onRefreshPost={handleRefreshPost}
                            />
                        )}
                    />
                )
            }
        </div >
    );
};

const PostItem = ({ post, currentUser, onDelete, onUpdate, onToggleLock, onLike, onRefreshPost }) => {
    const { t } = useTranslation();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // Theme variables
    const cardBg = isDark ? '#1f1f1f' : '#fff';
    const textColor = isDark ? '#e6f7ff' : '#333';
    const subTextColor = isDark ? '#bfbfbf' : '#65676b';
    const commentInputBg = isDark ? '#262626' : '#fff';
    const lockBg = isDark ? '#141414' : '#f5f5f5';

    const [commentContent, setCommentContent] = useState('');
    const [comments, setComments] = useState(post.comments || []);
    const [submittingComment, setSubmittingComment] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);

    // Initial sync
    useEffect(() => {
        setEditContent(post.content);
        setComments(post.comments || []);
    }, [post.content, post.comments]);

    // Check if liked
    const isLiked = post.likes && post.likes.includes(currentUser?._id || currentUser?.id);
    const isOwner = currentUser?._id === post.author?._id || currentUser?.role === 'teacher';

    const handleComment = async () => {
        if (!commentContent.trim()) return;
        setSubmittingComment(true);
        try {
            const res = await feedService.addComment(post._id, { content: commentContent });
            const newComment = res.data || res;
            setComments(prev => [...prev, newComment]);
            setCommentContent('');
        } catch (error) {
            console.error(error);
            message.error(t('feed.commentFailed'));
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await feedService.deleteComment(post._id, commentId);
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch (error) {
            message.error(t('feed.commentDeleteFailed'));
        }
    };

    const handleUpdateComment = async (commentId, content) => {
        try {
            await feedService.updateComment(post._id, commentId, { content });
            setComments(prev => prev.map(c => c._id === commentId ? { ...c, content } : c));
            message.success(t('feed.commentUpdated'));
        } catch (error) {
            message.error(t('feed.commentUpdateFailed'));
        }
    };

    const handleSaveEdit = async () => {
        if (editContent.trim() === '') return;
        await onUpdate(post._id, editContent);
        setIsEditing(false);
    };

    const actionsMenu = (
        <Menu theme={isDark ? 'dark' : 'light'}>
            <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                {t('feed.edit')}
            </Menu.Item>
            <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                <Popconfirm title={t('feed.deleteConfirmTitle')} onConfirm={() => onDelete(post._id)}>
                    <div style={{ display: 'inline-block', width: '100%' }}>{t('feed.delete')}</div>
                </Popconfirm>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="lock" icon={<LockOutlined />}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 160 }} onClick={(e) => e.stopPropagation()}>
                    <span>{t('feed.lock')}</span>
                    <Switch size="small" checked={post.isLocked} onChange={() => onToggleLock(post._id)} />
                </div>
            </Menu.Item>
        </Menu>
    );

    return (
        <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: cardBg, border: isDark ? '1px solid #303030' : undefined }} bodyStyle={{ padding: '16px 16px 8px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space align="start">
                    <Avatar size={40} src={post.author?.avatar} style={{ backgroundColor: '#87d068' }}>
                        {post.author?.name?.charAt(0)}
                    </Avatar>
                    <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: textColor }}>{post.author?.name}</div>
                        <div style={{ fontSize: 13, color: subTextColor }}>
                            {formatTimeAgo(post.createdAt, t)}
                        </div>
                    </div>
                </Space>
                {/* Actions Menu */}
                {isOwner && (
                    <Dropdown overlay={actionsMenu} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px', color: subTextColor }} />} />
                    </Dropdown>
                )}
            </div>

            {/* Content */}
            {isEditing ? (
                <div style={{ marginBottom: 12 }}>
                    <TextArea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        style={{ marginBottom: 8, backgroundColor: isDark ? 'transparent' : undefined, color: textColor }}
                    />
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" icon={<CloseOutlined />} onClick={() => { setIsEditing(false); setEditContent(post.content); }}>{t('feed.cancel')}</Button>
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveEdit}>{t('feed.save')}</Button>
                    </Space>
                </div>
            ) : (
                <Paragraph style={{ fontSize: 15, marginBottom: 12, color: textColor }}>{post.content}</Paragraph>
            )}

            {/* Images */}
            {post.images && post.images.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <Image.PreviewGroup>
                        <Space size={8} wrap>
                            {post.images.map((img, idx) => (
                                <Image
                                    key={idx}
                                    width={post.images.length === 1 ? '100%' : 200}
                                    height={post.images.length === 1 ? 'auto' : 200}
                                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                                    src={img}
                                />
                            ))}
                        </Space>
                    </Image.PreviewGroup>
                </div>
            )}

            {/* Like/Comment Counts & Actions */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <Space style={{ cursor: 'pointer' }} onClick={() => onLike(post._id)}>
                    {isLiked ? <HeartFilled style={{ color: '#ff4d4f', fontSize: 18 }} /> : <HeartOutlined style={{ fontSize: 18, color: subTextColor }} />}
                    <span style={{ fontSize: 15, color: isLiked ? '#ff4d4f' : subTextColor }}>{post.likes?.length || 0}</span>
                </Space>
                <Space style={{ cursor: 'pointer' }} onClick={() => onRefreshPost && onRefreshPost(post._id)}>
                    <Tooltip title={t('feed.refreshCommentTooltip')}>
                        <MessageOutlined style={{ fontSize: 18, color: subTextColor }} />
                    </Tooltip>
                    <span style={{ fontSize: 15, color: subTextColor }}>{comments.length}</span>
                </Space>
            </div>

            <Divider style={{ margin: '0 0 16px 0', borderColor: isDark ? '#303030' : '#f0f0f0' }} />

            {/* Comments Section */}
            <div>
                {/* Current Comments */}
                {comments.length > 0 && (
                    <List
                        dataSource={comments}
                        split={false}
                        renderItem={item => (
                            <CommentItem
                                key={item._id}
                                comment={item}
                                currentUser={currentUser}
                                postId={post._id}
                                onDelete={handleDeleteComment}
                                onUpdate={handleUpdateComment}
                            />
                        )}
                    />
                )}

                {/* New Comment Input Area */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-start' }}>
                    <Avatar size={32} src={currentUser?.avatar}>{currentUser?.name?.charAt(0)}</Avatar>

                    <div style={{
                        flex: 1,
                        border: isDark ? '1px solid #434343' : '1px solid #d9d9d9',
                        borderRadius: 8,
                        padding: '8px',
                        position: 'relative',
                        backgroundColor: post.isLocked ? lockBg : commentInputBg
                    }}>
                        <TextArea
                            placeholder={post.isLocked ? t('feed.commentLockedPlaceholder') : t('feed.commentPlaceholder')}
                            value={commentContent}
                            onChange={e => setCommentContent(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleComment();
                                }
                            }}
                            autoSize={{ minRows: 2, maxRows: 6 }}
                            disabled={submittingComment || post.isLocked}
                            style={{
                                border: 'none',
                                boxShadow: 'none',
                                resize: 'none',
                                padding: 0,
                                marginBottom: 24, // Space for button
                                backgroundColor: 'transparent',
                                color: textColor
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <Button
                                type="text"
                                icon={<SendOutlined style={{ fontSize: 16, color: (commentContent.trim() && !post.isLocked) ? '#1890ff' : '#ccc' }} />}
                                onClick={handleComment}
                                disabled={post.isLocked}
                                style={{
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isDark ? '#3a3b3c' : '#f5f5f5',
                                    borderRadius: 4
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// Define CommentItem Component
const CommentItem = ({ comment, currentUser, postId, onDelete, onUpdate }) => {
    const { t } = useTranslation();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // Theme variables for comment
    const commentBubbleBg = isDark ? '#3a3b3c' : '#f0f2f5';
    const textColor = isDark ? '#e4e6eb' : '#000';
    const subTextColor = isDark ? '#b0b3b8' : '#65676b';
    const editInputBg = isDark ? '#242526' : '#fff';

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    // Initial sync
    useEffect(() => {
        setEditContent(comment.content);
    }, [comment.content]);

    const isAuthor = currentUser?._id === comment.author?._id || currentUser?._id === comment.author?.id;
    const isTeacher = currentUser?.role === 'teacher';
    const canAction = isAuthor || isTeacher;

    const handleSave = async () => {
        if (!editContent.trim()) return;
        await onUpdate(comment._id, editContent);
        setIsEditing(false);
    };

    const confirmDelete = () => {
        Modal.confirm({
            title: t('feed.commentDeleteTitle'),
            icon: <ExclamationCircleOutlined />,
            content: t('feed.commentDeleteContent'),
            okText: t('feed.commentDeleteOk'),
            okType: 'danger',
            cancelText: t('feed.commentDeleteCancel'),
            onOk: async () => {
                await onDelete(comment._id);
            },
        });
    };

    const menu = (
        <Menu theme={isDark ? 'dark' : 'light'}>
            {isAuthor && (
                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                    {t('feed.edit')}
                </Menu.Item>
            )}
            <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={confirmDelete}>
                {t('feed.delete')}
            </Menu.Item>
        </Menu>
    );

    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Avatar size="small" src={comment.author?.avatar}>{comment.author?.name?.charAt(0)}</Avatar>
            <div style={{ flex: 1 }}>

                {isEditing ? (
                    <div style={{ marginBottom: 4 }}>
                        <TextArea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ borderRadius: 12, marginBottom: 4, backgroundColor: editInputBg, color: textColor }}
                        />
                        <Space size="small">
                            <span style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer', fontWeight: 500 }} onClick={handleSave}>{t('feed.save')}</span>
                            <span style={{ fontSize: 12, color: '#65676b', cursor: 'pointer' }} onClick={() => { setIsEditing(false); setEditContent(comment.content); }}>{t('feed.cancel')}</span>
                        </Space>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, group: 'parent' }}>
                        <div style={{
                            background: commentBubbleBg,
                            padding: '8px 12px',
                            borderRadius: 12,
                            display: 'inline-block',
                            minWidth: '120px',
                            position: 'relative'
                        }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: textColor }}>{comment.author?.name}</div>
                            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: textColor }}>{comment.content}</div>
                        </div>

                        {canAction && (
                            <Dropdown overlay={menu} trigger={['click']} placement="bottomLeft">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EllipsisOutlined />}
                                    style={{ color: subTextColor, minWidth: 24, padding: 0, marginLeft: 8 }}
                                />
                            </Dropdown>
                        )}
                    </div>
                )}

                {!isEditing && (
                    <div style={{ fontSize: 12, color: subTextColor, marginTop: 2, marginLeft: 12 }}>
                        {formatTimeAgo(comment.createdAt || new Date(), t)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassFeed;
