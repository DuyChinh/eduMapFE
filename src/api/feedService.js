import axiosClient from './axios';

const feedService = {
    getPosts: (classId, params) => {
        return axiosClient.get(`/feed/${classId}`, { params });
    },

    getPost: (postId) => {
        return axiosClient.get(`/feed/posts/${postId}`);
    },

    createPost: (classId, data) => {
        return axiosClient.post(`/feed/${classId}`, data);
    },

    deletePost: (postId) => {
        return axiosClient.delete(`/feed/posts/${postId}`);
    },

    updatePost: (postId, data) => {
        return axiosClient.put(`/feed/posts/${postId}`, data);
    },

    toggleLock: (postId) => {
        return axiosClient.patch(`/feed/posts/${postId}/lock`);
    },

    toggleLike: (postId) => {
        return axiosClient.post(`/feed/posts/${postId}/like`);
    },

    addComment: (postId, data) => {
        return axiosClient.post(`/feed/posts/${postId}/comments`, data);
    },

    deleteComment: (postId, commentId) => {
        return axiosClient.delete(`/feed/posts/${postId}/comments/${commentId}`);
    },

    updateComment: (postId, commentId, data) => {
        return axiosClient.put(`/feed/posts/${postId}/comments/${commentId}`, data);
    }
};

export default feedService;
