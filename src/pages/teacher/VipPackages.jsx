import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, Space, Tag, App, Modal } from 'antd';
import { CrownOutlined, CheckOutlined, ThunderboltOutlined, SmileOutlined, BankOutlined, CreditCardOutlined, HistoryOutlined } from '@ant-design/icons';
import paymentService from '../../services/paymentService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import SePayPaymentModal from '../../components/payment/SePayPaymentModal';
import TransactionHistoryModal from '../../components/payment/TransactionHistoryModal';

import './VipPackages.css';

const { Title, Text } = Typography;

const VipPackages = () => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const { user } = useAuthStore();
    const [sePayModalVisible, setSePayModalVisible] = useState(false);
    const [transactionData, setTransactionData] = useState(null);
    const [methodModalVisible, setMethodModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [currentPlanTier, setCurrentPlanTier] = useState(0); // 0: Free, 1: Plus, 2: Pro

    const fetchPlanStatus = async () => {
        try {
            const res = await paymentService.getHistory();
            const payments = res.data || [];
            const tier = calculateCurrentPlan(payments);
            setCurrentPlanTier(tier);
        } catch (error) {
            console.error("Failed to fetch payment history", error);
        }
    };

    useEffect(() => {
        fetchPlanStatus();
    }, []);

    const handlePaymentSuccess = () => {
        fetchPlanStatus();
    };

    const calculateCurrentPlan = (payments) => {
        const now = new Date();
        const activePayment = payments.find(p => {
            const date = new Date(p.createdAt || p.gatewayPayDate);
            const isValid = p.status === 'SUCCESS' && (now - date) < 30 * 24 * 60 * 60 * 1000;
            return isValid;
        });

        if (!activePayment) return 0; // Free

        if (activePayment.amount >= 20000) return 2; // Pro
        if (activePayment.amount >= 10000) return 1; // Plus
        return 0;
    };

    const getPackageStatus = (tier) => {
        const isCurrent = currentPlanTier === tier;
        // Disable if isCurrent OR if currentTier > tier (prevent downgrade)
        const isDisabled = isCurrent || currentPlanTier > tier;
        return { isCurrent, isDisabled };
    };

    const packages = [
        {
            title: t('vip.plans.free.title'),
            price: 0,
            period: t('vip.month'),
            icon: <SmileOutlined style={{ fontSize: '48px', color: '#6b7280' }} />,
            features: t('vip.plans.free.features', { returnObjects: true }),
            buttonText: t('vip.currentPlan'),
            ...getPackageStatus(0),
            color: '#6b7280'
        },
        {
            title: t('vip.plans.plus.title'),
            price: 10000,
            period: t('vip.month'),
            icon: <ThunderboltOutlined style={{ fontSize: '48px', color: '#3b82f6' }} />,
            features: t('vip.plans.plus.features', { returnObjects: true }),
            buttonText: t('vip.upgradeNow'),
            recommend: true,
            color: '#3b82f6',
            orderType: 'billpayment',
            ...getPackageStatus(1)
        },
        {
            title: t('vip.plans.pro.title'),
            price: 20000,
            period: t('vip.month'),
            icon: <CrownOutlined style={{ fontSize: '48px', color: '#8b5cf6' }} />,
            features: t('vip.plans.pro.features', { returnObjects: true }),
            buttonText: t('vip.goPro'),
            color: '#8b5cf6',
            orderType: 'billpayment',
            ...getPackageStatus(2)
        }
    ];

    const handlePurchaseClick = (pkg) => {
        if (pkg.price === 0) return;
        setSelectedPackage(pkg);
        setMethodModalVisible(true);
    };

    const handleCloseSePay = () => setSePayModalVisible(false);
    const handleCloseHistory = () => setHistoryModalVisible(false);

    const handleVNPayPurchase = async () => {
        if (!selectedPackage) return;
        const pkg = selectedPackage;
        try {
            message.loading({ content: t('vip.messages.loading'), key: 'payment' });
            const orderInfo = t('vip.messages.orderInfo', { plan: pkg.title, user: user?.email || 'User' });
            const data = await paymentService.createPaymentUrl(pkg.price, orderInfo, pkg.orderType);

            if (data && data.paymentUrl) {
                message.success({ content: t('vip.messages.redirecting'), key: 'payment' });
                window.location.href = data.paymentUrl;
            } else {
                message.error({ content: t('vip.messages.createError'), key: 'payment' });
            }
        } catch (error) {
            console.error('Payment Error:', error);
            message.error({ content: t('vip.messages.initError'), key: 'payment' });
        } finally {
            setMethodModalVisible(false);
        }
    };

    const handleSePayPurchase = async () => {
        if (!selectedPackage) return;
        const pkg = selectedPackage;
        try {
            message.loading({ content: t('vip.messages.loading'), key: 'payment' });
            const orderInfo = t('vip.messages.orderInfo', { plan: pkg.title, user: user?.email || 'User' });

            // Create SePay Transaction
            const response = await paymentService.createSePayTransaction(pkg.price, orderInfo);

            // Assuming response structure: { status: 'success', txnRef, amount, orderInfo }
            if (response && response.status === 'success') {
                setTransactionData(response);
                setSePayModalVisible(true);
                setMethodModalVisible(false);
                message.destroy('payment');
            } else {
                message.error({ content: t('vip.messages.createError'), key: 'payment' });
            }
        } catch (error) {
            console.error('SePay Error:', error);
            message.error({ content: t('vip.messages.initError'), key: 'payment' });
        }
    };

    return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
            <Title level={2}>{t('vip.title')}</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>{t('vip.subtitle')}</Text>

            <div style={{ marginTop: '15px' }}>
                <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={() => setHistoryModalVisible(true)}
                >
                    {t('payment.history')}
                </Button>
            </div>

            <Row gutter={[24, 24]} justify="center" style={{ marginTop: '48px' }}>
                {packages.map((pkg, index) => (
                    <Col xs={24} md={8} lg={7} key={index}>
                        <Card
                            hoverable
                            className="vip-card"
                            style={{
                                '--hover-color': pkg.color,
                                borderColor: '#f0f0f0'
                            }}
                        >
                            {pkg.recommend && (
                                <Tag color="gold" style={{ position: 'absolute', top: 12, right: 12, borderRadius: '12px' }}>
                                    {t('vip.bestValue')}
                                </Tag>
                            )}

                            <div style={{ margin: '24px 0' }}>
                                {pkg.icon}
                            </div>

                            <Title level={3} style={{ marginBottom: 0 }}>{pkg.title}</Title>

                            <div style={{ margin: '16px 0' }}>
                                <Text strong style={{ fontSize: '32px' }}>
                                    {pkg.price.toLocaleString('vi-VN')} VND
                                </Text>
                                <Text type="secondary">{pkg.period}</Text>
                            </div>



                            <Button
                                type="primary"
                                size="large"
                                block
                                style={{
                                    backgroundColor: pkg.isCurrent ? '#f3f4f6' : pkg.color,
                                    color: pkg.isCurrent ? '#374151' : '#fff',
                                    borderColor: pkg.isCurrent ? '#d1d5db' : pkg.color,
                                    height: '48px',
                                    borderRadius: '24px',
                                    marginBottom: '24px',
                                    fontWeight: '600'
                                }}
                                onClick={() => handlePurchaseClick(pkg)}
                                disabled={pkg.isDisabled}
                            >
                                {pkg.isCurrent ? t('vip.currentPlan') : pkg.buttonText}
                            </Button>

                            <Space direction="vertical" align="start" style={{ width: '100%' }}>
                                {Array.isArray(pkg.features) && pkg.features.map((feature, idx) => (
                                    <Space key={idx} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                        <CheckOutlined style={{ color: '#10b981' }} />
                                        <Text style={{ textAlign: 'left' }}>{feature}</Text>
                                    </Space>
                                ))}
                            </Space>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Payment Method Selection Modal */}
            <Modal
                title={t('payment.selection.title')}
                open={methodModalVisible}
                onCancel={() => setMethodModalVisible(false)}
                footer={null}
                centered
            >
                <div style={{ padding: '20px 0' }}>
                    <Button
                        size="large"
                        block
                        icon={<CreditCardOutlined />}
                        style={{ marginBottom: '16px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleVNPayPurchase}
                    >
                        {t('payment.selection.vnpay')}
                    </Button>
                    <Button
                        size="large"
                        block
                        icon={<BankOutlined />}
                        style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleSePayPurchase}
                        type="primary"
                    >
                        {t('payment.selection.sepay')}
                    </Button>
                </div>
            </Modal>

            {/* SePay QR Modal */}
            <SePayPaymentModal
                visible={sePayModalVisible}
                onClose={handleCloseSePay}
                transactionData={transactionData}
                onSuccess={handlePaymentSuccess}
            />

            {/* Transaction History Modal */}
            <TransactionHistoryModal
                visible={historyModalVisible}
                onClose={handleCloseHistory}
            />
        </div >
    );
};

export default VipPackages;
