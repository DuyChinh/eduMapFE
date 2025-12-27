import axiosInstance from '../api/axios';

const paymentService = {
    createPaymentUrl: async (amount, orderInfo, orderType = 'other') => {
        try {
            const response = await axiosInstance.post('/payment/create_payment_url', {
                amount,
                orderInfo,
                orderType
            });
            return response;
        } catch (error) {
            console.error("Error creating payment URL:", error);
            throw error;
        }
    },

    verifyReturn: async (queryParams) => {
        try {
            const response = await axiosInstance.get('/payment/verify_return', {
                params: queryParams
            });
            return response;
        } catch (error) {
            console.error("Error verifying payment:", error);
            throw error;
        }
    }
};

export default paymentService;
