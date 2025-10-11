import axiosInstance from './axios';

/**
 * User Service
 * Handles all user related API calls
 */
const userService = {
  /**
   * Get current user profile
   * @returns {Promise} User profile data
   */
  getProfile: async () => {
    return await axiosInstance.get('/users/profile');
  },

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise} User data
   */
  getUserById: async (userId) => {
    return await axiosInstance.get(`/users/${userId}`);
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - { name, email }
   * @returns {Promise} Updated user data
   */
  updateProfile: async (userId, userData) => {
    return await axiosInstance.put(`/users/${userId}`, userData);
  },

  /**
   * Update user role (Admin only)
   * @param {string} userId - User ID
   * @param {string} role - New role (teacher/student/admin)
   * @returns {Promise} Updated user data
   */
  updateRole: async (userId, role) => {
    return await axiosInstance.patch(`/users/${userId}/role`, { role });
  },

  /**
   * Delete user account
   * @param {string} userId - User ID
   * @returns {Promise} Response message
   */
  deleteAccount: async (userId) => {
    return await axiosInstance.delete(`/users/${userId}`);
  },
};

export default userService;

