import axiosInstance from './axios';

/**
 * Exam Service
 * Handles all exam-related API calls
 */
const examService = {
  /**
   * Create a new exam
   * @param {Object} examData - Exam data
   * @returns {Promise} Response with created exam
   */
  createExam: async (examData) => {
    return await axiosInstance.post('/exams', examData);
  },

  /**
   * Get list of exams with filters
   * @param {Object} params - Query parameters
   * @returns {Promise} Response with paginated exams
   */
  getExams: async (params = {}) => {
    return await axiosInstance.get('/exams', { params });
  },

  /**
   * Get exam details by ID
   * @param {string} examId - Exam ID
   * @returns {Promise} Response with exam details
   */
  getExamById: async (examId) => {
    return await axiosInstance.get(`/exams/${examId}`);
  },

  /**
   * Update an exam
   * @param {string} examId - Exam ID
   * @param {Object} updateData - Update data
   * @returns {Promise} Response with updated exam
   */
  updateExam: async (examId, updateData) => {
    return await axiosInstance.patch(`/exams/${examId}`, updateData);
  },

  /**
   * Delete an exam
   * @param {string} examId - Exam ID
   * @returns {Promise} Response with deleted exam
   */
  deleteExam: async (examId) => {
    return await axiosInstance.delete(`/exams/${examId}`);
  },

  /**
   * Add questions to an exam
   * @param {string} examId - Exam ID
   * @param {Object} questionData - { questionIds: [], subjectId: string }
   * @returns {Promise} Response with updated exam
   */
  addQuestions: async (examId, questionData) => {
    return await axiosInstance.post(`/exams/${examId}/questions`, questionData);
  },

  /**
   * Remove a question from an exam
   * @param {string} examId - Exam ID
   * @param {string} questionId - Question ID
   * @returns {Promise} Response with updated exam
   */
  removeQuestion: async (examId, questionId) => {
    return await axiosInstance.delete(`/exams/${examId}/questions/${questionId}`);
  },
};

export default examService;

