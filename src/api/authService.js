import axiosInstance from './axios';

/**
 * Authentication Service
 * Handles all authentication related API calls
 */
const authService = {
  /**
   * Login
   * @param {Object} credentials - { email, password }
   * @returns {Promise} Response with user data and token
   */
  login: async (credentials) => {
    return await axiosInstance.post('/auth/login', credentials);
  },

  /**
   * Register
   * @param {Object} userData - { name, email, password, role }
   * @returns {Promise} Response with user data
   */
  register: async (userData) => {
    return await axiosInstance.post('/auth/register', userData);
  },

  /**
   * Forgot Password - Step 1: Send OTP
   * @param {string} email - User email
   * @returns {Promise} Response message
   */
  forgotPassword: async (email) => {
    return await axiosInstance.post('/auth/forgot-password', { email });
  },

  /**
   * Verify OTP - Step 2: Verify OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise} Response with user data
   */
  verifyOTP: async (data) => {
    return await axiosInstance.post('/auth/verify-otp', data);
  },

  /**
   * Reset Password - Step 3: Reset Password
   * @param {Object} data - { email, newPassword }
   * @returns {Promise} Response message
   */
  resetPassword: async (data) => {
    return await axiosInstance.post('/auth/reset-password', data);
  },

  /**
   * Login with Google
   * Redirects to backend Google OAuth endpoint
   */
  loginWithGoogle: () => {
    try {
      // Store current URL for redirect back after OAuth
      const currentUrl = window.location.href;
      sessionStorage.setItem('preOAuthUrl', currentUrl);
      
      // Redirect to backend Google OAuth
      const googleAuthUrl = `${axiosInstance.defaults.baseURL}/auth/google`;
      console.log('Redirecting to Google OAuth:', googleAuthUrl);
      
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Error initiating Google login:', error);
      throw new Error('Failed to initiate Google login');
    }
  },

  /**
   * Handle Google OAuth callback
   * Called when user returns from Google OAuth
   */
  handleGoogleCallback: async (code, state) => {
    try {
      // Backend callback endpoint is GET, not POST
      const response = await axiosInstance.get('/auth/google/callback', {
        params: { code, state }
      });
      return response.data;
    } catch (error) {
      console.error('Google callback error:', error);
      throw error;
    }
  },
};

export default authService;

