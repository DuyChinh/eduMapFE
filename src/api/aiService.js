import axiosClient from "./axios";

const aiService = {
    chat: (data) => {
        return axiosClient.post("/ai/chat", data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getSessions: () => {
        return axiosClient.get("/ai/sessions");
    },

    getSessionHistory: (sessionId) => {
        return axiosClient.get(`/ai/history/${sessionId}`);
    },

    createSession: () => {
        return axiosClient.post("/ai/sessions");
    },

    deleteSession: (sessionId) => {
        return axiosClient.delete(`/ai/sessions/${sessionId}`);
    },

    renameSession: (sessionId, title) => {
        return axiosClient.patch(`/ai/sessions/${sessionId}`, { title });
    },

    togglePinSession: (sessionId) => {
        return axiosClient.patch(`/ai/sessions/${sessionId}/toggle-pin`);
    },

    editMessage: (messageId, message) => {
        return axiosClient.put(`/ai/message/${messageId}`, { message });
    },

    analyzeClassWeakness: (data) => {
        return axiosClient.post("/ai/analyze/class", data);
    },

    analyzeStudentWeakness: (data) => {
        return axiosClient.post("/ai/analyze/student", data);
    }
};

export default aiService;
