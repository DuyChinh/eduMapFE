import React, { useEffect, useState } from 'react';
import { Modal, Typography, Space, Spin, Button, message, Steps, Tag } from 'antd';
import { CheckCircleOutlined, CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { getSocket } from '../../services/socketService';
import { useTranslation } from 'react-i18next';
import sepayConfig from '../../config/sepay';

const { Title, Text, Paragraph } = Typography;

const SePayPaymentModal = ({ visible, onClose, transactionData, onSuccess }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState('pending'); // pending, success
    const [loading, setLoading] = useState(false);

    const prevTxnRef = React.useRef(null);

    useEffect(() => {
        if (visible && transactionData) {
            // Only reset status if it's a new transaction
            if (prevTxnRef.current !== transactionData.txnRef) {
                setStatus('pending');
                prevTxnRef.current = transactionData.txnRef;
            }

            // Listen for socket event
            const socket = getSocket();

            if (socket) {
                const handlePaymentUpdate = (data) => {
                    if (data.txnRef === transactionData.txnRef && data.status === 'SUCCESS') {
                        setStatus('success');
                        message.success(t('payment.paymentSuccess'));
                        if (onSuccess) onSuccess();
                    }
                };

                socket.on('PAYMENT_UPDATE', handlePaymentUpdate);

                return () => {
                    socket.off('PAYMENT_UPDATE', handlePaymentUpdate);
                };
            }
        }
    }, [visible, transactionData, onSuccess, t]);

    if (!transactionData) return null;

    const { amount, orderInfo, txnRef } = transactionData;
    // Bank config
    // const qrUrl = `https://qr.sepay.vn/img?acc=VQRQAGEDK0170&bank=MBBank&amount=${amount}&des=${encodeURIComponent(orderInfo)}`;
    const qrUrl = `https://qr.sepay.vn/img?acc=${sepayConfig.bankAccount}&bank=${sepayConfig.bankName}&amount=${amount}&des=${encodeURIComponent(orderInfo)}`;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        message.success(t('payment.bankConfig.copy'));
    };

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            centered
            maskClosable={false}
            zIndex={2000}
        >
            <div style={{ textAlign: 'center', padding: '20px' }}>
                {status === 'success' ? (
                    <Space direction="vertical" size="large" style={{ padding: '20px 0' }}>
                        <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                        <Title level={3}>{t('payment.paymentSuccess')}</Title>
                        <Text type="secondary" style={{ fontSize: '16px' }}>
                            {t('payment.thankYou')} <br />
                            {t('payment.vipActivated')}
                        </Text>

                        <div style={{ marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <Button
                                type="primary"
                                size="large"
                                onClick={onClose}
                                style={{ minWidth: '160px', borderRadius: '8px' }}
                            >
                                {t('payment.experienceNow')}
                            </Button>
                            <Button
                                size="large"
                                onClick={onClose}
                                style={{ minWidth: '100px', borderRadius: '8px' }}
                            >
                                {t('payment.close')}
                            </Button>
                        </div>
                    </Space>
                ) : (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={3}>{t('payment.bankConfig.title')}</Title>
                        <Text type="secondary">{t('payment.bankConfig.instruction')}</Text>

                        <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                            <img src={qrUrl} alt="QR Code Payment" style={{ width: '100%', maxWidth: '300px', borderRadius: '8px' }} />
                        </div>

                        <div style={{ textAlign: 'left', marginTop: '10px' }}>
                            <Paragraph>
                                <Text strong>{t('payment.bankConfig.bank')}:</Text> {sepayConfig.bankName}
                            </Paragraph>
                            <Paragraph>
                                <Text strong>{t('payment.bankConfig.accountOwner')}:</Text> {sepayConfig.accountName}
                            </Paragraph>
                            <Paragraph>
                                <Text strong>{t('payment.bankConfig.accountNumber')}:</Text> {' '}
                                <Text copyable={{ text: sepayConfig.bankAccount }}>{sepayConfig.bankAccount}</Text>
                            </Paragraph>
                            <Paragraph>
                                <Text strong>{t('payment.bankConfig.amount')}:</Text> {' '}
                                <Text type="danger" strong>{amount.toLocaleString('vi-VN')} VND</Text>
                            </Paragraph>
                            <Paragraph>
                                <Text strong>{t('payment.bankConfig.content')}:</Text>{' '}
                                <Tag color="blue" style={{ fontSize: '16px', padding: '5px 10px' }}>
                                    {orderInfo}
                                </Tag>
                                <Button type="text" icon={<CopyOutlined />} onClick={() => handleCopy(orderInfo)} />
                            </Paragraph>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <Spin tip={t('payment.paymentPending')} />
                        </div>
                    </Space>
                )}
            </div>
        </Modal>
    );
};

export default SePayPaymentModal;
