import axios from './axios';
import examService from './examService';

/**
 * Start a new exam submission
 * @param {string} examId - Exam ID or shareCode
 * @param {string} password - Exam password (optional)
 * @param {boolean} isShareCode - Whether examId is a shareCode
 * @returns {Promise} - Submission data with exam questions
 */
export const startSubmission = async (examId, password = '', isShareCode = false) => {
  let actualExamId = examId;
  
  // If it's a share code, get the exam first
  if (isShareCode) {
    const examResponse = await examService.getExamByShareCode(examId);
    actualExamId = examResponse.data._id;
  }
  
  const response = await axios.post('/submissions/start', {
    examId: actualExamId,
    password
  });
  return response.data;
};

/**
 * Update submission answers (auto-save)
 * @param {string} submissionId - Submission ID
 * @param {Array} answers - Array of answers
 * @returns {Promise} - Updated submission
 */
export const updateSubmissionAnswers = async (submissionId, answers) => {
  const response = await axios.patch(`/submissions/${submissionId}/answers`, {
    answers
  });
  return response.data;
};

/**
 * Submit an exam
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - Graded submission
 */
export const submitExam = async (submissionId) => {
  const response = await axios.post(`/submissions/${submissionId}/submit`);
  return response.data;
};

/**
 * Get submission by ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - Submission data
 */
export const getSubmissionById = async (submissionId) => {
  const response = await axios.get(`/submissions/${submissionId}`);
  return response.data;
};

/**
 * Get all submissions for an exam (teacher/admin only)
 * @param {string} examId - Exam ID
 * @returns {Promise} - List of submissions
 */
export const getExamSubmissions = async (examId) => {
  const response = await axios.get(`/submissions/exam/${examId}`);
  return response.data;
};

/**
 * Get leaderboard for an exam
 * @param {string} examId - Exam ID
 * @returns {Promise} - Leaderboard data
 */
export const getExamLeaderboard = async (examId) => {
  const response = await axios.get(`/submissions/exam/${examId}/leaderboard`);
  return response.data;
};

