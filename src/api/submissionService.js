import axiosInstance from './axios';
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
    // examService returns { ok: true, data: {...} } or just data
    actualExamId = examResponse.data?._id || examResponse._id;
  }

  const response = await axiosInstance.post('/submissions/start', {
    examId: actualExamId,
    password
  });
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Update submission answers (auto-save)
 * @param {string} submissionId - Submission ID
 * @param {Array} answers - Array of answers
 * @returns {Promise} - Updated submission
 */
export const updateSubmissionAnswers = async (submissionId, answers) => {
  const response = await axiosInstance.patch(`/submissions/${submissionId}/answers`, {
    answers
  });
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Submit an exam
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - Graded submission
 */
export const submitExam = async (submissionId) => {
  const response = await axiosInstance.post(`/submissions/${submissionId}/submit`);
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Get submission by ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - Submission data
 */
export const getSubmissionById = async (submissionId) => {
  const response = await axiosInstance.get(`/submissions/${submissionId}`);
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Get all submissions for an exam (teacher/admin only)
 * @param {string} examId - Exam ID
 * @returns {Promise} - List of submissions
 */
export const getExamSubmissions = async (examId) => {
  const response = await axiosInstance.get(`/submissions/exam/${examId}`);
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Get leaderboard for an exam
 * @param {string} examId - Exam ID
 * @returns {Promise} - Leaderboard data
 */
export const getExamLeaderboard = async (examId) => {
  const response = await axiosInstance.get(`/submissions/exam/${examId}/leaderboard`);
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Get current user's submissions
 * @param {Object} params - Query parameters (subject, status, dateRange, etc.)
 * @returns {Promise} - List of user's submissions
 */
export const getMySubmissions = async (params = {}) => {
  const response = await axiosInstance.get('/submissions/me', { params });
  // axiosInstance interceptor already returns response.data
  return response;
};

/**
 * Upload reference face image
 * @param {string} submissionId - Submission ID
 * @param {Blob|File|string} imageFile - The image file or base64 string
 * @returns {Promise} - Result with image URL
 */
export const updateFaceImage = async (submissionId, imageFile) => {
  const formData = new FormData();

  // Convert base64 data URI to Blob if needed
  if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
    const fetchResponse = await fetch(imageFile);
    const blob = await fetchResponse.blob();
    formData.append('image', blob, 'face_capture.jpg');
  } else {
    formData.append('image', imageFile);
  }

  const response = await axiosInstance.post(`/submissions/${submissionId}/face-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

