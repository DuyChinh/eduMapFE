import axiosInstance from './axios';

const examStatsService = {
  // Get exam statistics
  getExamStatistics: async (examId) => {
    return await axiosInstance.get(`/exams/${examId}/statistics`);
  },

  // Get score distribution for chart
  getScoreDistribution: async (examId) => {
    return await axiosInstance.get(`/exams/${examId}/score-distribution`);
  },

  // Get exam leaderboard
  getExamLeaderboard: async (examId, params = {}) => {
    return await axiosInstance.get(`/exams/${examId}/leaderboard`, { params });
  },

  // Get student submissions for an exam
  getStudentSubmissions: async (examId, params = {}) => {
    return await axiosInstance.get(`/exams/${examId}/submissions`, { params });
  },

  // Get specific student submission detail
  getStudentSubmissionDetail: async (examId, studentId) => {
    return await axiosInstance.get(`/exams/${examId}/submissions/${studentId}`);
  },

  // Get student submission history/activity log
  getSubmissionActivityLog: async (examId, studentId) => {
    return await axiosInstance.get(`/exams/${examId}/submissions/${studentId}/activity`);
  },

  // Get all exam results for a student (history)
  getStudentExamResults: async (studentId, params = {}) => {
    return await axiosInstance.get(`/students/${studentId}/exam-results`, { params });
  },

  // Get exam results statistics by subject
  getExamResultsBySubject: async (studentId) => {
    return await axiosInstance.get(`/students/${studentId}/exam-results/by-subject`);
  },

  // Grade/review student submission
  gradeSubmission: async (examId, studentId, gradeData) => {
    return await axiosInstance.post(`/exams/${examId}/submissions/${studentId}/grade`, gradeData);
  },

  // Add comment to student answer
  addAnswerComment: async (examId, studentId, questionId, comment) => {
    return await axiosInstance.post(
      `/exams/${examId}/submissions/${studentId}/questions/${questionId}/comment`,
      { comment }
    );
  },

  // Reset student attempt (allow retake)
  resetStudentAttempt: async (examId, studentId) => {
    return await axiosInstance.delete(`/exams/${examId}/submissions/${studentId}/reset`);
  },
};

export default examStatsService;

