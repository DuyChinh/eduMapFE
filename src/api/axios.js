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
    // Ưu tiên dùng ACCESS_TOKEN, fallback về TOKEN (backward compatibility)
    let token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || 
               localStorage.getItem(STORAGE_KEYS.TOKEN);

    // If not found, try to get from persist storage
    if (!token) {
      try {
        const persistData = localStorage.getItem('auth-storage');
        if (persistData) {
          const parsed = JSON.parse(persistData);
          token = parsed.state?.accessToken || parsed.state?.token;
        }
      } catch (error) {
        // Ignore invalid persisted storage in production
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

// Response interceptor - Handle errors globally and auto-refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Nếu là 401 và chưa retry, thử refresh token
      if (status === 401 && !originalRequest._retry) {
        // Nếu đang refresh, đợi
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Gọi refresh token
          const newAccessToken = await useAuthStore.getState().refreshAccessToken();
          
          // Retry request ban đầu với token mới
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Refresh thất bại → logout
          processQueue(refreshError, null);
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Nếu là 401 nhưng đã retry hoặc không có refresh token → logout
      if (status === 401) {
        useAuthStore.getState().logout();
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