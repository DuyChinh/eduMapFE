import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IoClose, IoSend, IoExpand, IoContract, IoAttach, IoEllipsisHorizontal, IoPencil, IoTrashOutline, IoCopyOutline, IoCheckmark, IoStopCircleOutline, IoArrowUp, IoAddOutline, IoMic, IoMicOutline, IoLanguage } from 'react-icons/io5';
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from 'react-icons/tb';
import { FiEdit } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import MathJaxContent from '../common/MathJaxContent';
import chatApi from '../../api/chatApi';
import './ChatWidget.css';

const ChatWidget = () => {
    const location = useLocation();
    
    // Hide chatbot on exam pages (both student and public routes)
    const isExamPage = 
        (location.pathname.includes('/exam/') && location.pathname.includes('/take')) || // Student exam: /student/exam/:examId/take
        location.pathname.match(/^\/exam\/[^/]+$/) || // Public exam route: /exam/:shareCode
        location.pathname.includes('/exam-error'); // Exam error page
    
    // If on exam page, don't render chatbot
    if (isExamPage) {
        return null;
    }
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hi! I am your AI assistant. How can I help you today?",
            sender: 'bot'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [activeMenuSessionId, setActiveMenuSessionId] = useState(null);
    const [isRenamingSessionId, setIsRenamingSessionId] = useState(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');
    const [abortController, setAbortController] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceLang, setVoiceLang] = useState('vi-VN');
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);

    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const renameInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const langMenuRef = useRef(null);

    const supportedLanguages = [
        { code: 'vi-VN', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'en-US', name: 'English', flag: '🇺🇸' },
        { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
        { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
        { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = voiceLang;

            recognitionInstance.onresult = (event) => {
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    }
                }

                if (finalTranscript) {
                    setInputText(prev => prev + finalTranscript);
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            recognitionInstance.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = recognitionInstance;
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (error) {
                    console.log('Recognition already stopped');
                }
            }
        };
    }, [voiceLang]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && isExpanded) {
            fetchSessions();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isExpanded]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuSessionId(null);
            }
            if (renameInputRef.current && !renameInputRef.current.contains(event.target)) {
                // Optional: handle blur logic here if needed, but onBlur covers most cases
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchSessions = async () => {
        setSessionsLoading(true);
        try {
            const response = await chatApi.getSessions();
            setSessions(response.data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([{
            id: Date.now(),
            text: "Hi! I am your AI assistant. How can I help you today?",
            sender: 'bot'
        }]);
        if (window.innerWidth < 768) {
            setShowSidebar(false); // Auto-close sidebar on mobile
        }
    };

    const handleSessionClick = async (sessionId) => {
        if (isRenamingSessionId === sessionId) return;
        setCurrentSessionId(sessionId);
        try {
            const response = await chatApi.getSessionHistory(sessionId);
            const history = response.data.map(msg => ({
                id: msg._id,
                text: msg.message,
                sender: msg.sender,
                attachments: msg.attachments || []
            }));
            setMessages(history);
            if (window.innerWidth < 768) {
                setShowSidebar(false);
            }
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    };

    const handleMenuClick = (e, sessionId) => {
        e.stopPropagation();
        setActiveMenuSessionId(activeMenuSessionId === sessionId ? null : sessionId);
    };

    const handleRenameClick = (e, session) => {
        e.stopPropagation();
        setIsRenamingSessionId(session._id);
        setRenameTitle(session.title || 'New Chat');
        setActiveMenuSessionId(null);
    };

    const handleRenameSubmit = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            try {
                await chatApi.renameSession(isRenamingSessionId, renameTitle);
                setSessions(prev => prev.map(s =>
                    s._id === isRenamingSessionId ? { ...s, title: renameTitle } : s
                ));
                setIsRenamingSessionId(null);
            } catch (error) {
                console.error('Failed to rename session:', error);
            }
        }
    };

    const handleRenameBlur = () => {
        setIsRenamingSessionId(null);
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            try {
                await chatApi.deleteSession(sessionId);
                setSessions(prev => prev.filter(s => s._id !== sessionId));
                if (currentSessionId === sessionId) {
                    handleNewChat();
                }
                setActiveMenuSessionId(null);
            } catch (error) {
                console.error('Failed to delete session:', error);
            }
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (isOpen) setIsExpanded(false);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const toggleSidebar = () => {
        setShowSidebar(!showSidebar);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        const newFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                newFiles.push(file);
            }
        }
        if (newFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
            e.preventDefault();
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputText,
            sender: 'user',
            attachments: selectedFiles.map(file => ({
                type: file.type.startsWith('image/') ? 'image' : 'file',
                url: URL.createObjectURL(file),
                name: file.name,
                isLocal: true
            }))
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        const filesToSend = selectedFiles;
        setSelectedFiles([]);
        setIsLoading(true);

        // Create abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            const response = await chatApi.sendMessage(inputText, currentSessionId, filesToSend, controller.signal);

            if (response.data.sessionId && response.data.sessionId !== currentSessionId) {
                setCurrentSessionId(response.data.sessionId);
                if (isExpanded) fetchSessions();
            }

            const botMessage = {
                id: Date.now() + 1,
                text: response.data.response,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            if (error.name === 'CanceledError' || error.message === 'canceled') {
                console.log('Request was cancelled by user');
                // Don't show error message for user-cancelled requests
            } else {
                console.error('Failed to send message:', error);
                const errorMessage = {
                    id: Date.now() + 1,
                    text: 'Sorry, I encountered an error. Please try again later.',
                    sender: 'bot',
                    isError: true
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } finally {
            setIsLoading(false);
            setAbortController(null);
        }
    };

    const handleStopGeneration = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsLoading(false);
        }
    };

    const handleVoiceInput = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isRecording) {
            // Stop recording
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            // Start recording
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
            }
        }
    };

    const [selectedImage, setSelectedImage] = useState(null);

    const handleImageClick = (src) => {
        setSelectedImage(src);
    };

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    const handleCopyMessage = async (text, messageId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            // Reset after 2 seconds
            setTimeout(() => {
                setCopiedMessageId(null);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedMessageId(messageId);
                setTimeout(() => {
                    setCopiedMessageId(null);
                }, 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleEditMessage = (messageId, text) => {
        setEditingMessageId(messageId);
        setEditText(text);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditText('');
    };

    const handleSubmitEdit = async (messageId) => {
        if (!editText.trim()) return;
        
        // 1. Immediately show user message and close edit mode
        const tempUserMessage = {
            id: Date.now(),
            text: editText,
            sender: 'user',
            attachments: []
        };
        
        setMessages(prev => [...prev, tempUserMessage]);
        setEditingMessageId(null);
        const messageToSend = editText;
        setEditText('');
        
        // 2. Show loading indicator
        setIsLoading(true);
        
        try {
            const response = await chatApi.editMessage(messageId, messageToSend);
            
            // 3. Update the temp user message with real ID and add bot response
            setMessages(prev => {
                const updatedMessages = [...prev];
                const lastUserIndex = updatedMessages.findIndex(m => m.id === tempUserMessage.id);
                if (lastUserIndex !== -1) {
                    updatedMessages[lastUserIndex] = {
                        id: response.data.userMessage._id,
                        text: response.data.userMessage.message,
                        sender: 'user',
                        attachments: response.data.userMessage.attachments || []
                    };
                }
                
                // Add bot response
                updatedMessages.push({
                    id: response.data.botMessage._id,
                    text: response.data.botMessage.message,
                    sender: 'bot'
                });
                
                return updatedMessages;
            });
            
            // Refresh sessions to update last message
            if (isExpanded) fetchSessions();
        } catch (error) {
            console.error('Failed to edit message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: 'Sorry, I encountered an error while editing. Please try again.',
                sender: 'bot',
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderAttachments = (msg) => {
        if (msg.attachments && msg.attachments.length > 0) {
            return msg.attachments.map((att, index) => {
                const src = att.isLocal ? att.url : (att.url.startsWith('http') ? att.url : `${import.meta.env.VITE_API_BASE_URL.replace('/v1/api', '')}${att.url}`);
                return att.type === 'image' ?
                    <div key={index} className="message-attachment">
                        <img
                            src={src}
                            alt="Attachment"
                            className="attachment-image"
                            onClick={() => handleImageClick(src)}
                        />
                    </div> :
                    <div key={index} className="message-attachment-file">[File: {att.name}]</div>
            });
        }
        return null;
    };

    return (
        <div className="chat-widget-container">
            {!isOpen && (
                <button className="chat-toggle-btn" onClick={toggleChat}>
                    <img src="/chatbot.gif" alt="Chatbot" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                </button>
            )}

            {isOpen && (
                <div className={`chat-window ${isExpanded ? 'expanded' : ''}`}>
                    {isExpanded && (
                        <div className={`chat-sidebar ${!showSidebar ? 'collapsed' : ''}`}>
                            <div className="sidebar-header">
                                <div className="sidebar-header-top">
                                    <button
                                        className="sidebar-toggle-btn"
                                        onClick={toggleSidebar}
                                        title="Close sidebar"
                                    >
                                        <TbLayoutSidebarLeftCollapse size={24} />
                                    </button>
                                    <button className="new-chat-icon-btn" onClick={handleNewChat} title="New chat">
                                        <FiEdit size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="session-list">
                                {sessionsLoading && sessions.length === 0 && (
                                    <div className="session-loading">
                                        <div className="session-loading-item" />
                                        <div className="session-loading-item" />
                                        <div className="session-loading-item" />
                                    </div>
                                )}

                                {!sessionsLoading && sessions.length === 0 && (
                                    <div className="session-empty-text">
                                        No conversations yet
                                    </div>
                                )}

                                {sessions.map(session => (
                                    <div
                                        key={session._id}
                                        className={`session-item ${currentSessionId === session._id ? 'active' : ''}`}
                                        onClick={() => handleSessionClick(session._id)}
                                    >
                                        {isRenamingSessionId === session._id ? (
                                            <input
                                                ref={renameInputRef}
                                                type="text"
                                                className="rename-input"
                                                value={renameTitle}
                                                onChange={(e) => setRenameTitle(e.target.value)}
                                                onKeyDown={handleRenameSubmit}
                                                onBlur={handleRenameBlur}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <>
                                                <span className="session-title">{session.title || 'New Chat'}</span>
                                                <button
                                                    className={`session-menu-btn ${activeMenuSessionId === session._id ? 'active' : ''}`}
                                                    onClick={(e) => handleMenuClick(e, session._id)}
                                                >
                                                    <IoEllipsisHorizontal size={16} />
                                                </button>
                                                {activeMenuSessionId === session._id && (
                                                    <div className="session-menu-dropdown" ref={menuRef}>
                                                        <div className="menu-item" onClick={(e) => handleRenameClick(e, session)}>
                                                            <IoPencil size={14} /> Rename
                                                        </div>
                                                        <div className="menu-item delete" onClick={(e) => handleDeleteSession(e, session._id)}>
                                                            <IoTrashOutline size={14} /> Delete
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}

                                {sessionsLoading && sessions.length > 0 && (
                                    <div className="session-loading-inline">
                                        Loading...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="chat-main">
                        <div className="chat-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isExpanded && !showSidebar && (
                                    <button
                                        className="sidebar-toggle-btn ghost"
                                        onClick={toggleSidebar}
                                        title="Open sidebar"
                                    >
                                        <TbLayoutSidebarLeftExpand size={24} />
                                    </button>
                                )}
                                <img src="/chatbot.gif" alt="Robot" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
                                <h3>AI Assistant</h3>
                            </div>
                            <div className="header-actions">
                                <button className="expand-btn" onClick={toggleExpand} title={isExpanded ? "Collapse" : "Expand"}>
                                    {isExpanded ? <IoContract size={20} /> : <IoExpand size={20} />}
                                </button>
                                <button className="close-btn" onClick={toggleChat} title="Close">
                                    <IoClose />
                                </button>
                            </div>
                        </div>

                        <div className="chat-messages">
                            {messages.length === 1 && messages[0].sender === 'bot' && (
                                <div className={`welcome-screen ${isExpanded ? 'expanded' : 'compact'}`}>
                                    <img src="/chatbothello.gif" alt="AI Assistant" className="welcome-icon" />
                                    <h1 className="welcome-title">Hello! How can I help you today?</h1>
                                    <div className="suggestion-chips">
                                        {isExpanded ? (
                                            <>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Help me understand a concept")}
                                                >
                                                    <span className="chip-icon">💡</span>
                                                    <span>Explain a concept</span>
                                                </button>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Help me solve this problem:")}
                                                >
                                                    <span className="chip-icon">🎯</span>
                                                    <span>Solve a problem</span>
                                                </button>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Give me ideas for")}
                                                >
                                                    <span className="chip-icon">🚀</span>
                                                    <span>Brainstorm ideas</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className="suggestion-chip"
                                                onClick={() => setInputText("Help me solve this problem:")}
                                            >
                                                <span className="chip-icon">🎯</span>
                                                <span>Solve a problem</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {messages.length > 1 && messages.map((msg, index) => (
                                <div
                                    key={msg.id}
                                    className={`message ${msg.sender} ${msg.isError ? 'error' : ''} ${editingMessageId === msg.id ? 'editing' : ''}`}
                                >
                                    {renderAttachments(msg)}
                                    {msg.text && (
                                        <>
                                            {editingMessageId === msg.id ? (
                                                <div className="edit-message-container">
                                                    <textarea
                                                        className="edit-message-input"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSubmitEdit(msg.id);
                                                            }
                                                        }}
                                                        autoFocus
                                                        rows={3}
                                                    />
                                                    <div className="edit-message-actions">
                                                        <button
                                                            className="edit-cancel-btn"
                                                            onClick={handleCancelEdit}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            className="edit-submit-btn"
                                                            onClick={() => handleSubmitEdit(msg.id)}
                                                            disabled={!editText.trim()}
                                                        >
                                                            Update
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="message-text">
                                                    {msg.sender === 'bot' ? (
                                                        <MathJaxContent content={msg.text} enableMarkdown={true} />
                                                    ) : (
                                                        msg.text
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {msg.sender === 'bot' && msg.text && !editingMessageId && (
                                        <button
                                            className="copy-message-btn"
                                            onClick={() => handleCopyMessage(msg.text, msg.id)}
                                            title="Copy message"
                                        >
                                            {copiedMessageId === msg.id ? (
                                                <IoCheckmark size={14} />
                                            ) : (
                                                <IoCopyOutline size={14} />
                                            )}
                                        </button>
                                    )}
                                    {msg.sender === 'user' && msg.text && !editingMessageId && (
                                        <div className="user-message-actions">
                                            <button
                                                className="user-message-action-btn"
                                                onClick={() => handleCopyMessage(msg.text, msg.id)}
                                                title="Copy message"
                                            >
                                                {copiedMessageId === msg.id ? (
                                                    <IoCheckmark size={14} />
                                                ) : (
                                                    <IoCopyOutline size={14} />
                                                )}
                                            </button>
                                            <button
                                                className="user-message-action-btn"
                                                onClick={() => handleEditMessage(msg.id, msg.text)}
                                                title="Edit message"
                                            >
                                                <IoPencil size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="typing-indicator">
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            <form className="chat-input-area" onSubmit={isLoading ? (e) => { e.preventDefault(); handleStopGeneration(); } : handleSendMessage}>
                                <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()}>
                                    <IoAttach size={24} />
                                </button>
                                <div className="lang-selector-wrapper" ref={langMenuRef}>
                                    <button 
                                        type="button" 
                                        className="lang-btn" 
                                        onClick={() => setShowLangMenu(!showLangMenu)}
                                        title="Change voice language"
                                    >
                                        {supportedLanguages.find(l => l.code === voiceLang)?.flag || '🌐'}
                                    </button>
                                    {showLangMenu && (
                                        <div className="lang-menu">
                                            {supportedLanguages.map(lang => (
                                                <button
                                                    key={lang.code}
                                                    className={`lang-menu-item ${voiceLang === lang.code ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setVoiceLang(lang.code);
                                                        setShowLangMenu(false);
                                                    }}
                                                >
                                                    <span className="lang-flag">{lang.flag}</span>
                                                    <span className="lang-name">{lang.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="chat-input-wrapper">
                                    {selectedFiles.length > 0 && (
                                        <div className="file-preview-container">
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="file-thumbnail">
                                                    {file.type.startsWith('image/') ? (
                                                        <img src={URL.createObjectURL(file)} alt="Preview" />
                                                    ) : (
                                                        <div className="file-icon">📄</div>
                                                    )}
                                                    <button type="button" className="remove-file-btn" onClick={() => removeFile(index)}>
                                                        <IoClose size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        className="chat-input"
                                        placeholder="Ask something... (Paste image supported)"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onPaste={handlePaste}
                                        disabled={isLoading}
                                    />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept="image/*,application/pdf"
                                    multiple
                                />
                                {isLoading || (inputText.trim() || selectedFiles.length > 0) && !isRecording ? (
                                    <button 
                                        type="submit" 
                                        className="send-btn" 
                                        disabled={!isLoading && (!inputText.trim() && selectedFiles.length === 0)}
                                    >
                                        {isLoading ? <IoStopCircleOutline /> : <IoArrowUp />}
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        className={`send-btn voice-btn ${isRecording ? 'recording' : ''}`}
                                        onClick={handleVoiceInput}
                                    >
                                        <IoMic />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {selectedImage && (
                <div className="image-modal-overlay" onClick={closeImageModal}>
                    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                        <img src={selectedImage} alt="Full size" />
                        <button className="image-modal-close" onClick={closeImageModal}>
                            <IoClose size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
