import React, { useEffect, useState } from 'react';
import { Modal, Table, Tag, Typography, message } from 'antd';
import paymentService from '../../services/paymentService';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const TransactionHistoryModal = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchHistory();
        }
    }, [visible]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await paymentService.getHistory();
            if (res && res.success) {
                setTransactions(res.data);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            message.error(t('payment.historyModal.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: t('payment.historyModal.txnRef'),
            dataIndex: 'txnRef',
            key: 'txnRef',
            render: (text) => <Text copyable>{text}</Text>,
        },
        {
            title: t('payment.historyModal.amount'),
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {amount ? amount.toLocaleString('vi-VN') : 0} đ
                </Text>
            ),
        },
        {
            title: t('payment.historyModal.content'),
            dataIndex: 'orderInfo',
            key: 'orderInfo',
        },
        {
            title: t('payment.historyModal.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                let text = status;
                if (status === 'SUCCESS') {
                    color = 'success';
                    text = t('payment.success');
                } else if (status === 'PENDING') {
                    color = 'warning';
                    text = t('payment.pending');
                } else if (status === 'FAILED') {
                    color = 'error';
                    text = t('payment.failed');
                }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: t('payment.historyModal.date'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleString('vi-VN'),
        },
    ];

    return (
        <Modal
            title={t('payment.history')}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            <Table
                dataSource={transactions}
                columns={columns}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 5 }}
            />
        </Modal>
    );
};

export default TransactionHistoryModal;
