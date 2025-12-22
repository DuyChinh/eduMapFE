import { useState, useEffect } from 'react';
import { Card, Button, Typography, Table, Tag, Space, message, Input } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import classService from '../../api/classService';
import { ROUTES } from '../../constants/config';
import JoinClassModal from '../../components/student/JoinClassModal';

const { Title } = Typography;

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialClassCode, setInitialClassCode] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Auto-open join modal if QR code is scanned
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setInitialClassCode(codeParam);
      setJoinModalVisible(true);
      // Remove the code param from URL after reading it
      searchParams.delete('code');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      title: t('classes.bulletinBoard') || 'Newsfeed',
      key: 'latestPost',
      width: 250,
      render: (_, record) => {
        if (!record.latestPost) {
          return <span style={{ color: '#d9d9d9', fontStyle: 'italic' }}>No updates</span>;
        }
        const { author, content, createdAt } = record.latestPost;
        const shortContent = content.length > 50 ? content.substring(0, 50) + '...' : content;

        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: '#1890ff' }}>
                {author?.name || 'Unknown'}
              </div>
              <div style={{ color: '#595959' }}>
                {shortContent}
              </div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 2 }}>
                {new Date(createdAt).toLocaleDateString()}
              </div>
            </div>
            <Button
              type="text"
              icon={<ArrowRightOutlined style={{ color: '#1890ff' }} />}
              onClick={() => navigate(`${ROUTES.STUDENT_CLASSES}/${record._id}?tab=newsfeed`)}
            />
          </div>
        );
      },
    },
    {
      title: t('common.actions'), // Keep actions last, inserted before this block
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
            style={{ width: 30, height: 30, objectFit: 'contain' }}
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
        onCancel={() => {
          setJoinModalVisible(false);
          setInitialClassCode('');
        }}
        onSuccess={handleJoinSuccess}
        initialCode={initialClassCode}
      />
    </div>
  );
};

export default Classes;