import React, { useState, useRef, useEffect } from 'react';
import { Input, Popover, List, Avatar, Spin } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './MentionInput.css';

const { TextArea } = Input;

const MentionInput = ({ 
    value, 
    onChange, 
    onMentionsChange,
    onSubmit,
    users = [], 
    loading = false,
    onSearch,
    placeholder,
    autoSize,
    disabled,
    style,
    ...props 
}) => {
    const { t } = useTranslation();
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef(null);
    const [mentions, setMentions] = useState([]);

    // Add @everyone option to user list
    const everyoneOption = {
        _id: 'everyone',
        name: t('feed.everyone') || 'everyone',
        isEveryone: true
    };

    const filteredUsers = [
        // Show @everyone option if search matches
        ...(('everyone'.includes(mentionSearch.toLowerCase()) || 
             (t('feed.everyone') || '').toLowerCase().includes(mentionSearch.toLowerCase())) 
            ? [everyoneOption] : []),
        ...users.filter(user => 
            user.name?.toLowerCase().includes(mentionSearch.toLowerCase())
        )
    ];

    const handleChange = (e) => {
        const newValue = e.target.value;
        const pos = e.target.selectionStart;
        setCursorPosition(pos);
        
        // Check for @ trigger
        const textBeforeCursor = newValue.substring(0, pos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Check if there's no space between @ and cursor
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                setMentionSearch(textAfterAt);
                setMentionOpen(true);
                setMentionIndex(-1);
                if (onSearch) {
                    onSearch(textAfterAt);
                }
            } else {
                setMentionOpen(false);
            }
        } else {
            setMentionOpen(false);
        }
        
        onChange(newValue);
    };

    const handleSelectUser = (user) => {
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = value.substring(cursorPosition);
        
        const newValue = 
            value.substring(0, lastAtIndex) + 
            `@${user.name} ` + 
            textAfterCursor;
        
        onChange(newValue);
        
        // Add to mentions list
        const newMentions = [...mentions];
        if (!newMentions.find(m => m._id === user._id)) {
            newMentions.push(user);
            setMentions(newMentions);
            if (onMentionsChange) {
                onMentionsChange(newMentions.map(m => m._id));
            }
        }
        
        setMentionOpen(false);
        setMentionSearch('');
        
        // Focus back to textarea
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 0);
    };

    const handleKeyDown = (e) => {
        // Handle mention navigation
        if (mentionOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => 
                    prev < filteredUsers.length - 1 ? prev + 1 : prev
                );
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => prev > 0 ? prev - 1 : 0);
                return;
            } else if (e.key === 'Enter' && mentionIndex >= 0) {
                e.preventDefault();
                handleSelectUser(filteredUsers[mentionIndex]);
                return;
            } else if (e.key === 'Escape') {
                setMentionOpen(false);
                return;
            }
        }

        // Enter to send, Shift+Enter for newline
        if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
            e.preventDefault();
            if (onSubmit && value?.trim()) {
                onSubmit();
            }
        }
    };

    const mentionContent = (
        <div className="mention-dropdown">
            {loading ? (
                <div className="mention-loading">
                    <Spin size="small" />
                </div>
            ) : filteredUsers.length > 0 ? (
                <List
                    size="small"
                    dataSource={filteredUsers.slice(0, 8)}
                    renderItem={(user, index) => (
                        <List.Item
                            className={`mention-item ${index === mentionIndex ? 'selected' : ''}`}
                            onClick={() => handleSelectUser(user)}
                        >
                            {user.isEveryone ? (
                                <>
                                    <Avatar 
                                        size={28} 
                                        icon={<TeamOutlined />}
                                        style={{ backgroundColor: '#1890ff' }}
                                    />
                                    <span className="mention-name" style={{ fontWeight: 500 }}>
                                        @{user.name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Avatar 
                                        size={28} 
                                        src={user.profile?.avatar || user.avatar}
                                        icon={<UserOutlined />}
                                    />
                                    <span className="mention-name">{user.name}</span>
                                </>
                            )}
                        </List.Item>
                    )}
                />
            ) : (
                <div className="mention-empty">No users found</div>
            )}
        </div>
    );

    return (
        <Popover
            content={mentionContent}
            open={mentionOpen && (filteredUsers.length > 0 || loading)}
            placement="topLeft"
            overlayClassName="mention-popover"
            trigger={[]}
        >
            <div style={{ width: '100%' }}>
                <TextArea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoSize={autoSize}
                    disabled={disabled}
                    style={style}
                    {...props}
                />
            </div>
        </Popover>
    );
};

export default MentionInput;
