import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoClose, IoSend, IoExpand, IoContract, IoAttach, IoImage, IoEllipsisHorizontal, IoPencil, IoTrashOutline, IoCopyOutline, IoCheckmark, IoStopCircleOutline, IoArrowUp, IoAddOutline, IoMic, IoMicOutline, IoLanguage, IoSearch } from 'react-icons/io5';
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from 'react-icons/tb';
import { FiEdit } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import MathJaxContent from '../common/MathJaxContent';
import chatApi from '../../api/chatApi';
import './ChatWidget.css';

const ChatWidget = () => {
    const location = useLocation();
    const { t } = useTranslation();
    
    // Speech Recognition Hook - MUST be called before any early returns
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();
    
    // All hooks must be called before any early returns to maintain hook order
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: t('chat.hello'),
            sender: 'bot'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [activeMenuSessionId, setActiveMenuSessionId] = useState(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');
    const [abortController, setAbortController] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [voiceLang, setVoiceLang] = useState('vi-VN'); // Vietnamese as default
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [loadingSessionId, setLoadingSessionId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [sessionToRename, setSessionToRename] = useState(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [hoveredSessionTitle, setHoveredSessionTitle] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [selectedImage, setSelectedImage] = useState(null);

    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const renameInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const langMenuRef = useRef(null);
    
    // Define fetchSessions before useEffect that uses it
    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const response = await chatApi.getSessions();
            setSessions(response.data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const performSearch = useCallback(async (query) => {
        if (!query || query.trim() === '') {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        setShowSearchResults(true);
        try {
            const response = await chatApi.searchSessions(query);
            setSearchResults(response.data || []);
        } catch (error) {
            console.error('Failed to search sessions:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // All useEffect hooks must be called before early return
    // Update input text when transcript changes
    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    }, [isOpen, isExpanded, fetchSessions]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuSessionId(null);
            }
            if (renameInputRef.current && !renameInputRef.current.contains(event.target)) {
                // Optional: handle blur logic here if needed, but onBlur covers most cases
            }
            if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
                setShowLangMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, performSearch]);
    
    // Hide chatbot on exam pages (both student and public routes)
    const isExamPage = 
        (location.pathname.includes('/exam/') && location.pathname.includes('/take')) || // Student exam: /student/exam/:examId/take
        location.pathname.match(/^\/exam\/[^/]+$/) || // Public exam route: /exam/:shareCode
        location.pathname.includes('/exam-error'); // Exam error page
    
    // If on exam page, don't render chatbot (after all hooks are called)
    if (isExamPage) {
        return null;
    }

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

    const handleSearchResultClick = async (sessionId) => {
        setShowSearchResults(false);
        setSearchQuery('');
        await handleSessionClick(sessionId);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return t('chat.today');
        } else if (diffDays === 2) {
            return t('chat.yesterday');
        } else if (diffDays <= 7) {
            return `${diffDays - 1} ${t('chat.daysAgo')}`;
        } else {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            // For Vietnamese, keep "thg" format, for others use different format
            const lang = localStorage.getItem('language') || 'en';
            if (lang === 'vi') {
                return `${day} thg ${month}`;
            } else if (lang === 'jp') {
                return `${month}月${day}日`;
            } else {
                return `${month}/${day}`;
            }
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([{
            id: Date.now(),
            text: t('chat.hello'),
            sender: 'bot'
        }]);
        if (window.innerWidth < 768) {
            setShowSidebar(false); // Auto-close sidebar on mobile
        }
    };

    const handleSessionClick = async (sessionId) => {
        setCurrentSessionId(sessionId);
        setLoadingSessionId(sessionId);
        try {
            const response = await chatApi.getSessionHistory(sessionId);
            const history = response.data.map(msg => ({
                id: msg._id,
                text: msg.message,
                sender: msg.sender,
                attachments: msg.attachments || [],
                isPending: msg.status === 'pending',
                isError: msg.isError || msg.status === 'error'
            }));
            setMessages(history);
            
            const pendingMessages = history.filter(msg => msg.isPending && msg.sender === 'bot');
            if (pendingMessages.length > 0) {
                pendingMessages.forEach(msg => {
                    pollMessageStatus(msg.id, msg.id);
                });
            }
            
            if (window.innerWidth < 768) {
                setShowSidebar(false);
            }
        } catch (error) {
            console.error('Failed to load session history:', error);
        } finally {
            setLoadingSessionId(null);
        }
    };

    const handleMenuClick = (e, sessionId) => {
        e.stopPropagation();
        setActiveMenuSessionId(activeMenuSessionId === sessionId ? null : sessionId);
    };

    const handleRenameClick = (e, session) => {
        e.stopPropagation();
        setSessionToRename(session._id);
        setRenameTitle(session.title || t('chat.newChat'));
        setRenameModalOpen(true);
        setActiveMenuSessionId(null);
    };

    const handleRenameConfirm = async () => {
        if (!sessionToRename || !renameTitle.trim()) return;
        
        setIsRenaming(true);
        try {
            await chatApi.renameSession(sessionToRename, renameTitle.trim());
            setSessions(prev => prev.map(s =>
                s._id === sessionToRename ? { ...s, title: renameTitle.trim() } : s
            ));
            setRenameModalOpen(false);
            setSessionToRename(null);
            setRenameTitle('');
        } catch (error) {
            console.error('Failed to rename session:', error);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleRenameCancel = () => {
        setRenameModalOpen(false);
        setSessionToRename(null);
        setRenameTitle('');
    };

    const handleDeleteClick = (e, sessionId) => {
        e.stopPropagation();
        setSessionToDelete(sessionId);
        setDeleteModalOpen(true);
        setActiveMenuSessionId(null);
    };

    const handleDeleteConfirm = async () => {
        if (!sessionToDelete) return;
        
        setIsDeleting(true);
        try {
            await chatApi.deleteSession(sessionToDelete);
            setSessions(prev => prev.filter(s => s._id !== sessionToDelete));
            if (currentSessionId === sessionToDelete) {
                handleNewChat();
            }
            setDeleteModalOpen(false);
            setSessionToDelete(null);
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setSessionToDelete(null);
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

    const handleImageSelect = (e) => {
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

    const pollMessageStatus = useCallback(async (messageId, botMessageTempId) => {
        console.log('🔍 [ChatWidget] Starting poll for messageId:', messageId);
        const maxAttempts = 60;
        let attempts = 0;

        const pollInterval = setInterval(async () => {
            attempts++;
            console.log(`🔍 [ChatWidget] Poll attempt ${attempts}/${maxAttempts}`);

            try {
                const statusResponse = await chatApi.checkMessageStatus(messageId);
                const { status, message: updatedMessage } = statusResponse.data;
                console.log(`🔍 [ChatWidget] Status:`, status);

                if (status === 'completed') {
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMessageTempId
                            ? { ...msg, text: updatedMessage, isPending: false }
                            : msg
                    ));
                    clearInterval(pollInterval);
                    setIsLoading(false);
                } else if (status === 'error') {
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMessageTempId
                            ? { ...msg, text: updatedMessage || t('chat.error'), isError: true, isPending: false }
                            : msg
                    ));
                    clearInterval(pollInterval);
                    setIsLoading(false);
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMessageTempId
                            ? { ...msg, text: t('chat.timeout'), isError: true, isPending: false }
                            : msg
                    ));
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to check message status:', error);
                clearInterval(pollInterval);
                setIsLoading(false);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [t]);

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

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const response = await chatApi.sendMessage(inputText, currentSessionId, filesToSend, controller.signal);
            
            const responseData = response.data.data || response.data;
            
            console.log('🔍 [ChatWidget] Backend response:', {
                status: responseData.status,
                messageId: responseData.messageId,
                hasResponse: !!responseData.response
            });

            if (responseData.sessionId && responseData.sessionId !== currentSessionId) {
                setCurrentSessionId(responseData.sessionId);
                if (isExpanded) fetchSessions();
            }

            const botMessageTempId = Date.now() + 1;
            const botMessage = {
                id: botMessageTempId,
                text: responseData.response,
                sender: 'bot',
                isPending: responseData.status === 'pending'
            };
            setMessages(prev => [...prev, botMessage]);

            if (responseData.status === 'pending' && responseData.messageId) {
                console.log('🔍 [ChatWidget] Starting polling for pending message');
                pollMessageStatus(responseData.messageId, botMessageTempId);
            } else {
                console.log('🔍 [ChatWidget] Message completed immediately');
                setIsLoading(false);
            }
        } catch (error) {
            if (error.name === 'CanceledError' || error.message === 'canceled') {
                console.log('Request was cancelled by user');
            } else {
                console.error('Failed to send message:', error);
                const errorMessage = {
                    id: Date.now() + 1,
                    text: t('chat.error'),
                    sender: 'bot',
                    isError: true
                };
                setMessages(prev => [...prev, errorMessage]);
            }
            setIsLoading(false);
        } finally {
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

    const handleVoiceInput = async () => {
        if (!browserSupportsSpeechRecognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (listening) {
            // Stop recording
            try {
                SpeechRecognition.stopListening();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        } else {
            // Start recording with selected language - continuous mode
            try {
                // Request microphone permission first
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                resetTranscript();
                await SpeechRecognition.startListening({ 
                    continuous: true, // Không tự động tắt, người dùng tự ngắt
                    language: voiceLang
                });
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    alert('Microphone access denied. Please allow microphone access in your browser settings.');
                } else if (error.name === 'NotFoundError') {
                    alert('No microphone found. Please connect a microphone and try again.');
                } else if (error.name === 'NotSupportedError') {
                    alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
                } else {
                    alert('Failed to start voice input. Please try again.');
                }
            }
        }
    };

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
                text: t('chat.editError'),
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
                            {showSearchResults ? (
                                <div className="search-results-container">
                                    <div className="search-header">
                                        <h3 className="search-title">{t('chat.search')}</h3>
                                        <div className="search-bar-container">
                                            <IoSearch className="search-icon" />
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder={t('chat.searchPlaceholder')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    className="search-clear-btn"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                        setShowSearchResults(false);
                                                    }}
                                                >
                                                    <IoClose size={16} />
                                                </button>
                                            )}
                                        </div>
                                        {searchQuery && (
                                            <div className="search-results-count">
                                                {isSearching ? (
                                                    <div className="spinner-small"></div>
                                                ) : (
                                                    `${searchResults.length} ${t('chat.searchResults')} "${searchQuery}"`
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="search-results-list">
                                        {isSearching && searchResults.length === 0 ? (
                                            <div className="search-loading">
                                                <div className="spinner-small"></div>
                                            </div>
                                        ) : searchResults.length === 0 && searchQuery ? (
                                            <div className="search-empty">
                                                {t('chat.noResults')}
                                            </div>
                                        ) : (
                                            searchResults.map(result => (
                                                <div
                                                    key={result._id}
                                                    className="search-result-item"
                                                    onClick={() => handleSearchResultClick(result._id)}
                                                >
                                                    <div className="search-result-title">{result.title || t('chat.newChat')}</div>
                                                    <div className="search-result-preview">{result.preview || result.lastMessage || ''}</div>
                                                    <div className="search-result-date">{formatDate(result.updatedAt)}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="search-bar-wrapper">
                                        <div className="search-bar-container">
                                            <IoSearch className="search-icon" />
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder={t('chat.searchPlaceholder')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onFocus={() => {
                                                    if (searchQuery) {
                                                        setShowSearchResults(true);
                                                    }
                                                }}
                                            />
                                            {searchQuery && (
                                                <button
                                                    className="search-clear-btn"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                        setShowSearchResults(false);
                                                    }}
                                                >
                                                    <IoClose size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="session-list">
                                {sessionsLoading && sessions.length === 0 && (
                                    <div className="session-loading-spinner">
                                        <div className="spinner"></div>
                                    </div>
                                )}

                                {!sessionsLoading && sessions.length === 0 && (
                                    <div className="session-empty-text">
                                        {t('chat.noConversations')}
                                    </div>
                                )}

                                {sessions.map(session => (
                                    <div
                                        key={session._id}
                                        className={`session-item ${currentSessionId === session._id ? 'active' : ''} ${loadingSessionId === session._id ? 'loading' : ''}`}
                                        onClick={() => handleSessionClick(session._id)}
                                    >
                                        {loadingSessionId === session._id ? (
                                            <div className="session-item-loading">
                                                <span className="session-title">{session.title || t('chat.newChat')}</span>
                                                <div className="spinner-small"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <span 
                                                    className="session-title"
                                                    onMouseEnter={(e) => {
                                                        const title = session.title || t('chat.newChat');
                                                        const span = e.currentTarget;
                                                        // Check if text is actually truncated by comparing scrollWidth and clientWidth
                                                        const isOverflowing = span.scrollWidth > span.clientWidth;
                                                        
                                                        // Show tooltip if title is truncated
                                                        if (title && isOverflowing) {
                                                            const rect = span.getBoundingClientRect();
                                                            setHoveredSessionTitle(title);
                                                            setTooltipPosition({
                                                                x: rect.right + 8,
                                                                y: rect.top + rect.height / 2
                                                            });
                                                        }
                                                    }}
                                                    onMouseMove={(e) => {
                                                        // Update position on mouse move to keep tooltip aligned
                                                        if (hoveredSessionTitle) {
                                                            const span = e.currentTarget;
                                                            const rect = span.getBoundingClientRect();
                                                            setTooltipPosition({
                                                                x: rect.right + 8,
                                                                y: rect.top + rect.height / 2
                                                            });
                                                        }
                                                    }}
                                                    onMouseLeave={() => {
                                                        setHoveredSessionTitle(null);
                                                    }}
                                                >
                                                    {session.title || t('chat.newChat')}
                                                </span>
                                                <button
                                                    className={`session-menu-btn ${activeMenuSessionId === session._id ? 'active' : ''}`}
                                                    onClick={(e) => handleMenuClick(e, session._id)}
                                                >
                                                    <IoEllipsisHorizontal size={16} />
                                                </button>
                                                {activeMenuSessionId === session._id && (
                                                    <div className="session-menu-dropdown" ref={menuRef}>
                                                        <div className="menu-item" onClick={(e) => handleRenameClick(e, session)}>
                                                            <IoPencil size={14} /> {t('chat.rename')}
                                                        </div>
                                                        <div className="menu-item delete" onClick={(e) => handleDeleteClick(e, session._id)}>
                                                            <IoTrashOutline size={14} /> {t('chat.delete')}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}

                                {sessionsLoading && sessions.length > 0 && (
                                    <div className="session-loading-inline">
                                        <div className="spinner-small"></div>
                                    </div>
                                )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="chat-main">
                        <div className={`chat-header ${isExpanded ? 'expanded-header' : ''}`}>
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
                                    <h1 className="welcome-title">{t('chat.welcomeTitle')}</h1>
                                    <div className="suggestion-chips">
                                        {isExpanded ? (
                                            <>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Help me understand a concept")}
                                                >
                                                    <span className="chip-icon">💡</span>
                                                    <span>{t('chat.explainConcept')}</span>
                                                </button>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Help me solve this problem:")}
                                                >
                                                    <span className="chip-icon">🎯</span>
                                                    <span>{t('chat.solveProblem')}</span>
                                                </button>
                                                <button 
                                                    className="suggestion-chip"
                                                    onClick={() => setInputText("Give me ideas for")}
                                                >
                                                    <span className="chip-icon">🚀</span>
                                                    <span>{t('chat.brainstormIdeas')}</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className="suggestion-chip"
                                                onClick={() => setInputText("Help me solve this problem:")}
                                            >
                                                <span className="chip-icon">🎯</span>
                                                <span>{t('chat.solveProblem')}</span>
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
                                                            {t('chat.cancel')}
                                                        </button>
                                                        <button
                                                            className="edit-submit-btn"
                                                            onClick={() => handleSubmitEdit(msg.id)}
                                                            disabled={!editText.trim()}
                                                        >
                                                            {t('chat.update')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="message-text">
                                                    {msg.sender === 'bot' ? (
                                                        <>
                                                            <MathJaxContent content={msg.text} enableMarkdown={true} />
                                                            {msg.isPending && (
                                                                <div className="pending-indicator" style={{ marginTop: '8px', fontSize: '0.85em', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div className="spinner-small"></div>
                                                                    <span>{t('chat.processing') || 'Đang xử lý...'}</span>
                                                                </div>
                                                            )}
                                                        </>
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
                                            title={t('chat.copy')}
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
                                                title={t('chat.copy')}
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
                                                title={t('chat.edit')}
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
                                <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach files">
                                    <IoAttach size={24} />
                                </button>
                                <button type="button" className="attach-btn" onClick={() => imageInputRef.current?.click()} title="Upload images">
                                    <IoImage size={24} />
                                </button>
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
                                        placeholder={t('chat.askSomething')}
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
                                <input
                                    type="file"
                                    ref={imageInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    multiple
                                />
                                {isLoading || (inputText.trim() || selectedFiles.length > 0) && !listening ? (
                                    <button 
                                        type="submit" 
                                        className="send-btn" 
                                        disabled={!isLoading && (!inputText.trim() && selectedFiles.length === 0)}
                                    >
                                        {isLoading ? <IoStopCircleOutline /> : <IoArrowUp />}
                                    </button>
                                ) : browserSupportsSpeechRecognition ? (
                                    <>
                                        {!inputText.trim() && !selectedFiles.length && (
                                            <div className="lang-selector-wrapper" ref={langMenuRef}>
                                                <button 
                                                    type="button" 
                                                    className="lang-btn" 
                                                    onClick={() => setShowLangMenu(!showLangMenu)}
                                                    title={`Voice language: ${supportedLanguages.find(l => l.code === voiceLang)?.name || 'Tiếng Việt'}`}
                                                >
                                                    {supportedLanguages.find(l => l.code === voiceLang)?.flag || '🇻🇳'}
                                                </button>
                                                {showLangMenu && (
                                                    <div className="lang-menu">
                                                        {supportedLanguages.map(lang => (
                                                            <button
                                                                key={lang.code}
                                                                type="button"
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
                                        )}
                                        <button 
                                            type="button" 
                                            className={`send-btn voice-btn ${listening ? 'recording' : ''}`}
                                            onClick={handleVoiceInput}
                                            title={`Voice input (${supportedLanguages.find(l => l.code === voiceLang)?.name || 'Tiếng Việt'})`}
                                        >
                                            <IoMic />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        type="submit" 
                                        className="send-btn" 
                                        disabled={!inputText.trim() && selectedFiles.length === 0}
                                    >
                                        <IoArrowUp />
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

            {deleteModalOpen && (
                <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
                    <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="delete-modal-title">{t('chat.deleteTitle')}</h3>
                        <p className="delete-modal-description">{t('chat.deleteDescription')}</p>
                        <a href="#" className="delete-modal-learn-more" onClick={(e) => e.preventDefault()}>
                            {t('chat.deleteLearnMore')}
                        </a>
                        <div className="delete-modal-actions">
                            <button
                                className="delete-modal-cancel-btn"
                                onClick={handleDeleteCancel}
                                disabled={isDeleting}
                            >
                                {t('chat.cancel')}
                            </button>
                            <button
                                className="delete-modal-confirm-btn"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? t('chat.deleting') : t('chat.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {renameModalOpen && (
                <div className="rename-modal-overlay" onClick={handleRenameCancel}>
                    <div className="rename-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="rename-modal-title">{t('chat.renameTitle')}</h3>
                        <input
                            ref={renameInputRef}
                            type="text"
                            className="rename-modal-input"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameConfirm();
                                }
                            }}
                            autoFocus
                        />
                        <div className="rename-modal-actions">
                            <button
                                className="rename-modal-cancel-btn"
                                onClick={handleRenameCancel}
                                disabled={isRenaming}
                            >
                                {t('chat.cancel')}
                            </button>
                            <button
                                className="rename-modal-confirm-btn"
                                onClick={handleRenameConfirm}
                                disabled={isRenaming || !renameTitle.trim()}
                            >
                                {t('chat.rename')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {hoveredSessionTitle && (
                <div 
                    className="session-title-tooltip"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`
                    }}
                >
                    {hoveredSessionTitle}
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
