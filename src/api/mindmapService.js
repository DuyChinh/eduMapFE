import axiosInstance from './axios';

const mindmapService = {
    create: (data) => axiosInstance.post('/mindmaps', data),
    generateWithAI: (prompt, title) => axiosInstance.post('/mindmaps/generate-ai', { prompt, title }, { timeout: 120000 }), // 2 minutes timeout for AI generation
    getAll: () => axiosInstance.get('/mindmaps'),
    getOne: (id) => axiosInstance.get(`/mindmaps/${id}`),
    update: (id, data) => axiosInstance.put(`/mindmaps/${id}`, data),
    delete: (id) => axiosInstance.delete(`/mindmaps/${id}`),
    getTrash: () => axiosInstance.get('/mindmaps/trash'),
    getShared: () => axiosInstance.get('/mindmaps/shared'),
    restore: (id) => axiosInstance.put(`/mindmaps/${id}/restore`),
    permanentDelete: (id) => axiosInstance.delete(`/mindmaps/${id}/permanent`),
    
    // Share APIs
    getShareInfo: (id) => axiosInstance.get(`/mindmaps/${id}/share`),
    share: (id, data) => axiosInstance.post(`/mindmaps/${id}/share`, data),
    unshare: (id, shareUserId) => axiosInstance.delete(`/mindmaps/${id}/share/${shareUserId}`),
    togglePublic: (id, data) => axiosInstance.post(`/mindmaps/${id}/toggle-public`, data),
    getByShareLink: (shareLink) => axiosInstance.get(`/mindmaps/public/${shareLink}`),
    updateByShareLink: (shareLink, data) => axiosInstance.put(`/mindmaps/public/${shareLink}`, data),
};

export default mindmapService;

