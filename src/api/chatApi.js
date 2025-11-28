import axiosClient from './axios';

const chatApi = {
    sendMessage: (message, sessionId, files) => {
        const url = '/ai/chat';
        if (files && files.length > 0) {
            const formData = new FormData();
            formData.append('message', message || '');
            if (sessionId) formData.append('sessionId', sessionId);
            // Append each file with the same key 'files'
            files.forEach(file => {
                formData.append('files', file);
            });
            return axiosClient.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return axiosClient.post(url, { message, sessionId });
    },
    getSessionHistory: (sessionId) => {
        const url = `/ai/history/${sessionId}`;
        return axiosClient.get(url);
    },
    getSessions: () => {
        const url = '/ai/sessions';
        return axiosClient.get(url);
    },
    createSession: () => {
        return axiosClient.post('/ai/sessions');
    },
    deleteSession: (sessionId) => {
        return axiosClient.delete(`/ai/sessions/${sessionId}`);
    },
    renameSession: (sessionId, title) => {
        return axiosClient.patch(`/ai/sessions/${sessionId}`, { title });
    }
};

export default chatApi;
