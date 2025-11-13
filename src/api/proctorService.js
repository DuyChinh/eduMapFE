import axios from './axios';

/**
 * Log a proctoring event
 * @param {string} submissionId - Submission ID
 * @param {string} event - Event type (visibility, fullscreen, beforeunload, etc.)
 * @param {string} severity - Severity level (low, medium, high, critical)
 * @param {Object} meta - Additional metadata
 * @returns {Promise} - Log entry
 */
export const logProctorEvent = async (submissionId, event, severity = 'low', meta = {}) => {
  const response = await axios.post('/proctor/log', {
    submissionId,
    event,
    severity,
    meta
  });
  return response.data;
};

/**
 * Get proctor logs for a submission
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - List of logs
 */
export const getSubmissionLogs = async (submissionId) => {
  const response = await axios.get(`/proctor/submission/${submissionId}`);
  return response.data;
};

/**
 * Get proctor logs for an exam (teacher/admin only)
 * @param {string} examId - Exam ID
 * @returns {Promise} - List of logs
 */
export const getExamLogs = async (examId) => {
  const response = await axios.get(`/proctor/exam/${examId}`);
  return response.data;
};

