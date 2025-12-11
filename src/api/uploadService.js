import axiosClient from './axios';

const uploadService = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axiosClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },
};

export default uploadService;
