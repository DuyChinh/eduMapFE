import { useState, useEffect } from 'react';
import { Card, Button, Typography, Table, Tag, Space, message, Input } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import classService from '../../api/classService';
import { ROUTES } from '../../constants/config';
import JoinClassModal from '../../components/student/JoinClassModal';

const { Title } = Typography;

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchMyClasses = async (params = {}) => {
    setLoading(true);
    try {
      
      // For students, we use getMyClasses which returns their enrolled classes
      // This doesn't need pagination as students typically have fewer classes
      const response = await classService.getMyClasses();
      
      // Axios interceptor returns response.data, so response is already the data
      // API returns { ok: true, items: [...], total: 100, page: 1, limit: 20, pages: 5 }
      let classesData = response.items || [];
      
      // Filter classes based on search query
      if (searchQuery && searchQuery.length >= 2) {
        classesData = classesData.filter(cls => 
          cls.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setClasses(classesData);
    } catch (error) {
      console.error('❌ Student error fetching classes:', error);
      message.error(t('studentPages.classes.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClasses();
  }, [searchQuery]);

  const handleJoinSuccess = (classData) => {
    // Toast is already shown in JoinClassModal, no need to show again
    fetchMyClasses(); // Refresh the list
  };

  const columns = [
    {
      title: t('studentPages.classes.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('studentPages.classes.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: t('studentPages.classes.academicYear'),
      dataIndex: ['metadata', 'academicYear'],
      key: 'academicYear',
      render: (year) => year || '-',
    },
    {
      title: t('studentPages.classes.joinedAt'),
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              navigate(`${ROUTES.STUDENT_CLASSES}/${record._id}`);
            }}
          >
            {t('studentPages.classes.viewDetails')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <img 
            src="/class.png" 
            alt="Class" 
            style={{ width: 24, height: 24, objectFit: 'contain' }} 
          />
          <Title level={2} style={{ margin: 0, flex: 1 }}>{t('studentPages.classes.title')}</Title>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Input.Search
            placeholder={t('studentPages.classes.searchPlaceholder')}
            allowClear
            style={{ 
              width: '100%',
              maxWidth: 300,
              minWidth: 200
            }}
            onSearch={setSearchQuery}
            prefix={<SearchOutlined />}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large" 
            onClick={() => setJoinModalVisible(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('studentPages.classes.joinClass')}
          </Button>
        </div>
      </div>
      
      <Card>
        <Table
          columns={columns}
          dataSource={classes}
          loading={loading}
          rowKey="_id"
          locale={{
            emptyText: t('studentPages.classes.noClasses')
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} ${t('studentPages.classes.items')}`,
            responsive: true,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <JoinClassModal
        visible={joinModalVisible}
        onCancel={() => setJoinModalVisible(false)}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
};

export default Classes;