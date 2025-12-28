import React, { useState } from 'react';
import { Popover, Button, Tooltip } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import './EmojiPicker.css';

const REACTIONS = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'haha', emoji: '😂', label: 'Haha' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' },
];

const EmojiPicker = ({ onSelect, selectedType, reactions = [], currentUserId }) => {
    const [open, setOpen] = useState(false);

    const handleSelect = (type) => {
        onSelect(type);
        setOpen(false);
    };

    // Group reactions by type
    const reactionCounts = REACTIONS.map(r => ({
        ...r,
        count: reactions.filter(reaction => reaction.type === r.type).length,
        users: reactions.filter(reaction => reaction.type === r.type).map(reaction => reaction.user?.name || 'Unknown')
    })).filter(r => r.count > 0);

    const userReaction = reactions.find(r => 
        String(r.user?._id || r.user) === String(currentUserId)
    );

    const content = (
        <div className="emoji-picker-content">
            {REACTIONS.map(r => (
                <Tooltip key={r.type} title={r.label}>
                    <button
                        className={`emoji-btn ${userReaction?.type === r.type ? 'selected' : ''}`}
                        onClick={() => handleSelect(r.type)}
                    >
                        <span className="emoji">{r.emoji}</span>
                    </button>
                </Tooltip>
            ))}
        </div>
    );

    return (
        <div className="emoji-picker-wrapper">
            {/* Display existing reactions */}
            {reactionCounts.length > 0 && (
                <div className="reaction-summary">
                    {reactionCounts.map(r => (
                        <Tooltip key={r.type} title={r.users.join(', ')}>
                            <span className="reaction-badge">
                                <span className="reaction-emoji">{r.emoji}</span>
                                <span className="reaction-count">{r.count}</span>
                            </span>
                        </Tooltip>
                    ))}
                </div>
            )}

            {/* Reaction picker button */}
            <Popover
                content={content}
                trigger="hover"
                open={open}
                onOpenChange={setOpen}
                placement="top"
                overlayClassName="emoji-picker-popover"
            >
                <Button
                    type="text"
                    size="small"
                    icon={userReaction ? (
                        <span style={{ fontSize: 16 }}>
                            {REACTIONS.find(r => r.type === userReaction.type)?.emoji}
                        </span>
                    ) : (
                        <SmileOutlined />
                    )}
                    className={`react-btn ${userReaction ? 'reacted' : ''}`}
                >
                    {userReaction ? REACTIONS.find(r => r.type === userReaction.type)?.label : 'React'}
                </Button>
            </Popover>
        </div>
    );
};

export { REACTIONS };
export default EmojiPicker;
