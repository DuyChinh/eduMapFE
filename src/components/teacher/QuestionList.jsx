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
  Pagination,
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
import questionService from '../../api/questionService';
import CreateQuestionModal from './CreateQuestionModal';
import EditQuestionModal from './EditQuestionModal';

const { Search } = Input;
const { Option } = Select;

const QuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    level: '',
    sort: '-createdAt'
  });
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const { t } = useTranslation();

  const fetchQuestions = async (params = {}) => {
    setLoading(true);
    try {
      const response = await questionService.getQuestions({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        ...params
      });
      
      setQuestions(response.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0
      }));
    } catch (error) {
      message.error(t('questions.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, q: value }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = async (questionId) => {
    try {
      await questionService.deleteQuestion(questionId);
      message.success(t('questions.deleteSuccess'));
      fetchQuestions();
    } catch (error) {
      message.error(t('questions.deleteFailed'));
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const getQuestionTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
  };

  const getQuestionTypeText = (type) => {
    const types = {
      mcq: t('questions.types.mcq'),
      tf: t('questions.types.tf'),
      short: t('questions.types.short'),
      essay: t('questions.types.essay')
    };
    return types[type] || type;
  };

  const columns = [
    {
      title: t('questions.text'),
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text) => (
        <div style={{ maxWidth: 300 }}>
          {text}
        </div>
      ),
    },
    {
      title: t('questions.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getQuestionTypeColor(type)}>
          {getQuestionTypeText(type)}
        </Tag>
      ),
    },
    {
      title: t('questions.level'),
      dataIndex: 'level',
      key: 'level',
      render: (level) => (
        <Tag color={level <= 2 ? 'green' : level <= 4 ? 'orange' : 'red'}>
          {level}/5
        </Tag>
      ),
    },
    {
      title: t('questions.tags'),
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <div>
          {tags?.slice(0, 2).map(tag => (
            <Tag key={tag} size="small">{tag}</Tag>
          ))}
          {tags?.length > 2 && <Tag size="small">+{tags.length - 2}</Tag>}
        </div>
      ),
    },
    {
      title: t('questions.isPublic'),
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic) => (
        <Tag color={isPublic ? 'green' : 'red'}>
          {isPublic ? t('common.public') : t('common.private')}
        </Tag>
      ),
    },
    {
      title: t('questions.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('questions.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedQuestion(record);
                // Navigate to question details
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('questions.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedQuestion(record);
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          
          <Popconfirm
            title={t('questions.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('questions.delete')}>
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
            placeholder={t('questions.searchPlaceholder')}
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder={t('questions.filterByType')}
            style={{ width: 150 }}
            allowClear
            onChange={(value) => handleFilterChange('type', value)}
          >
            <Option value="mcq">{t('questions.types.mcq')}</Option>
            <Option value="tf">{t('questions.types.tf')}</Option>
            <Option value="short">{t('questions.types.short')}</Option>
            <Option value="essay">{t('questions.types.essay')}</Option>
          </Select>
          
          <Select
            placeholder={t('questions.filterByLevel')}
            style={{ width: 150 }}
            allowClear
            onChange={(value) => handleFilterChange('level', value)}
          >
            <Option value="1">1 - {t('questions.levelEasy')}</Option>
            <Option value="2">2 - {t('questions.levelEasy')}</Option>
            <Option value="3">3 - {t('questions.levelMedium')}</Option>
            <Option value="4">4 - {t('questions.levelHard')}</Option>
            <Option value="5">5 - {t('questions.levelHard')}</Option>
          </Select>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          {t('questions.createNew')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={questions}
        loading={loading}
        rowKey="id"
        locale={{
          emptyText: t('questions.noQuestions')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} ${t('questions.items')}`,
        }}
        onChange={handleTableChange}
      />

      {/* Modals */}
      <CreateQuestionModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchQuestions();
        }}
      />

      <EditQuestionModal
        visible={editModalVisible}
        questionData={selectedQuestion}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedQuestion(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setSelectedQuestion(null);
          fetchQuestions();
        }}
      />
    </Card>
  );
};

export default QuestionList;
