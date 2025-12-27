import React, { useState } from 'react';
import { Button, App } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import paymentService from '../../services/paymentService';

const PaymentButton = ({ amount, orderInfo, label = "Thanh toán qua VNPAY" }) => {
    const [loading, setLoading] = useState(false);
    // Assuming enveloped in App component for message context, if not, use standard message
    // Safest to rely on global App context if available or import message directly if not.
    // Given previous files used App.useApp(), we try that, or fallback to simple alert if context missing.
    // For a simple button, we can just use simple state but let's try to be consistent. 
    // Actually, to avoid hooks error if not under App, let's keep it simple or use static message.

    const handlePayment = async () => {
        try {
            setLoading(true);
            const data = await paymentService.createPaymentUrl(amount, orderInfo);
            if (data && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                alert("Failed to generate payment URL");
            }
        } catch (error) {
            console.error(error);
            alert("Error initiating payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="primary"
            icon={<DollarOutlined />}
            loading={loading}
            onClick={handlePayment}
        >
            {label}
        </Button>
    );
};

export default PaymentButton;
