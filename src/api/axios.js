import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

import useAuthStore from '../store/authStore';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Try to get token from multiple sources
    let token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    // If not found, try to get from persist storage
    if (!token) {
      try {
        const persistData = localStorage.getItem('auth-storage');
        if (persistData) {
          const parsed = JSON.parse(persistData);
          token = parsed.state?.token;
        }
      } catch (error) {
        console.warn('Failed to parse persist storage:', error);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Let the component handle the error
        // localStorage.removeItem(STORAGE_KEYS.TOKEN);
        // localStorage.removeItem(STORAGE_KEYS.USER);
        // localStorage.removeItem('auth-storage'); // Clear persist storage
        useAuthStore.getState().logout();
        console.warn('⚠️ 401 Unauthorized - Token cleared');
      }

      // Extract error message from different possible formats
      let errorMessage = 'Có lỗi xảy ra';

      if (data) {
        // Handle different error response formats
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.details) {
          errorMessage = data.details;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors[0];
        }
      }

      console.error('API Error:', { status, data, errorMessage });
      // Reject with error object to preserve status and data
      const errorObj = new Error(errorMessage);
      errorObj.status = status;
      errorObj.data = data;
      errorObj.response = error.response; // Preserve original response
      return Promise.reject(errorObj);
    } else if (error.request) {
      return Promise.reject('Không thể kết nối đến server');
    } else {
      return Promise.reject(error.message || 'Có lỗi xảy ra');
    }
  }
);

export default axiosInstance;