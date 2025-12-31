/**
 * Socket.IO client service for real-time notifications
 */

import io from 'socket.io-client';

let socket = null;
let notificationCallbacks = [];
let feedUpdateCallbacks = [];
let typingCallbacks = [];

/**
 * Get the socket instance
 */
export const getSocket = () => socket;

/**
 * Connect to Socket.IO server with authentication
 * @param {string} token - JWT access token
 */
export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  // Get socket URL - use dedicated VITE_SOCKET_URL or derive from API URL
  let socketUrl = import.meta.env.VITE_SOCKET_URL;

  if (!socketUrl) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      try {
        const url = new URL(apiUrl);
        socketUrl = `${url.protocol}//${url.hostname}:${url.port || '3000'}`;
      } catch {
        socketUrl = 'http://localhost:3000';
      }
    } else if (apiUrl) {
      socketUrl = apiUrl.replace(/\/v1\/api$/, '').replace(/\/api$/, '');
    } else {
      socketUrl = 'http://localhost:3000';
    }
  }

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    if (token) {
      socket.emit('authenticate', { token });
    }
  });

  socket.on('NEW_NOTIFICATION', (notification) => {
    notificationCallbacks.forEach(callback => callback(notification));
  });

  socket.on('FEED_UPDATE', (data) => {
    feedUpdateCallbacks.forEach(callback => callback(data));
  });

  socket.on('typing', (data) => {
    typingCallbacks.forEach(callback => callback({ ...data, isTyping: true }));
  });

  socket.on('stop_typing', (data) => {
    typingCallbacks.forEach(callback => callback({ ...data, isTyping: false }));
  });

  return socket;
};

/**
 * Disconnect from Socket.IO server
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    notificationCallbacks = [];
    feedUpdateCallbacks = [];
    typingCallbacks = [];
  }
};

/**
 * Register a callback for new notifications
 * @param {Function} callback - Function to call when notification received
 * @returns {Function} Unsubscribe function
 */
export const onNotification = (callback) => {
  notificationCallbacks.push(callback);

  return () => {
    const index = notificationCallbacks.indexOf(callback);
    if (index > -1) {
      notificationCallbacks.splice(index, 1);
    }
  };
};

/**
 * Register a callback for feed updates (new posts/comments)
 * @param {Function} callback - Function to call when feed update received
 * @returns {Function} Unsubscribe function
 */
export const onFeedUpdate = (callback) => {
  feedUpdateCallbacks.push(callback);

  return () => {
    const index = feedUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      feedUpdateCallbacks.splice(index, 1);
    }
  };
};

/**
 * Join a class room to receive feed updates
 * @param {string} classId - Class ID to join
 */
export const joinClassRoom = (classId) => {
  if (socket && classId) {
    socket.emit('join_class', { classId });
  }
};

/**
 * Leave a class room
 * @param {string} classId - Class ID to leave
 */
export const leaveClassRoom = (classId) => {
  if (socket && classId) {
    socket.emit('leave_class', { classId });
  }
};

/**
 * Emit typing status
 * @param {string} classId - Class ID
 * @param {string} postId - Post ID
 * @param {object} user - User info
 */
export const emitTyping = (classId, postId, user) => {
  if (socket && classId) {
    socket.emit('typing', { classId, postId, user });
  }
};

/**
 * Emit stop typing status
 * @param {string} classId - Class ID
 * @param {string} postId - Post ID
 * @param {object} user - User info
 */
export const emitStopTyping = (classId, postId, user) => {
  if (socket && classId) {
    socket.emit('stop_typing', { classId, postId, user });
  }
};

/**
 * Register a callback for typing status
 * @param {Function} callback - Function to call when typing status changes
 * @returns {Function} Unsubscribe function
 */
export const onTypingStatus = (callback) => {
  typingCallbacks.push(callback);

  return () => {
    const index = typingCallbacks.indexOf(callback);
    if (index > -1) {
      typingCallbacks.splice(index, 1);
    }
  };
};

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  onNotification,
  onFeedUpdate,
  joinClassRoom,
  leaveClassRoom,
  emitTyping,
  emitStopTyping,
  onTypingStatus,
};

