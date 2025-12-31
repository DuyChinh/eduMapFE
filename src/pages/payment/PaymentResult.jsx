import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Result, Spin, App } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import paymentService from '../../services/paymentService';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const PaymentResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [status, setStatus] = useState('loading'); // loading, success, failed
    const [message, setMessage] = useState(t('payment.verifyTransaction'));
    const [code, setCode] = useState(null);

    useEffect(() => {
        const verifyPayment = async () => {
            const queryParams = Object.fromEntries(new URLSearchParams(location.search));

            // Basic check if params exist
            if (queryParams.status === 'success' && queryParams.method === 'sepay') {
                setStatus('success');
                setMessage(t('payment.result.successMessage'));
                return;
            }

            if (!queryParams.vnp_SecureHash) {
                setStatus('failed');
                setMessage(t('payment.result.failedMessage'));
                return;
            }

            try {
                // Call Backend API to verify
                const result = await paymentService.verifyReturn(queryParams);

                if (result.status === 'success') {
                    setStatus('success');
                    setMessage(t('payment.result.successMessage'));
                } else {
                    setStatus('failed');
                    setMessage(result.message || t('payment.result.failedMessage'));
                    setCode(result.code);
                }
            } catch (error) {
                setStatus('failed');
                setMessage(t('payment.result.failedMessage'));
            }
        };

        verifyPayment();
    }, [location, t]);

    return (
        <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ width: 600, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {status === 'loading' ? (
                    <div style={{ padding: '40px 0' }}>
                        <Spin size="large" />
                        <Title level={4} style={{ marginTop: 20 }}>{t('payment.result.loadingTitle')}</Title>
                        <Text type="secondary">{t('payment.result.loadingDesc')}</Text>
                    </div>
                ) : (
                    <Result
                        status={status === 'success' ? 'success' : 'error'}
                        title={status === 'success' ? t('payment.result.successTitle') : t('payment.result.failedTitle')}
                        subTitle={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Text>{message}</Text>
                                {code && <Text type="secondary">Code: {code}</Text>}
                            </div>
                        }
                        extra={[
                            <Button type="primary" key="home" onClick={() => navigate('/')}>
                                {t('payment.result.homeButton')}
                            </Button>,
                            status === 'failed' && (
                                <Button key="retry" onClick={() => navigate('/vip-packages')}>
                                    {t('payment.result.retryButton')}
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
