import api from './axios';

const gradeService = {
  /**
   * Get all grades
   * @returns {Promise<Array>} List of grades with translations
   */
  getGrades: async () => {
    const response = await api.get('/grades');
    return response.data?.data || response.data || [];
  },
};

export default gradeService;
