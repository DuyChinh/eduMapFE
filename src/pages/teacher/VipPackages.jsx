import React, { useState } from 'react';
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
    const { user, fetchProfile } = useAuthStore();
    const [sePayModalVisible, setSePayModalVisible] = useState(false);
    const [transactionData, setTransactionData] = useState(null);
    const [methodModalVisible, setMethodModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);

    // Get current plan tier from user subscription
    const getCurrentPlanTier = () => {
        const plan = user?.subscription?.plan?.toLowerCase();
        console.log('Current subscription plan:', plan); // Debug log
        if (plan === 'pro') return 2;
        if (plan === 'plus') return 1;
        return 0; // free or undefined
    };

    const currentPlanTier = getCurrentPlanTier();

    const handlePaymentSuccess = async () => {
        // Refresh user profile to get updated subscription
        try {
            await fetchProfile();
        } catch (error) {
            console.error("Failed to refresh profile", error);
        }
    };

    const getPackageStatus = (tier) => {
        const isCurrent = currentPlanTier === tier;
        // Disable current plan and lower plans (prevent downgrade)
        const isDisabled = isCurrent || currentPlanTier > tier;
        return { isCurrent, isDisabled };
    };

    // Get config from env
    const PLUS_PRICE = Number(import.meta.env.VITE_VIP_PLUS_PRICE || 10000);
    const PLUS_DISCOUNT = Number(import.meta.env.VITE_VIP_PLUS_DISCOUNT || 70);
    const PRO_PRICE = Number(import.meta.env.VITE_VIP_PRO_PRICE || 20000);
    const PRO_DISCOUNT = Number(import.meta.env.VITE_VIP_PRO_DISCOUNT || 80);

    const calculateOriginalPrice = (price, discountPercent) => {
        if (!discountPercent) return null;
        return Math.round(price / (1 - (discountPercent / 100)));
    };

    const packages = [
        {
            title: t('vip.plans.free.title'),
            price: 0,
            originalPrice: null,
            discount: null,
            period: t('vip.month'),
            icon: <SmileOutlined style={{ fontSize: '48px', color: '#6b7280' }} />,
            features: t('vip.plans.free.features', { returnObjects: true }),
            buttonText: t('vip.plans.free.title'),
            tier: 0,
            color: '#6b7280'
        },
        {
            title: t('vip.plans.plus.title'),
            price: PLUS_PRICE,
            originalPrice: calculateOriginalPrice(PLUS_PRICE, PLUS_DISCOUNT),
            discount: `-${PLUS_DISCOUNT}%`,
            period: t('vip.month'),
            icon: <ThunderboltOutlined style={{ fontSize: '48px', color: '#3b82f6' }} />,
            features: t('vip.plans.plus.features', { returnObjects: true }),
            buttonText: t('vip.upgradeNow'),
            recommend: true,
            color: '#3b82f6',
            orderType: 'billpayment',
            tier: 1
        },
        {
            title: t('vip.plans.pro.title'),
            price: PRO_PRICE,
            originalPrice: calculateOriginalPrice(PRO_PRICE, PRO_DISCOUNT),
            discount: `-${PRO_DISCOUNT}%`,
            period: t('vip.month'),
            icon: <CrownOutlined style={{ fontSize: '48px', color: '#f59e0b' }} />,
            features: t('vip.plans.pro.features', { returnObjects: true }),
            buttonText: t('vip.goPro'),
            color: '#f59e0b',
            orderType: 'billpayment',
            tier: 2
        }
    ].map(pkg => ({
        ...pkg,
        ...getPackageStatus(pkg.tier)
    }));

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
                            className={`vip-card ${pkg.isCurrent ? 'vip-card-current' : ''}`}
                            style={{
                                '--hover-color': pkg.color,
                                // Only set inline styles if it IS the current plan (to keep the gradient/highlight)
                                // Otherwise, let CSS handle it (for dark mode support)
                                ...(pkg.isCurrent ? {
                                    borderColor: pkg.color,
                                    borderWidth: '2px',
                                    background: `linear-gradient(135deg, ${pkg.color}15 0%, ${pkg.color}08 100%)`,
                                    boxShadow: `0 4px 20px ${pkg.color}30`
                                } : {})
                            }}
                        >
                            {pkg.recommend && (
                                <Tag color="gold" style={{ position: 'absolute', top: 12, right: 12, borderRadius: '12px' }}>
                                    {t('vip.bestValue')}
                                </Tag>
                            )}

                            {pkg.discount && (
                                <div className="vip-discount-badge">
                                    {pkg.discount}
                                </div>
                            )}

                            <div style={{ margin: '24px 0' }}>
                                {pkg.icon}
                            </div>

                            <Title level={3} style={{ marginBottom: 0 }}>{pkg.title}</Title>

                            <div style={{ margin: '16px 0' }}>
                                <Text strong style={{ fontSize: '32px', display: 'block', lineHeight: '1.2' }}>
                                    {pkg.price.toLocaleString('vi-VN')} VND
                                </Text>
                                {pkg.originalPrice && (
                                    <Text delete type="secondary" style={{ fontSize: '18px', display: 'block', marginTop: '4px', color: '#9ca3af' }}>
                                        {pkg.originalPrice.toLocaleString('vi-VN')} VND
                                    </Text>
                                )}
                                <Text type="secondary" style={{ display: 'block', marginTop: '4px' }}>{pkg.period}</Text>
                            </div>



                            <Button
                                type="primary"
                                size="large"
                                block
                                style={{
                                    backgroundColor: pkg.isDisabled ? '#e5e7eb' : pkg.color,
                                    color: pkg.isDisabled ? '#6b7280' : '#fff',
                                    borderColor: pkg.isDisabled ? '#d1d5db' : pkg.color,
                                    height: '48px',
                                    borderRadius: '24px',
                                    marginBottom: '24px',
                                    fontWeight: '600',
                                    cursor: pkg.isDisabled ? 'not-allowed' : 'pointer'
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
