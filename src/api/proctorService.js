import axiosInstance from './axios';
import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

/**
 * Log a proctoring event
 * @param {string} submissionId - Submission ID
 * @param {string} event - Event type (visibility, fullscreen, beforeunload, etc.)
 * @param {string} severity - Severity level (low, medium, high, critical)
 * @param {Object} meta - Additional metadata
 * @returns {Promise} - Log entry
 */
export const logProctorEvent = async (submissionId, event, severity = 'low', meta = {}, imageBlob = null) => {

  let requestData;
  let headers = {};

  if (imageBlob) {
    requestData = new FormData();
    requestData.append('submissionId', submissionId);
    requestData.append('event', event);
    requestData.append('severity', severity);
    requestData.append('meta', JSON.stringify(meta));
    requestData.append('image', imageBlob, 'evidence.jpg');
    // Important: Do NOT set Content-Type header when using fetch with FormData
    // headers['Content-Type'] = undefined; 

    // Use FETCH API to avoid Axios header issues completely
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN);
    const fetchHeaders = {};
    if (token) {
      fetchHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/proctor/log`, {
        method: 'POST',
        headers: fetchHeaders,
        body: requestData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch upload error:", error);
      throw error;
    }
  } else {
    requestData = {
      submissionId,
      event,
      severity,
      meta
    };
    // Use standard instance for JSON
    const response = await axiosInstance.post('/proctor/log', requestData, { headers });
    return response.data;
  }
};

/**
 * Get proctor logs for a submission
 * @param {string} submissionId - Submission ID
 * @returns {Promise} - List of logs
 */
export const getSubmissionLogs = async (submissionId) => {
  const response = await axiosInstance.get(`/proctor/submission/${submissionId}`);
  return response.data;
};

/**
 * Get proctor logs for an exam (teacher/admin only)
 * @param {string} examId - Exam ID
 * @returns {Promise} - List of logs
 */
export const getExamLogs = async (examId) => {
  const response = await axiosInstance.get(`/proctor/exam/${examId}`);
  return response.data;
};

