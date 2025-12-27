import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Result, Spin, App } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import paymentService from '../../services/paymentService'; // Import payment service

const { Title, Text } = Typography;

const PaymentResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Use App hook if available, otherwise fallback/skip. Assuming App is available in context based on previous files.
    // Safeguard: Check if App context exists, else use console/alert logic? 
    // Actually, Antd 5 App component usage: const { message } = App.useApp(); 
    // If not sure, better to stick to basic state for "result page" which doesn't strictly need toast messages.

    const [status, setStatus] = useState('loading'); // loading, success, failed
    const [message, setMessage] = useState('Đang xác thực giao dịch...');
    const [code, setCode] = useState(null);

    useEffect(() => {
        const verifyPayment = async () => {
            const queryParams = Object.fromEntries(new URLSearchParams(location.search));

            // Basic check if params exist
            if (!queryParams.vnp_SecureHash) {
                setStatus('failed');
                setMessage('Không tìm thấy thông tin thanh toán hợp lệ.');
                return;
            }

            try {
                // Call Backend API to verify
                const result = await paymentService.verifyReturn(queryParams);

                if (result.status === 'success') {
                    setStatus('success');
                    setMessage('Giao dịch thành công!');
                } else {
                    setStatus('failed');
                    setMessage(result.message || 'Giao dịch thất bại');
                    setCode(result.code);
                }
            } catch (error) {
                setStatus('failed');
                setMessage('Lỗi kết nối đến server xác thực.');
            }
        };

        verifyPayment();
    }, [location]);

    return (
        <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ width: 600, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {status === 'loading' ? (
                    <div style={{ padding: '40px 0' }}>
                        <Spin size="large" />
                        <Title level={4} style={{ marginTop: 20 }}>Đang xử lý kết quả thanh toán...</Title>
                        <Text type="secondary">Vui lòng không tắt trình duyệt.</Text>
                    </div>
                ) : (
                    <Result
                        status={status === 'success' ? 'success' : 'error'}
                        title={status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán thất bại!'}
                        subTitle={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Text>{message}</Text>
                                {code && <Text type="secondary">Mã lỗi: {code}</Text>}
                            </div>
                        }
                        extra={[
                            <Button type="primary" key="home" onClick={() => navigate('/')}>
                                Về trang chủ
                            </Button>,
                            status === 'failed' && (
                                <Button key="retry" onClick={() => navigate('/vip-packages')}>
                                    Thử lại
                                </Button>
                            )
                        ]}
                    />
                )}
            </Card>
        </div>
    );
};

export default PaymentResult;
