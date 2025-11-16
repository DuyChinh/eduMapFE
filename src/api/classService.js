import axiosInstance from './axios';

/**
 * Class Service
 * Handles all class-related API calls
 */
const classService = {
  /**
   * Create a new class
   * @param {Object} classData - { name, academicYear?, teacherId? }
   * @returns {Promise} Response with class data
   */
  createClass: async (classData) => {
    return await axiosInstance.post('/classes', classData);
  },

  /**
   * Get list of classes with filters
   * @param {Object} params - { q?, teacherId?, teacherEmail?, page?, limit?, sort? }
   * @returns {Promise} Response with paginated classes
   */
  getClasses: async (params = {}) => {
    return await axiosInstance.get('/classes', { params });
  },

  /**
   * Search classes by name (optimized for search)
   * @param {string} query - Search query (minimum 2 characters)
   * @param {string} teacherEmail - Teacher email to filter results
   * @returns {Promise} Response with search results
   */
  searchClasses: async (query, teacherEmail = null) => {
    if (!query || query.length < 2) {
      return { items: [], total: 0 };
    }
    const params = { q: query };
    if (teacherEmail) {
      params.teacher_email = teacherEmail;
    }
    return await axiosInstance.get('/classes/search', { params });
  },

  /**
   * Get my classes (teacher or student)
   * @returns {Promise} Response with user's classes
   */
  getMyClasses: async () => {
    return await axiosInstance.get('/classes/mine');
  },

  /**
   * Get class details by ID
   * @param {string} classId - Class ID
   * @returns {Promise} Response with class details
   */
  getClassById: async (classId) => {
    return await axiosInstance.get(`/classes/${classId}`);
  },

  /**
   * Update class information
   * @param {string} classId - Class ID
   * @param {Object} updateData - { name?, settings?, metadata? }
   * @returns {Promise} Response with updated class
   */
  updateClass: async (classId, updateData) => {
    return await axiosInstance.patch(`/classes/${classId}`, updateData);
  },

  /**
   * Delete a class
   * @param {string} classId - Class ID
   * @returns {Promise} Response with deleted class
   */
  deleteClass: async (classId) => {
    return await axiosInstance.delete(`/classes/${classId}`);
  },

  /**
   * Add multiple students to class
   * @param {string} classId - Class ID
   * @param {Object} studentData - { studentIds?, studentEmails? }
   * @returns {Promise} Response with updated class and report
   */
  addStudentsBulk: async (classId, studentData) => {
    return await axiosInstance.post(`/classes/${classId}/students/bulk`, studentData);
  },

  /**
   * Join class by code (for students)
   * @param {Object} joinData - { code }
   * @returns {Promise} Response with class information
   */
  joinClassByCode: async (joinData) => {
    return await axiosInstance.post('/classes/join', joinData);
  },

  /**
   * Regenerate class code
   * @param {string} classId - Class ID
   * @returns {Promise} Response with updated class
   */
  regenerateClassCode: async (classId) => {
    return await axiosInstance.post(`/classes/${classId}/regenerate-code`);
  },

  /**
   * Remove students from class
   * @param {string} classId - Class ID
   * @param {Object} studentData - { studentIds?, studentEmails? }
   * @returns {Promise} Response with updated class and report
   */
  removeStudents: async (classId, studentData) => {
    return await axiosInstance.delete(`/classes/${classId}/students`, { data: studentData });
  },
};

export default classService;