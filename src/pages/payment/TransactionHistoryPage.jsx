import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, message, Select, DatePicker, Space, Row, Col } from 'antd';
import { HistoryOutlined, FilterOutlined } from '@ant-design/icons'; // Ensure HistoryOutlined is imported
import { useTranslation } from 'react-i18next';
import paymentService from '../../services/paymentService'; // Ensure correct path
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TransactionHistoryPage = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        filterData();
    }, [transactions, statusFilter, dateRange]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await paymentService.getHistory();
            if (res && res.success) {
                setTransactions(res.data);
                setFilteredTransactions(res.data);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            message.error(t('payment.historyModal.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let data = [...transactions];

        if (statusFilter !== 'ALL') {
            data = data.filter(item => item.status === statusFilter);
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day').valueOf();
            const end = dateRange[1].endOf('day').valueOf();
            data = data.filter(item => {
                const itemDate = new Date(item.createdAt).getTime();
                return itemDate >= start && itemDate <= end;
            });
        }

        setFilteredTransactions(data);
    };

    const columns = [
        {
            title: t('common.index') || 'STT',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: 60,
        },
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
            },
        },
        {
            title: t('payment.historyModal.date'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleString('vi-VN'),
        },
    ];



    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>


            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <HistoryOutlined style={{ marginRight: 8 }} />
                            {t('payment.history')}
                        </Title>

                        <Space wrap>
                            <Select
                                defaultValue="ALL"
                                style={{ width: 150 }}
                                onChange={setStatusFilter}
                                suffixIcon={<FilterOutlined />}
                            >
                                <Option value="ALL">{t('common.all') || 'Tất cả'}</Option>
                                <Option value="SUCCESS">{t('payment.success')}</Option>
                                <Option value="PENDING">{t('payment.pending')}</Option>
                                <Option value="FAILED">{t('payment.failed')}</Option>
                            </Select>

                            <RangePicker
                                onChange={setDateRange}
                                format="DD/MM/YYYY"
                                placeholder={[t('common.startDate') || 'Từ ngày', t('common.endDate') || 'Đến ngày']}
                            />
                        </Space>
                    </div>
                }
            >
                <Table
                    dataSource={filteredTransactions}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('payment.historyModal.items') || 'giao dịch'}`,
                    }}
                />
            </Card>
        </div>
    );
};

export default TransactionHistoryPage;
