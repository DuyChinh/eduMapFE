import axiosClient from './axios';

const uploadService = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // axiosClient already returns response.data via interceptor
            // so we just return the response directly
            const response = await axiosClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response; // Already processed by axios interceptor
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },

    deleteImage: async (public_id) => {
        try {
            const response = await axiosClient.delete('/upload', {
                data: { public_id }
            });
            return response;
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    },
};

export default uploadService;
