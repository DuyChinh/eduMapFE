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

  /**
   * Export questions to Excel/CSV
   * @param {Object} params - Query parameters (subjectId, type, level, format)
   * @returns {Promise} Blob response
   */
  exportQuestions: async (params = {}) => {
    const format = params.format || 'xlsx';
    const response = await axiosInstance.get('/questions/export', {
      params: { ...params, format },
      responseType: 'blob'
    });
    return response;
  },

  /**
   * Download template file for importing questions
   * @param {string} format - 'xlsx' or 'csv'
   * @returns {Promise} Blob response
   */
  downloadTemplate: async (format = 'xlsx') => {
    const response = await axiosInstance.get('/questions/template', {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  /**
   * Import questions from Excel/CSV file
   * @param {File} file - The file to upload
   * @returns {Promise} Response with import results
   */
  importQuestions: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/questions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response;
  },

  /**
   * Batch rename questions
   * @param {Array} questionIds - List of question IDs
   * @param {string} baseName - Base name for remaining
   * @returns {Promise} Response with results
   */
  batchRename: async (questionIds, baseName) => {
    return await axiosInstance.post('/questions/batch-rename', { questionIds, baseName });
  },

  /**
   * Upload PDF to parse questions
   * @param {File} file - PDF file
   * @returns {Promise} Response with parsed questions
   */
  uploadPdf: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    // Increase timeout for AI processing (5 minutes)
    return await axiosInstance.post('/questions/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000
    });
  },

  /**
   * Batch create questions from parsed data
   * @param {Array} questions - List of questions to create
   * @returns {Promise} Response with creation results
   */
  batchCreateQuestions: async (questions) => {
    return await axiosInstance.post('/questions/batch-create', { questions });
  }
};

export default questionService;
