import axios from './axios';

/**
 * Get class report
 * @param {string} classId - Class ID
 * @param {string} examId - Exam ID (optional)
 * @returns {Promise} - Report data
 */
export const getClassReport = async (classId, examId = null) => {
  const params = examId ? { examId } : {};
  const response = await axios.get(`/reports/class/${classId}`, { params });
  return response.data;
};

/**
 * Export class report as CSV
 * @param {string} classId - Class ID
 * @param {string} examId - Exam ID (optional)
 * @returns {Promise} - CSV blob
 */
export const exportClassReportCSV = async (classId, examId = null) => {
  const params = examId ? { examId } : {};
  const response = await axios.get(`/reports/class/${classId}/export`, {
    params,
    responseType: 'blob'
  });
  return response.data;
};

