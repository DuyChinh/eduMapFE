import React, { useState, useEffect, useRef } from 'react';
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
    HeartFilled,
    LinkOutlined,
    FileTextOutlined,
    PlusOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import feedService from '../../api/feedService';
import uploadService from '../../api/uploadService';
import { joinClassRoom, leaveClassRoom, onFeedUpdate, emitTyping, emitStopTyping, onTypingStatus } from '../../services/socketService';
import { useTranslation } from 'react-i18next';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

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

const ClassFeed = ({ classId, highlightPostId }) => {
    const { user } = useAuthStore();
    const { theme } = useThemeStore();
    const { t } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();

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
    const [attachmentList, setAttachmentList] = useState([]); // Non-image files
    const [linkList, setLinkList] = useState([]);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState({ title: '', url: '' });

    const [newPostLocked, setNewPostLocked] = useState(false);
    const [postBtnHover, setPostBtnHover] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchPosts();
    }, [classId]);

    // Track if we've already scrolled to the highlighted post
    const hasScrolledRef = useRef(false);

    // Reset scroll tracking when highlightPostId changes
    useEffect(() => {
        hasScrolledRef.current = false;
    }, [highlightPostId]);

    // Scroll to highlighted post
    useEffect(() => {
        if (!loading && highlightPostId && posts.length > 0 && !hasScrolledRef.current) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`post-${highlightPostId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add highlight animation
                    element.style.transition = 'box-shadow 0.5s';
                    element.style.boxShadow = '0 0 10px 2px #1890ff';
                    setTimeout(() => {
                        element.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                    }, 3000);

                    // Mark as scrolled so polling doesn't trigger this again
                    hasScrolledRef.current = true;
                }
            }, 500); // Delay slightly to ensure render
            return () => clearTimeout(timer);
        }
    }, [loading, highlightPostId, posts]);

    const fetchPosts = async (params = {}, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await feedService.getPosts(classId, { page: 1, limit: 10, ...params });
            setPosts(res.posts || []);
            setTotalPages(res.totalPages || 1);
            setPage(res.currentPage || 1);
        } catch (error) {
            console.error('Fetch posts error:', error);
            if (!silent) messageApi.error(t('feed.fetchFailed') || 'Failed to load posts');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Real-time feed updates via Socket.IO
    useEffect(() => {
        if (classId) {
            joinClassRoom(classId);

            const unsubscribe = onFeedUpdate((data) => {
                // Refresh posts when new post or comment is received
                // We use the current page from state which is captured in the closure if we dependent on it,
                // but fetchPosts uses { page: 1 } default.
                // To support pagination persistence, we should probably pass current page,
                // but to match previous behavior we'll just call fetchPosts({}, true).
                // Actually, let's try to be smarter: if new post, refresh page 1.
                // If new comment, refresh current page (or just the post).
                
                if (data.type === 'NEW_POST') {
                    // New posts always appear on page 1
                    // If we are on page 1, refresh.
                    fetchPosts({ page: 1 }, true);
                } else if (data.type === 'NEW_COMMENT') {
                    // Refetch current page (or 1 if strict)
                    // For now, simple refresh
                    fetchPosts({}, true);
                } else {
                    fetchPosts({}, true);
                }
            });

            return () => {
                unsubscribe();
                leaveClassRoom(classId);
            };
        }
    }, [classId]);

    const handleAddLink = () => {
        if (!currentLink.url) return;
        let formattedUrl = currentLink.url;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }
        setLinkList([...linkList, { ...currentLink, url: formattedUrl }]);
        setCurrentLink({ title: '', url: '' });
        setLinkModalOpen(false);
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && fileList.length === 0 && attachmentList.length === 0 && linkList.length === 0) return;

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

            // Upload files
            const uploadedFiles = [];
            if (attachmentList.length > 0) {
                for (const file of attachmentList) {
                    const res = await uploadService.uploadImage(file.originFileObj);
                    // Depending on what uploadService returns for raw files
                    const url = res?.data?.url || res?.url;
                    if (url) {
                        uploadedFiles.push({
                            name: file.name,
                            url: url,
                            type: file.type || 'application/octet-stream'
                        });
                    }
                }
            }

            const newPost = await feedService.createPost(classId, {
                content: newPostContent,
                images: imageUrls,
                files: uploadedFiles,
                links: linkList,
                isLocked: newPostLocked
            });

            setPosts(prev => [newPost.data || newPost, ...prev]);

            setNewPostContent('');
            setFileList([]);
            setAttachmentList([]);
            setLinkList([]);
            setNewPostLocked(false);
            setLinkList([]);
            setNewPostLocked(false);
            messageApi.success(t('feed.postCreated'));
        } catch (error) {
            console.error('Create post error:', error);
            messageApi.error(t('feed.createFailed'));
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await feedService.deletePost(postId);
            setPosts(prev => prev.filter(p => p._id !== postId));
            messageApi.success(t('feed.postDeleted'));
        } catch (error) {
            messageApi.error(t('feed.deleteFailed'));
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
            messageApi.success(t('feed.updateSuccess'));
        } catch (error) {
            messageApi.error(t('feed.updateFailed'));
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
            messageApi.success(isLocked ? t('feed.lockSuccess') : t('feed.unlockSuccess'));
        } catch (error) {
            messageApi.error(t('feed.actionFailed'));
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
            messageApi.success(t('feed.refreshSuccess'));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {contextHolder}
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
                <Card style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: cardBg, border: isDark ? '1px solid #303030' : undefined }} styles={{ body: { padding: '16px' } }}>
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

                        {/* Attachments Preview */}
                        {attachmentList.length > 0 && (
                            <List
                                size="small"
                                dataSource={attachmentList}
                                renderItem={(item, index) => (
                                    <List.Item
                                        actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setAttachmentList(prev => prev.filter((_, i) => i !== index))} />]}
                                    >
                                        <Space>
                                            <FileTextOutlined />
                                            <Text>{item.name}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                                style={{ marginTop: 8, background: isDark ? '#141414' : '#fafafa', borderRadius: 4 }}
                            />
                        )}

                        {/* Links Preview */}
                        {linkList.length > 0 && (
                            <List
                                size="small"
                                dataSource={linkList}
                                renderItem={(item, index) => (
                                    <List.Item
                                        actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setLinkList(prev => prev.filter((_, i) => i !== index))} />]}
                                    >
                                        <Space>
                                            <LinkOutlined />
                                            <Text>{item.title || item.url}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                                style={{ marginTop: 8, background: isDark ? '#141414' : '#fafafa', borderRadius: 4 }}
                            />
                        )}

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

                            <Upload
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    setAttachmentList([...attachmentList, { originFileObj: file, uid: file.uid, name: file.name, type: file.type }]);
                                    return false;
                                }}
                                multiple
                            >
                                <Button type="text" icon={<FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />} />
                            </Upload>

                            <Button
                                type="text"
                                icon={<LinkOutlined style={{ fontSize: '20px', color: '#722ed1' }} />}
                                onClick={() => setLinkModalOpen(true)}
                            />

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

                        <Modal
                            title={t('feed.addLink') || "Add Link"}
                            open={linkModalOpen}
                            onOk={handleAddLink}
                            onCancel={() => {
                                setLinkModalOpen(false);
                                setCurrentLink({ title: '', url: '' });
                            }}
                            okText={t('feed.add') || "Add"}
                            cancelText={t('feed.cancel') || "Cancel"}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Input
                                    placeholder="URL (https://...)"
                                    value={currentLink.url}
                                    onChange={e => setCurrentLink({ ...currentLink, url: e.target.value })}
                                />
                                <Input
                                    placeholder={t('feed.linkTitle') || "Title (optional)"}
                                    value={currentLink.title}
                                    onChange={e => setCurrentLink({ ...currentLink, title: e.target.value })}
                                />
                            </Space>
                        </Modal>
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
                                classId={classId}
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

const PostItem = ({ post, classId, currentUser, onDelete, onUpdate, onToggleLock, onLike, onRefreshPost }) => {
    const { t } = useTranslation();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [messageApi, contextHolder] = message.useMessage();

    // Theme variables
    const cardBg = isDark ? '#1f1f1f' : '#fff';
    const textColor = isDark ? '#e6f7ff' : '#333';
    const subTextColor = isDark ? '#bfbfbf' : '#65676b';
    const commentInputBg = isDark ? '#262626' : '#fff';
    const lockBg = isDark ? '#141414' : '#f5f5f5';
    const borderColor = isDark ? '#303030' : '#f0f0f0';

    const [commentContent, setCommentContent] = useState('');
    const [comments, setComments] = useState(post.comments || []);
    const [submittingComment, setSubmittingComment] = useState(false);

    // Comment attachments state
    const [commentFileList, setCommentFileList] = useState([]);
    const [commentAttachmentList, setCommentAttachmentList] = useState([]);
    const [commentLinkList, setCommentLinkList] = useState([]);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState({ title: '', url: '' });

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    
    // Delete modal state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    // Typing state
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onTypingStatus((data) => {
            const currentUserId = currentUser?._id || currentUser?.id;
            if (data.postId === post._id && data.user.id !== currentUserId) {
                 if (data.isTyping) {
                     setTypingUsers(prev => {
                         if (!prev.find(u => u.id === data.user.id)) {
                             return [...prev, data.user];
                         }
                         return prev;
                     });
                 } else {
                     setTypingUsers(prev => prev.filter(u => u.id !== data.user.id));
                 }
            }
        });
        return () => unsubscribe();
    }, [post._id, currentUser]);

    const handleTyping = () => {
        const userId = currentUser?._id || currentUser?.id;
        if (!userId) return;
        
        // Use passed classId or fallback to post.classId
        const targetClassId = classId || post.classId || post.class;
        
        emitTyping(targetClassId, post._id, { 
            id: userId, 
            name: currentUser.fullName || currentUser.name || currentUser.username, 
            avatar: currentUser.avatar || currentUser.profile?.avatar
        });
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            emitStopTyping(targetClassId, post._id, { id: userId });
        }, 2000);
    };

    // Initial sync
    useEffect(() => {
        setEditContent(post.content);
        setComments(post.comments || []);
    }, [post.content, post.comments]);

    // Check if liked
    const isLiked = post.likes && post.likes.includes(currentUser?._id || currentUser?.id);
    const isOwner = currentUser?._id === post.author?._id || currentUser?.role === 'teacher';

    const handleAddLink = () => {
        if (!currentLink.url) return;
        let formattedUrl = currentLink.url;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }
        setCommentLinkList([...commentLinkList, { ...currentLink, url: formattedUrl }]);
        setCurrentLink({ title: '', url: '' });
        setLinkModalOpen(false);
    };

    const handleComment = async () => {
        if (!commentContent.trim() && commentFileList.length === 0 && commentAttachmentList.length === 0 && commentLinkList.length === 0) return;
        setSubmittingComment(true);
        try {
            // Upload images
            const imageUrls = [];
            if (commentFileList.length > 0) {
                for (const file of commentFileList) {
                    const res = await uploadService.uploadImage(file.originFileObj);
                    if (res?.data?.url) imageUrls.push(res.data.url);
                    else if (res?.url) imageUrls.push(res.url);
                }
            }

            // Upload files
            const uploadedFiles = [];
            if (commentAttachmentList.length > 0) {
                for (const file of commentAttachmentList) {
                    const res = await uploadService.uploadImage(file.originFileObj);
                    const url = res?.data?.url || res?.url;
                    if (url) {
                        uploadedFiles.push({
                            name: file.name,
                            url: url,
                            type: file.type || 'application/octet-stream'
                        });
                    }
                }
            }

            const res = await feedService.addComment(post._id, {
                content: commentContent,
                images: imageUrls,
                files: uploadedFiles,
                links: commentLinkList
            });
            const newComment = res.data || res;
            setComments(prev => [...prev, newComment]);

            // Reset state
            setCommentContent('');
            setCommentFileList([]);
            setCommentAttachmentList([]);
            setCommentLinkList([]);
        } catch (error) {
            console.error(error);
            if (error.response && error.response.status === 403) {
                messageApi.error(error.response.data.message || t('feed.commentFailed'));
                // Reload to trigger parent access check
                setTimeout(() => window.location.reload(), 1000);
            } else {
                messageApi.error(t('feed.commentFailed'));
            }
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await feedService.deleteComment(post._id, commentId);
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch (error) {
            messageApi.error(t('feed.commentDeleteFailed'));
        }
    };

    const handleUpdateComment = async (commentId, content, images, files, links) => {
        try {
            const res = await feedService.updateComment(post._id, commentId, { content, images, files, links });
            const updated = res.data || res;
            setComments(prev => prev.map(c => c._id === commentId ? updated : c));
            messageApi.success(t('feed.commentUpdated'));
        } catch (error) {
            messageApi.error(t('feed.commentUpdateFailed'));
        }
    };

    const handleSaveEdit = async () => {
        if (editContent.trim() === '') return;
        await onUpdate(post._id, editContent);
        setIsEditing(false);
    };

    const postMenuItems = [
        {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('feed.edit'),
            onClick: () => setIsEditing(true)
        },
        {
            key: 'delete',
            icon: <DeleteOutlined />,
            danger: true,
            label: t('feed.delete'),
            onClick: () => setDeleteModalVisible(true)
        },
        { type: 'divider' },
        {
            key: 'lock',
            icon: <LockOutlined />,
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 160 }} onClick={(e) => e.stopPropagation()}>
                    <span>{t('feed.lock')}</span>
                    <Switch size="small" checked={post.isLocked} onChange={() => onToggleLock(post._id)} />
                </div>
            )
        }
    ];

    const handleDownload = async (e, file) => {
        e.preventDefault();
        try {
            // Fetch blob to enforce correct filename with extension
            const response = await fetch(file.url);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name); // Correct filename from metadata
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error, fallback to new tab:', error);
            // Fallback if CORS/Network fails
            window.open(file.url, '_blank');
        }
    };

    return (
        <Card id={`post-${post._id}`} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: cardBg, border: isDark ? '1px solid #303030' : undefined }} styles={{ body: { padding: '16px 16px 8px 16px' } }}>
            {contextHolder}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space align="start">
                    <Avatar size={40} src={post.author?.avatar || post.author?.profile?.avatar} style={{ backgroundColor: '#87d068' }}>
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
                    <Dropdown menu={{ items: postMenuItems, theme: isDark ? 'dark' : 'light' }} trigger={['click']} placement="bottomRight">
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

            {/* Files */}
            {post.files && post.files.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {post.files.map((file, idx) => (
                            <a
                                key={idx}
                                href={file.url}
                                onClick={(e) => handleDownload(e, file)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, color: textColor, textDecoration: 'none', padding: '8px', border: `1px solid ${borderColor}`, borderRadius: 4, background: isDark ? '#262626' : '#fafafa', cursor: 'pointer' }}
                            >
                                <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                    {file.type && <div style={{ fontSize: 12, color: subTextColor }}>{file.type}</div>}
                                </div>
                            </a>
                        ))}
                    </Space>
                </div>
            )}

            {/* Links */}
            {post.links && post.links.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {post.links.map((link, idx) => (
                            <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1890ff', padding: '4px 0', textDecoration: 'none', fontSize: 15 }}>
                                <LinkOutlined />
                                <span>{link.title || link.url}</span>
                            </a>
                        ))}
                    </Space>
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

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div style={{ padding: '0 0 8px 44px', fontSize: 13, color: subTextColor, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar.Group size="small" maxCount={3}>
                            {typingUsers.map(u => (
                                <Avatar key={u.id} src={u.avatar} size={20} style={{ backgroundColor: '#87d068' }}>{u.name?.charAt(0)}</Avatar>
                            ))}
                        </Avatar.Group>
                        <span>
                            {t('feed.isTyping', { name: typingUsers.map(u => u.name).join(', ') })}
                        </span>
                    </div>
                )}

                {/* New Comment Input Area */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-start' }}>
                    <Avatar size={32} src={currentUser?.avatar || currentUser?.profile?.avatar}>{currentUser?.name?.charAt(0)}</Avatar>

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
                            onChange={e => {
                                setCommentContent(e.target.value);
                                handleTyping();
                            }}
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
                                marginBottom: (commentFileList.length > 0 || commentAttachmentList.length > 0 || commentLinkList.length > 0) ? 8 : 24,
                                backgroundColor: 'transparent',
                                color: textColor
                            }}
                        />

                        {/* Previews */}
                        {(commentFileList.length > 0 || commentAttachmentList.length > 0 || commentLinkList.length > 0) && (
                            <div style={{ marginBottom: 32 }}>
                                {commentFileList.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <Upload
                                            listType="picture-card"
                                            fileList={commentFileList}
                                            onChange={({ fileList }) => setCommentFileList(fileList)}
                                            beforeUpload={() => false}
                                            onRemove={(file) => setCommentFileList(prev => prev.filter(f => f.uid !== file.uid))}
                                        >
                                            {null}
                                        </Upload>
                                    </div>
                                )}
                                {commentAttachmentList.length > 0 && (
                                    <List
                                        size="small"
                                        dataSource={commentAttachmentList}
                                        renderItem={(item, index) => (
                                            <List.Item
                                                actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setCommentAttachmentList(prev => prev.filter((_, i) => i !== index))} />]}
                                                style={{ padding: '4px 8px', background: isDark ? '#141414' : '#f5f5f5', marginBottom: 4, borderRadius: 4 }}
                                            >
                                                <Space>
                                                    <FileTextOutlined />
                                                    <Text style={{ fontSize: 13, maxWidth: 200 }} ellipsis>{item.name}</Text>
                                                </Space>
                                            </List.Item>
                                        )}
                                        split={false}
                                    />
                                )}
                                {commentLinkList.length > 0 && (
                                    <List
                                        size="small"
                                        dataSource={commentLinkList}
                                        renderItem={(item, index) => (
                                            <List.Item
                                                actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setCommentLinkList(prev => prev.filter((_, i) => i !== index))} />]}
                                                style={{ padding: '4px 8px', background: isDark ? '#141414' : '#f5f5f5', marginBottom: 4, borderRadius: 4 }}
                                            >
                                                <Space>
                                                    <LinkOutlined />
                                                    <Text style={{ fontSize: 13, maxWidth: 200 }} ellipsis>{item.title || item.url}</Text>
                                                </Space>
                                            </List.Item>
                                        )}
                                        split={false}
                                    />
                                )}
                            </div>
                        )}

                        <div style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center'
                        }}>
                            {/* Attachments Toolbar */}
                            {!post.isLocked && (
                                <>
                                    <Upload
                                        showUploadList={false}
                                        beforeUpload={(file) => {
                                            setCommentFileList([...commentFileList, { originFileObj: file, uid: file.uid, url: URL.createObjectURL(file) }]);
                                            return false;
                                        }}
                                        multiple
                                        accept="image/*"
                                    >
                                        <Button type="text" icon={<PictureOutlined style={{ fontSize: 16, color: '#52c41a' }} />} size="small" />
                                    </Upload>
                                    <Upload
                                        showUploadList={false}
                                        beforeUpload={(file) => {
                                            setCommentAttachmentList([...commentAttachmentList, { originFileObj: file, uid: file.uid, name: file.name, type: file.type }]);
                                            return false;
                                        }}
                                        multiple
                                    >
                                        <Button type="text" icon={<FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />} size="small" />
                                    </Upload>
                                    <Button
                                        type="text"
                                        icon={<LinkOutlined style={{ fontSize: 16, color: '#722ed1' }} />}
                                        size="small"
                                        onClick={() => setLinkModalOpen(true)}
                                    />
                                </>
                            )}

                            <Button
                                type="text"
                                icon={<SendOutlined style={{ fontSize: 16, color: (commentContent.trim() || commentFileList.length > 0 || commentAttachmentList.length > 0) && !post.isLocked ? '#1890ff' : '#ccc' }} />}
                                onClick={handleComment}
                                disabled={post.isLocked || (!commentContent.trim() && commentFileList.length === 0 && commentAttachmentList.length === 0 && commentLinkList.length === 0)}
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

                <Modal
                    title={t('feed.addLink') || "Add Link"}
                    open={linkModalOpen}
                    onOk={handleAddLink}
                    onCancel={() => {
                        setLinkModalOpen(false);
                        setCurrentLink({ title: '', url: '' });
                    }}
                    okText={t('feed.add') || "Add"}
                    cancelText={t('feed.cancel') || "Cancel"}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Input
                            placeholder="URL (https://...)"
                            value={currentLink.url}
                            onChange={e => setCurrentLink({ ...currentLink, url: e.target.value })}
                        />
                        <Input
                            placeholder={t('feed.linkTitle') || "Title (optional)"}
                            value={currentLink.title}
                            onChange={e => setCurrentLink({ ...currentLink, title: e.target.value })}
                        />
                    </Space>
                </Modal>
            </div>
            
            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                onConfirm={() => {
                    onDelete(post._id);
                    setDeleteModalVisible(false);
                }}
                title={t('common.deletePost')}
                description={t('common.deletePostMessage')}
            />
        </Card>
    );
};

// Define CommentItem Component
const CommentItem = ({ comment, currentUser, postId, onDelete, onUpdate }) => {
    const { t } = useTranslation();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [modal, contextHolder] = Modal.useModal();

    // Theme variables for comment
    const commentBubbleBg = isDark ? '#3a3b3c' : '#f0f2f5';
    const textColor = isDark ? '#e4e6eb' : '#000';
    const subTextColor = isDark ? '#b0b3b8' : '#65676b';
    const editInputBg = isDark ? '#242526' : '#fff';
    const borderColor = isDark ? '#303030' : '#f0f0f0';

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    // Edit states for attachments
    const [fileList, setFileList] = useState([]);
    const [attachmentList, setAttachmentList] = useState([]);
    const [linkList, setLinkList] = useState([]);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState({ title: '', url: '' });

    const handleEditClick = () => {
        setEditContent(comment.content);
        setFileList((comment.images || []).map((url, index) => ({
            uid: `img-${index}`,
            name: `image-${index}`,
            status: 'done',
            url: url
        })));
        setAttachmentList((comment.files || []).map((file, index) => ({
            uid: `file-${index}`,
            name: file.name,
            status: 'done',
            url: file.url,
            type: file.type
        })));
        setLinkList(comment.links || []);
        setIsEditing(true);
    };

    // Removed useEffect that was resetting state on polling updates

    const isAuthor = currentUser?._id === comment.author?._id || currentUser?._id === comment.author?.id;
    const isTeacher = currentUser?.role === 'teacher';
    const canAction = isAuthor || isTeacher;

    const handleAddLink = () => {
        if (!currentLink.url) return;
        let formattedUrl = currentLink.url;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }
        setLinkList([...linkList, { ...currentLink, url: formattedUrl }]);
        setCurrentLink({ title: '', url: '' });
        setLinkModalOpen(false);
    };

    const handleSave = async () => {
        if (!editContent.trim() && fileList.length === 0 && attachmentList.length === 0 && linkList.length === 0) return;

        // Process Images
        const finalImages = [];
        for (const file of fileList) {
            if (file.url && !file.originFileObj) {
                finalImages.push(file.url);
            } else if (file.originFileObj) {
                const res = await uploadService.uploadImage(file.originFileObj);
                if (res?.data?.url) finalImages.push(res.data.url);
                else if (res?.url) finalImages.push(res.url);
            }
        }

        // Process Files
        const finalFiles = [];
        for (const file of attachmentList) {
            if (file.url && !file.originFileObj) {
                finalFiles.push({ name: file.name, url: file.url, type: file.type });
            } else if (file.originFileObj) {
                const res = await uploadService.uploadImage(file.originFileObj);
                const url = res?.data?.url || res?.url;
                if (url) {
                    finalFiles.push({
                        name: file.name,
                        url: url,
                        type: file.type || 'application/octet-stream'
                    });
                }
            }
        }

        await onUpdate(comment._id, editContent, finalImages, finalFiles, linkList);
        setIsEditing(false);
    };

    const handleDownload = async (e, file) => {
        e.preventDefault();
        try {
            // Fetch blob to enforce correct filename with extension
            const response = await fetch(file.url);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name); // Correct filename from metadata
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error, fallback to new tab:', error);
            // Fallback if CORS/Network fails
            window.open(file.url, '_blank');
        }
    };



    const confirmDelete = () => {
        modal.confirm({
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

    const menuItems = [];
    if (isAuthor) {
        menuItems.push({
            key: 'edit',
            icon: <EditOutlined />,
            label: t('feed.edit'),
            onClick: handleEditClick
        });
    }
    menuItems.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
        label: t('feed.delete'),
        onClick: confirmDelete
    });

    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {contextHolder}
            <Avatar size="small" src={comment.author?.avatar || comment.author?.profile?.avatar}>{comment.author?.name?.charAt(0)}</Avatar>
            <div style={{ flex: 1 }}>

                {isEditing ? (
                    <div style={{ marginBottom: 4 }}>
                        <TextArea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ borderRadius: 12, marginBottom: 4, backgroundColor: editInputBg, color: textColor }}
                        />

                        {(fileList.length > 0 || attachmentList.length > 0 || linkList.length > 0) && (
                            <div style={{ marginBottom: 8 }}>
                                {fileList.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <Upload
                                            listType="picture-card"
                                            fileList={fileList}
                                            onChange={({ fileList }) => setFileList(fileList)}
                                            beforeUpload={() => false}
                                            onRemove={(file) => setFileList(prev => prev.filter(f => f.uid !== file.uid))}
                                        >
                                            {null}
                                        </Upload>
                                    </div>
                                )}
                                {attachmentList.length > 0 && (
                                    <List
                                        size="small"
                                        dataSource={attachmentList}
                                        renderItem={(item, index) => (
                                            <List.Item
                                                actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setAttachmentList(prev => prev.filter((_, i) => i !== index))} />]}
                                                style={{ padding: '4px 8px', background: isDark ? '#141414' : '#f5f5f5', marginBottom: 4, borderRadius: 4 }}
                                            >
                                                <Space>
                                                    <FileTextOutlined />
                                                    <Text style={{ fontSize: 13, maxWidth: 200 }} ellipsis>{item.name}</Text>
                                                </Space>
                                            </List.Item>
                                        )}
                                        split={false}
                                    />
                                )}
                                {linkList.length > 0 && (
                                    <List
                                        size="small"
                                        dataSource={linkList}
                                        renderItem={(item, index) => (
                                            <List.Item
                                                actions={[<Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => setLinkList(prev => prev.filter((_, i) => i !== index))} />]}
                                                style={{ padding: '4px 8px', background: isDark ? '#141414' : '#f5f5f5', marginBottom: 4, borderRadius: 4 }}
                                            >
                                                <Space>
                                                    <LinkOutlined />
                                                    <Text style={{ fontSize: 13, maxWidth: 200 }} ellipsis>{item.title || item.url}</Text>
                                                </Space>
                                            </List.Item>
                                        )}
                                        split={false}
                                    />
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Upload
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        setFileList([...fileList, { originFileObj: file, uid: file.uid, url: URL.createObjectURL(file) }]);
                                        return false;
                                    }}
                                    multiple
                                    accept="image/*"
                                >
                                    <Button type="text" icon={<PictureOutlined style={{ fontSize: 16, color: '#52c41a' }} />} size="small" />
                                </Upload>
                                <Upload
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        setAttachmentList([...attachmentList, { originFileObj: file, uid: file.uid, name: file.name, type: file.type }]);
                                        return false;
                                    }}
                                    multiple
                                >
                                    <Button type="text" icon={<FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />} size="small" />
                                </Upload>
                                <Button
                                    type="text"
                                    icon={<LinkOutlined style={{ fontSize: 16, color: '#722ed1' }} />}
                                    size="small"
                                    onClick={() => setLinkModalOpen(true)}
                                />
                            </div>
                            <Space size="small">
                                <span style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer', fontWeight: 500 }} onClick={handleSave}>{t('feed.save')}</span>
                                <span style={{ fontSize: 12, color: '#65676b', cursor: 'pointer' }} onClick={() => { setIsEditing(false); setEditContent(comment.content); }}>{t('feed.cancel')}</span>
                            </Space>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, group: 'parent' }}>
                        <div style={{ flex: 1 }}>
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

                            {/* Attachments Display */}
                            {(comment.images?.length > 0 || comment.files?.length > 0 || comment.links?.length > 0) && (
                                <div style={{ marginTop: 8 }}>
                                    {comment.images?.length > 0 && (
                                        <div style={{ marginBottom: 4 }}>
                                            <Image.PreviewGroup>
                                                <Space size={4} wrap>
                                                    {comment.images.map((img, idx) => (
                                                        <Image
                                                            key={idx}
                                                            width={100}
                                                            height={100}
                                                            style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                                                            src={img}
                                                        />
                                                    ))}
                                                </Space>
                                            </Image.PreviewGroup>
                                        </div>
                                    )}
                                    {comment.files?.length > 0 && (
                                        <div style={{ marginBottom: 4 }}>
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {comment.files.map((file, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={file.url}
                                                        onClick={(e) => handleDownload(e, file)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: textColor, textDecoration: 'none', padding: '4px 8px', border: `1px solid ${borderColor}`, borderRadius: 4, background: isDark ? '#262626' : '#fafafa', fontSize: 13, maxWidth: '300px' }}
                                                    >
                                                        <FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                                        </div>
                                                    </a>
                                                ))}
                                            </Space>
                                        </div>
                                    )}
                                    {comment.links?.length > 0 && (
                                        <div style={{ marginBottom: 4 }}>
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {comment.links.map((link, idx) => (
                                                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1890ff', padding: '2px 0', textDecoration: 'none', fontSize: 13 }}>
                                                        <LinkOutlined />
                                                        <span>{link.title || link.url}</span>
                                                    </a>
                                                ))}
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {canAction && (
                            <Dropdown menu={{ items: menuItems, theme: isDark ? 'dark' : 'light' }} trigger={['click']} placement="bottomLeft">
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
            <Modal
                title={t('feed.addLink') || "Add Link"}
                open={linkModalOpen}
                onOk={handleAddLink}
                onCancel={() => {
                    setLinkModalOpen(false);
                    setCurrentLink({ title: '', url: '' });
                }}
                okText={t('feed.add') || "Add"}
                cancelText={t('feed.cancel') || "Cancel"}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                        placeholder="URL (https://...)"
                        value={currentLink.url}
                        onChange={e => setCurrentLink({ ...currentLink, url: e.target.value })}
                    />
                    <Input
                        placeholder={t('feed.linkTitle') || "Title (optional)"}
                        value={currentLink.title}
                        onChange={e => setCurrentLink({ ...currentLink, title: e.target.value })}
                    />
                </Space>
            </Modal>
        </div>
    );
};

export default ClassFeed;
