import React from 'react';
import { Card, Button, Typography, Row, Col, Space, Tag, App } from 'antd';
import { CrownOutlined, CheckOutlined, ThunderboltOutlined, SmileOutlined } from '@ant-design/icons';
import paymentService from '../../services/paymentService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

import './VipPackages.css';

const { Title, Text } = Typography;

const VipPackages = () => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const { user } = useAuthStore();

    const packages = [
        {
            title: t('vip.plans.free.title'),
            price: 0,
            period: t('vip.month'),
            icon: <SmileOutlined style={{ fontSize: '48px', color: '#6b7280' }} />,
            features: t('vip.plans.free.features', { returnObjects: true }),
            buttonText: t('vip.currentPlan'),
            isCurrent: true,
            color: '#6b7280'
        },
        {
            title: t('vip.plans.plus.title'),
            price: 50000,
            period: t('vip.month'),
            icon: <ThunderboltOutlined style={{ fontSize: '48px', color: '#3b82f6' }} />,
            features: t('vip.plans.plus.features', { returnObjects: true }),
            buttonText: t('vip.upgradeNow'),
            recommend: true,
            color: '#3b82f6',
            orderType: 'billpayment'
        },
        {
            title: t('vip.plans.pro.title'),
            price: 100000,
            period: t('vip.month'),
            icon: <CrownOutlined style={{ fontSize: '48px', color: '#8b5cf6' }} />,
            features: t('vip.plans.pro.features', { returnObjects: true }),
            buttonText: t('vip.goPro'),
            color: '#8b5cf6',
            orderType: 'billpayment'
        }
    ];

    const handlePurchase = async (pkg) => {
        if (pkg.price === 0) return;

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
        }
    };

    return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
            <Title level={2}>{t('vip.title')}</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>{t('vip.subtitle')}</Text>

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
                                disabled={pkg.isCurrent}
                                onClick={() => handlePurchase(pkg)}
                            >
                                {pkg.buttonText}
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
        </div>
    );
};

export default VipPackages;
