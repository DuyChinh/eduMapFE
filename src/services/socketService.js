/**
 * Socket.IO client service for real-time notifications
 */
import { io } from 'socket.io-client';

let socket = null;
let notificationCallbacks = [];

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

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  onNotification,
};
