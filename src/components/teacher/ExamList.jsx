import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Popconfirm, 
  message, 
  Card, 
  Input, 
  Select,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import { ROUTES } from '../../constants/config';

const { Search } = Input;
const { Option } = Select;

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    sort: '-createdAt'
  });

  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchExams = async (params = {}) => {
    setLoading(true);
    try {
      const apiParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        ...params
      };
      
      const response = await examService.getExams(apiParams);
      
      setExams(response.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0
      }));
    } catch (error) {
      console.error('Fetch exams error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.fetchFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, q: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (examId) => {
    try {
      await examService.deleteExam(examId);
      message.success(t('exams.deleteSuccess'));
      fetchExams();
    } catch (error) {
      console.error('Delete exam error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.deleteFailed'));
      message.error(errorMessage);
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      published: 'green',
      archived: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const statuses = {
      draft: t('exams.statusDraft'),
      published: t('exams.statusPublished'),
      archived: t('exams.statusArchived')
    };
    return statuses[status] || status;
  };

  const getPurposeColor = (purpose) => {
    const colors = {
      exam: 'blue',
      practice: 'green',
      quiz: 'orange',
      assignment: 'purple'
    };
    return colors[purpose] || 'default';
  };

  const getPurposeText = (purpose) => {
    const purposes = {
      exam: t('exams.purposeExam'),
      practice: t('exams.purposePractice'),
      quiz: t('exams.purposeQuiz'),
      assignment: t('exams.purposeAssignment')
    };
    return purposes[purpose] || purpose;
  };

  const columns = [
    {
      title: t('exams.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name) => (
        <div style={{ fontWeight: 'bold' }}>
          {name}
        </div>
      ),
    },
    {
      title: t('exams.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: t('exams.examPurpose'),
      dataIndex: 'examPurpose',
      key: 'examPurpose',
      render: (purpose) => (
        <Tag color={getPurposeColor(purpose)}>
          {getPurposeText(purpose)}
        </Tag>
      ),
    },
    {
      title: t('exams.duration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => `${duration} ${t('exams.minutes')}`,
    },
    {
      title: t('exams.totalMarks'),
      dataIndex: 'totalMarks',
      key: 'totalMarks',
    },
    {
      title: t('exams.questions'),
      dataIndex: 'questions',
      key: 'questions',
      render: (questions) => (
        <Tag color="blue">
          {questions?.length || 0} {t('exams.questions')}
        </Tag>
      ),
    },
    {
      title: t('exams.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return '-';
        const dateObj = new Date(date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('exams.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                const examId = record._id || record.id;
                navigate(`/teacher/exams/${examId}`);
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('exams.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => {
                const examId = record._id || record.id;
                navigate(`/teacher/exams/${examId}/edit`);
              }}
            />
          </Tooltip>
          
          <Popconfirm
            title={t('exams.confirmDelete')}
            onConfirm={() => handleDelete(record._id || record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('exams.delete')}>
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Search
            placeholder={t('exams.searchPlaceholder')}
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder={t('exams.filterByStatus')}
            style={{ width: 150 }}
            allowClear
            onChange={(value) => handleFilterChange('status', value)}
          >
            <Option value="draft">{t('exams.statusDraft')}</Option>
            <Option value="published">{t('exams.statusPublished')}</Option>
            <Option value="archived">{t('exams.statusArchived')}</Option>
          </Select>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => navigate('/teacher/exams/create')}
        >
          {t('exams.createNew')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={exams}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        locale={{
          emptyText: t('exams.noExams')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} ${t('exams.items')}`,
        }}
        onChange={handleTableChange}
      />
    </Card>
  );
};

export default ExamList;

