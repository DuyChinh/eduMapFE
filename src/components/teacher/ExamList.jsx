import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Popconfirm, 
  Card, 
  Input, 
  Select,
  Tooltip,
  App
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import questionService from '../../api/questionService';
import { ROUTES } from '../../constants/config';

const { Search } = Input;
const { Option } = Select;

const ExamList = () => {
  const { message } = App.useApp();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    subjectId: '',
    sort: '-createdAt'
  });
  
  // Bulk delete states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const { t, i18n } = useTranslation();
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

  // Fetch subjects on component mount and when language changes
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const currentLang = i18n.language || localStorage.getItem('language') || 'vi';
        const response = await questionService.getSubjects({ lang: currentLang });
        
        let subjectsData = [];
        if (Array.isArray(response)) {
          subjectsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          subjectsData = response.data;
        } else if (response.items && Array.isArray(response.items)) {
          subjectsData = response.items;
        }
        
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    fetchSubjects();
  }, [i18n.language]);

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

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('exams.noItemsSelected') || 'No items selected');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      const deletePromises = selectedRowKeys.map(id => examService.deleteExam(id));
      await Promise.all(deletePromises);
      
      message.success(
        t('exams.bulkDeleteSuccess') || 
        `Successfully deleted ${selectedRowKeys.length} exam(s)`
      );
      setSelectedRowKeys([]);
      fetchExams();
    } catch (error) {
      console.error('Bulk delete error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.bulkDeleteFailed'));
      message.error(errorMessage);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record) => ({
      name: record.name,
    }),
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

  // Get subject name based on current language
  const getSubjectName = (subject) => {
    if (!subject) return '-';
    if (typeof subject === 'string') return subject;
    
    const currentLang = i18n.language || localStorage.getItem('language') || 'vi';
    switch (currentLang) {
      case 'en':
        return subject.name_en || subject.name || '-';
      case 'jp':
      case 'ja':
        return subject.name_jp || subject.name || '-';
      case 'vi':
      default:
        return subject.name || '-';
    }
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
      title: t('exams.subject') || 'Subject',
      dataIndex: 'subjectId',
      key: 'subject',
      render: (subject) => {
        const subjectName = getSubjectName(subject);
        return subjectName !== '-' ? (
          <Tag color="cyan">{subjectName}</Tag>
        ) : (
          <span>-</span>
        );
      },
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
      title: t('exams.shareLink'),
      dataIndex: 'shareCode',
      key: 'shareLink',
      render: (shareCode, record) => {
        if (record.status !== 'published' || !shareCode) {
          return <Tag color="default">-</Tag>;
        }
        const shareLink = `${window.location.origin}/exam/${shareCode}`;
        return (
          <Tooltip title={t('exams.clickToCopy') || 'Click to copy link'}>
            <Tag 
              color="blue" 
              icon={<LinkOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                message.success(t('exams.linkCopied'));
              }}
            >
              {shareCode}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small" wrap={false}>
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
      <div style={{ marginBottom: 16 }}>
        {/* Filters Row */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12, 
          marginBottom: 16 
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            flexWrap: 'wrap',
            alignItems: 'flex-start'
          }}>
            <Search
              placeholder={t('exams.searchPlaceholder')}
              allowClear
              style={{ 
                width: '100%',
                maxWidth: 300,
                minWidth: 200
              }}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
            />
          
            <Select
              placeholder={t('exams.filterByStatus')}
              style={{ 
                width: '100%',
                maxWidth: 150,
                minWidth: 120
              }}
              allowClear
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="draft">{t('exams.statusDraft')}</Option>
              <Option value="published">{t('exams.statusPublished')}</Option>
              <Option value="archived">{t('exams.statusArchived')}</Option>
            </Select>

            <Select
              placeholder={t('exams.filterBySubject') || 'Filter by Subject'}
              style={{ 
                width: '100%',
                maxWidth: 200,
                minWidth: 150
              }}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => handleFilterChange('subjectId', value)}
            >
              {subjects.map((subject) => (
                <Option key={subject._id} value={subject._id} label={getSubjectName(subject)}>
                  {getSubjectName(subject)}
                </Option>
              ))}
            </Select>
          </div>
        </div>
        
        {/* Actions Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 8 
        }}>
          <Space wrap size="small">
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={t('exams.confirmBulkDelete') || `Are you sure you want to delete ${selectedRowKeys.length} selected exam(s)?`}
                onConfirm={handleBulkDelete}
                okText={t('common.yes')}
                cancelText={t('common.no')}
                okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
              >
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  loading={bulkDeleteLoading}
                >
                  {t('exams.deleteSelected') || `Delete Selected (${selectedRowKeys.length})`}
                </Button>
              </Popconfirm>
            )}
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/teacher/exams/create')}
            >
              {t('exams.createNew')}
            </Button>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={exams}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        rowSelection={rowSelection}
        locale={{
          emptyText: t('exams.noExams')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} ${t('exams.items')}`,
          responsive: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default ExamList;

