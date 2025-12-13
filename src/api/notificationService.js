import axiosClient from './axios';

const notificationService = {
    getMyNotifications: (params) => {
        return axiosClient.get('/notifications', { params });
    },

    markAsRead: (id) => {
        return axiosClient.put(`/notifications/${id}/read`);
    },

    markAllAsRead: () => {
        return axiosClient.put('/notifications/read-all');
    }
};

export default notificationService;
