import axiosInstance from './axios';

/**
 * Class Service
 * Handles all class related API calls
 */
const classService = {
  /**
   * Join class by code (Student)
   * @param {string} code - Class code
   * @returns {Promise} Class data
   */
  joinClass: async (code) => {
    return await axiosInstance.post(`/classes/${code}/join`);
  },

  // TODO: Add more class-related endpoints when backend is ready
  // - Create class (Teacher)
  // - Get all classes
  // - Update class
  // - Delete class
  // - Get class members
};

export default classService;

