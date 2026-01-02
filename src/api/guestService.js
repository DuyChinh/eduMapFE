import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

// Create a separate axios instance for guest API calls without auth interceptors
const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple response interceptor - just unwrap data
publicAxios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Extract error message
    let errorMessage = 'An error occurred';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    const errorObj = new Error(errorMessage);
    errorObj.status = error.response?.status;
    errorObj.data = error.response?.data;
    return Promise.reject(errorObj);
  }
);

/**
 * Guest API service for exam taking without authentication
 */
const guestService = {
  /**
   * Start a guest submission
   * @param {Object} data - { examId, guestName, password? }
   */
  startSubmission: async (data) => {
    const response = await publicAxios.post('/guest/submissions/start', data);
    return response;
  },

  /**
   * Update guest answers (auto-save)
   * @param {string} submissionId 
   * @param {Array} answers 
   * @param {string} guestName 
   */
  updateAnswers: async (submissionId, answers, guestName) => {
    const response = await publicAxios.patch(`/guest/submissions/${submissionId}/answers`, {
      answers,
      guestName
    });
    return response;
  },

  /**
   * Submit guest exam
   * @param {string} submissionId 
   * @param {string} guestName 
   */
  submitExam: async (submissionId, guestName) => {
    const response = await publicAxios.post(`/guest/submissions/${submissionId}/submit`, {
      guestName
    });
    return response;
  },

  /**
   * Get guest submission result
   * @param {string} submissionId 
   * @param {string} guestName 
   */
  getSubmission: async (submissionId, guestName) => {
    const response = await publicAxios.get(`/guest/submissions/${submissionId}`, {
      params: { guestName }
    });
    return response;
  }
};

export default guestService;
