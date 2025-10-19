import axiosInstance from './axios';

/**
 * Question Service
 * Handles all question-related API calls
 */
const questionService = {
  /**
   * Get list of questions with filters
   * @param {Object} params - Query parameters
   * @returns {Promise} Response with paginated questions
   */
  getQuestions: async (params = {}) => {
    return await axiosInstance.get('/questions', { params });
  },

  /**
   * Get question details by ID
   * @param {string} questionId - Question ID
   * @returns {Promise} Response with question details
   */
  getQuestionById: async (questionId) => {
    return await axiosInstance.get(`/questions/${questionId}`);
  },

  /**
   * Create a new question
   * @param {Object} questionData - Question data
   * @returns {Promise} Response with created question
   */
  createQuestion: async (questionData) => {
    return await axiosInstance.post('/questions', questionData);
  },

  /**
   * Update a question
   * @param {string} questionId - Question ID
   * @param {Object} updateData - Update data
   * @returns {Promise} Response with updated question
   */
  updateQuestion: async (questionId, updateData) => {
    return await axiosInstance.put(`/questions/${questionId}`, updateData);
  },

  /**
   * Delete a question
   * @param {string} questionId - Question ID
   * @returns {Promise} Response with deleted question
   */
  deleteQuestion: async (questionId) => {
    return await axiosInstance.delete(`/questions/${questionId}`);
  },

  /**
   * Get list of subjects
   * @param {Object} params - Query parameters including lang
   * @returns {Promise} Response with subjects list
   */
  getSubjects: async (params = {}) => {
    return await axiosInstance.get('/subjects', { params });
  },
};

export default questionService;
