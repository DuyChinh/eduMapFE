import { useState, useEffect } from 'react';
import { Modal, Table, Input, Select, Tag, Button, Space, message, Checkbox } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';

const { Option } = Select;

const SelectQuestionsModal = ({ 
  visible, 
  onCancel, 
  onConfirm, 
  subjectId,
  alreadySelectedIds = []
}) => {
  const { t, i18n } = useTranslation();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    name: '',
    type: '',
    level: '',
  });

  useEffect(() => {
    if (visible && subjectId) {
      fetchQuestions();
    }
  }, [visible, subjectId, pagination.current, pagination.pageSize, filters]);

  const fetchQuestions = async () => {
    if (!subjectId) return;

    setLoading(true);
    try {
      const params = {
        subjectId,
        page: pagination.current,
        limit: pagination.pageSize,
        name: filters.name || undefined,
        type: filters.type || undefined,
        level: filters.level || undefined,
      };

      const response = await questionService.getQuestions(params);
      const data = response.items || response.data || [];
      const total = response.total || data.length;

      setQuestions(data);
      setPagination(prev => ({
        ...prev,
        total,
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      message.error(t('exams.searchQuestionsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({
      ...prev,
      current: 1, // Reset to first page when filter changes
    }));
  };

  const handleConfirm = () => {
    onConfirm(selectedRows);
    handleClose();
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
    setFilters({
      name: '',
      type: '',
      level: '',
    });
    setPagination({
      current: 1,
      pageSize: 10,
      total: 0,
    });
    onCancel();
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

  const getQuestionTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, newSelectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setSelectedRows(newSelectedRows);
    },
    getCheckboxProps: (record) => ({
      disabled: alreadySelectedIds.includes(record._id || record.id),
      name: record.name,
    }),
  };

  const columns = [
    {
      title: t('questions.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name) => (
        <div style={{ maxWidth: 300 }}>
          {name || t('questions.noName')}
        </div>
      ),
    },
    {
      title: t('questions.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
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
      width: 100,
      render: (level) => (
        <Tag color={level <= 2 ? 'green' : level <= 4 ? 'orange' : 'red'}>
          {level}/5
        </Tag>
      ),
    },
    {
      title: t('questions.status'),
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (isPublic) => (
        <Tag color={isPublic ? 'green' : 'default'}>
          {isPublic ? t('common.public') : t('common.private')}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title={t('exams.selectQuestions') || 'Chọn câu hỏi'}
      open={visible}
      onCancel={handleClose}
      onOk={handleConfirm}
      width={900}
      okText={t('exams.addQuestion') || 'Add Question'}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: selectedRowKeys.length === 0 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            placeholder={t('exams.searchQuestionsByName') || 'Tìm kiếm theo tên câu hỏi...'}
            prefix={<SearchOutlined />}
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            allowClear
            onPressEnter={fetchQuestions}
            style={{ width: 250 }}
          />
          
          <Select
            placeholder={t('questions.filterByType')}
            style={{ width: 150 }}
            allowClear
            value={filters.type || undefined}
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
            value={filters.level || undefined}
            onChange={(value) => handleFilterChange('level', value)}
          >
            <Option value="1">1 - {t('questions.levelEasy')}</Option>
            <Option value="2">2 - {t('questions.levelEasy')}</Option>
            <Option value="3">3 - {t('questions.levelMedium')}</Option>
            <Option value="4">4 - {t('questions.levelHard')}</Option>
            <Option value="5">5 - {t('questions.levelHard')}</Option>
          </Select>

          <Button type="primary" onClick={fetchQuestions}>
            {t('common.search')}
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span>{t('exams.selectedQuestions')}: <strong>{selectedRowKeys.length}</strong></span>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={questions}
        rowKey={(record) => record._id || record.id}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['5', '10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('questions.items')}`,
        }}
        onChange={handleTableChange}
        scroll={{ y: 400 }}
        size="small"
      />
    </Modal>
  );
};

export default SelectQuestionsModal;

