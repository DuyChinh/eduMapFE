import axiosInstance from './axios';

const mindmapService = {
    create: (data) => axiosInstance.post('/mindmaps', data),
    getAll: () => axiosInstance.get('/mindmaps'),
    getOne: (id) => axiosInstance.get(`/mindmaps/${id}`),
    update: (id, data) => axiosInstance.put(`/mindmaps/${id}`, data),
    delete: (id) => axiosInstance.delete(`/mindmaps/${id}`),
    getTrash: () => axiosInstance.get('/mindmaps/trash'),
    restore: (id) => axiosInstance.put(`/mindmaps/${id}/restore`),
    permanentDelete: (id) => axiosInstance.delete(`/mindmaps/${id}/permanent`),
};

export default mindmapService;
