import axiosInstance from './axios';

const dashboardService = {
  // Get teacher dashboard statistics
  getTeacherDashboard: async () => {
    return await axiosInstance.get('/dashboard/teacher');
  },

  // Get student dashboard statistics
  getStudentDashboard: async () => {
    return await axiosInstance.get('/dashboard/student');
  },
};

export default dashboardService;

