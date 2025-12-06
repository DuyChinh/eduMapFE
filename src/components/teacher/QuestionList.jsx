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
  Tooltip,
  Modal,
  Upload,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import questionService from '../../api/questionService';
import { ROUTES } from '../../constants/config';
import CreateQuestionModal from './CreateQuestionModal';

const { Search } = Input;
const { Option } = Select;

const QuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    level: '',
    subject: '',
    sort: '-createdAt'
  });
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  
  // Bulk delete states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchQuestions = async (params = {}) => {
    setLoading(true);
    try {
      // Prepare API parameters
      const apiParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        ...params
      };
      
      // Convert subject filter to subjectId for API
      if (apiParams.subject) {
        apiParams.subjectId = apiParams.subject;
        delete apiParams.subject;
      }
      
      const response = await questionService.getQuestions(apiParams);
      
      setQuestions(response.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0
      }));
    } catch (error) {
      console.error('Fetch questions error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.fetchFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [pagination.current, pagination.pageSize, filters]);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const currentLang = localStorage.getItem('language') || 'vi';
        const response = await questionService.getSubjects({ lang: currentLang });
        
        // Handle different response structures
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
        console.error('❌ Error fetching subjects:', error);
        message.error('Failed to load subjects');
        setSubjects([]);
      }
    };

    fetchSubjects();
  }, []);

  // Listen for language changes and refetch subjects
  useEffect(() => {
    const handleLanguageChange = () => {
      const currentLang = localStorage.getItem('language') || 'vi';
      
      // Refetch subjects with new language
      const refetchSubjects = async () => {
        try {
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
          console.error('❌ Error refetching subjects:', error);
          message.error('Failed to reload subjects');
        }
      };
      
      refetchSubjects();
    };

    // Listen for storage changes (language changes)
    window.addEventListener('storage', handleLanguageChange);
    
    // Also listen for custom language change events
    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleLanguageChange);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, q: value }));
    // Reset pagination to page 1 when search changes
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset pagination to page 1 when filter changes
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (questionId) => {
    try {
      await questionService.deleteQuestion(questionId);
      message.success(t('questions.deleteSuccess'));
      fetchQuestions();
    } catch (error) {
      console.error('Delete question error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.deleteFailed'));
      message.error(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('questions.noItemsSelected') || 'No items selected');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      const deletePromises = selectedRowKeys.map(id => questionService.deleteQuestion(id));
      await Promise.all(deletePromises);
      
      message.success(
        t('questions.bulkDeleteSuccess') || 
        `Successfully deleted ${selectedRowKeys.length} question(s)`
      );
      setSelectedRowKeys([]);
      fetchQuestions();
    } catch (error) {
      console.error('Bulk delete error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.bulkDeleteFailed'));
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

  // Handle download template
  const handleDownloadTemplate = async (format = 'xlsx') => {
    try {
      const response = await questionService.downloadTemplate(format);
      
      // Create blob and download
      const blob = new Blob([response], {
        type: format === 'csv' 
          ? 'text/csv;charset=utf-8;' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `questions_template.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('questions.templateDownloaded') || 'Template downloaded successfully');
    } catch (error) {
      console.error('Download template error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.templateDownloadFailed'));
      message.error(errorMessage);
    }
  };

  // Handle export questions
  const handleExportQuestions = async (format = 'xlsx') => {
    try {
      const exportParams = {};
      if (filters.subject) exportParams.subjectId = filters.subject;
      if (filters.type) exportParams.type = filters.type;
      if (filters.level) exportParams.level = filters.level;

      const response = await questionService.exportQuestions({ ...exportParams, format });
      
      // Create blob and download
      const blob = new Blob([response], {
        type: format === 'csv' 
          ? 'text/csv;charset=utf-8;' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `questions_export_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('questions.exportSuccess') || 'Questions exported successfully');
    } catch (error) {
      console.error('Export questions error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.exportFailed'));
      message.error(errorMessage);
    }
  };

  // Handle import questions
  const handleImportQuestions = async () => {
    if (!importFile) {
      message.warning(t('questions.pleaseSelectFile') || 'Please select a file');
      return;
    }

    setImportLoading(true);
    try {
      const response = await questionService.importQuestions(importFile);
      const results = response.results || response.data?.results;
      
      setImportResults(results);
      
      if (results && results.success > 0) {
        message.success(
          t('questions.importSuccess') || 
          `Successfully imported ${results.success} question(s)`
        );
        fetchQuestions(); // Refresh the list
      }
      
      if (results && results.failed > 0) {
        message.warning(
          `${results.success} succeeded, ${results.failed} failed out of ${results.total} total`
        );
      }
    } catch (error) {
      console.error('Import questions error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.importFailed'));
      message.error(errorMessage);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportModalClose = () => {
    setImportModalVisible(false);
    setImportFile(null);
    setImportResults(null);
  };

  const beforeUpload = (file) => {
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls');
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    
    if (!isExcel && !isCSV) {
      message.error(t('questions.invalidFileType') || 'You can only upload CSV or Excel files!');
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('questions.fileTooLarge') || 'File must be smaller than 10MB!');
      return false;
    }
    
    setImportFile(file);
    return false; // Prevent auto upload
  };

  const columns = [
    {
      title: t('questions.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name) => (
        <div style={{ maxWidth: 200, fontWeight: 'bold' }}>
          {name || t('questions.noName')}
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
      title: t('questions.subject'),
      dataIndex: 'subjectId',
      key: 'subjectId',
      render: (subjectId, record) => {
        // Handle case where subjectId might be an object
        let actualSubjectId = subjectId;
        if (typeof subjectId === 'object' && subjectId !== null) {
          actualSubjectId = subjectId._id || subjectId.id;
        }
        
        // Get subject name from subjects array
        const subjectObj = subjects.find(s => (s._id || s.id) === actualSubjectId);
        const currentLang = localStorage.getItem('language') || 'vi';
        
        let subjectName = actualSubjectId || 'N/A';
        if (subjectObj) {
          switch (currentLang) {
            case 'en':
              subjectName = subjectObj.name_en || subjectObj.name || actualSubjectId;
              break;
            case 'jp':
              subjectName = subjectObj.name_jp || subjectObj.name || actualSubjectId;
              break;
            case 'vi':
            default:
              subjectName = subjectObj.name || actualSubjectId;
              break;
          }
        }
        
        return (
          <Tag color="blue">
            {subjectName}
          </Tag>
        );
      },
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
      title: t('questions.status'),
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
          <Tooltip title={t('questions.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                const questionId = record.id || record._id;
                navigate(`/teacher/questions/detail/${questionId}`);
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('questions.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => {
                const questionId = record.id || record._id;
                navigate(`/teacher/questions/edit/${questionId}`);
              }}
            />
          </Tooltip>
          
          <Popconfirm
            title={t('questions.confirmDelete')}
            onConfirm={() => handleDelete(record.id || record._id)}
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
              placeholder={t('questions.searchPlaceholder')}
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
              placeholder={t('questions.filterByType')}
              style={{ 
                width: '100%',
                maxWidth: 150,
                minWidth: 120
              }}
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
              style={{ 
                width: '100%',
                maxWidth: 150,
                minWidth: 120
              }}
              allowClear
              onChange={(value) => handleFilterChange('level', value)}
            >
              <Option value="1">1 - {t('questions.levelEasy')}</Option>
              <Option value="2">2 - {t('questions.levelEasy')}</Option>
              <Option value="3">3 - {t('questions.levelMedium')}</Option>
              <Option value="4">4 - {t('questions.levelHard')}</Option>
              <Option value="5">5 - {t('questions.levelHard')}</Option>
            </Select>
            
            <Select
              placeholder={t('questions.filterBySubject')}
              style={{ 
                width: '100%',
                maxWidth: 200,
                minWidth: 150
              }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => handleFilterChange('subject', value)}
            >
              {subjects.map(subject => {
                const currentLang = localStorage.getItem('language') || 'vi';
                let subjectName = subject.name;
                
                switch (currentLang) {
                  case 'en':
                    subjectName = subject.name_en || subject.name;
                    break;
                  case 'jp':
                    subjectName = subject.name_jp || subject.name;
                    break;
                  case 'vi':
                  default:
                    subjectName = subject.name;
                    break;
                }
                
                return (
                  <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                    {subjectName}
                  </Option>
                );
              })}
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
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={t('questions.confirmBulkDelete') || `Are you sure you want to delete ${selectedRowKeys.length} selected question(s)?`}
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
                {t('questions.deleteSelected') || `Delete Selected (${selectedRowKeys.length})`}
              </Button>
            </Popconfirm>
          )}
          
          <Space wrap size="small">
            <Button 
              icon={<FileExcelOutlined />}
              onClick={() => handleDownloadTemplate('xlsx')}
              className="responsive-button"
            >
              <span className="button-text">{t('questions.downloadTemplate') || 'Download Template'}</span>
            </Button>
            
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExportQuestions('xlsx')}
              className="responsive-button"
            >
              <span className="button-text">{t('questions.export') || 'Export'}</span>
            </Button>
            
            <Button 
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
              className="responsive-button"
            >
              <span className="button-text">{t('questions.import') || 'Import'}</span>
            </Button>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate(ROUTES.TEACHER_QUESTIONS_CREATE)}
            >
              {t('questions.createNew')}
            </Button>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={questions}
        loading={loading}
        rowKey={(record) => record.id || record._id}
        rowSelection={rowSelection}
        locale={{
          emptyText: t('questions.noQuestions')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} ${t('questions.items')}`,
          responsive: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
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

      {/* Import Modal */}
      <Modal
        title={t('questions.importQuestions') || 'Import Questions'}
        open={importModalVisible}
        onOk={handleImportQuestions}
        onCancel={handleImportModalClose}
        okText={t('questions.import') || 'Import'}
        cancelText={t('common.cancel')}
        confirmLoading={importLoading}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message={t('questions.importInstructions') || 'Import Instructions'}
            description={
              <div>
                <p>{t('questions.importInstructionsDesc') || '1. Download the template file first'}</p>
                <p>{t('questions.importInstructionsDesc2') || '2. Fill in your questions following the template format'}</p>
                <p>{t('questions.importInstructionsDesc3') || '3. Upload the completed file (CSV or Excel format)'}</p>
              </div>
            }
            type="info"
            showIcon
          />

          <div>
            <Button 
              type="link" 
              icon={<FileExcelOutlined />}
              onClick={() => handleDownloadTemplate('xlsx')}
              style={{ padding: 0 }}
            >
              {t('questions.downloadExcelTemplate') || 'Download Excel Template'}
            </Button>
            {' | '}
            <Button 
              type="link" 
              icon={<FileExcelOutlined />}
              onClick={() => handleDownloadTemplate('csv')}
              style={{ padding: 0 }}
            >
              {t('questions.downloadCSVTemplate') || 'Download CSV Template'}
            </Button>
          </div>

          <Upload
            beforeUpload={beforeUpload}
            accept=".csv,.xlsx,.xls"
            maxCount={1}
            fileList={importFile ? [importFile] : []}
            onRemove={() => setImportFile(null)}
          >
            <Button icon={<UploadOutlined />}>
              {t('questions.selectFile') || 'Select File'}
            </Button>
          </Upload>

          {importResults && (
            <div>
              <Alert
                message={t('questions.importResults') || 'Import Results'}
                description={
                  <div>
                    <p><strong>{t('questions.total') || 'Total'}:</strong> {importResults.total}</p>
                    <p style={{ color: '#52c41a' }}>
                      <strong>{t('questions.success') || 'Success'}:</strong> {importResults.success}
                    </p>
                    <p style={{ color: '#ff4d4f' }}>
                      <strong>{t('questions.failed') || 'Failed'}:</strong> {importResults.failed}
                    </p>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <strong>{t('questions.errors') || 'Errors'}:</strong>
                        <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                          {importResults.errors.slice(0, 10).map((err, idx) => (
                            <li key={idx} style={{ color: '#ff4d4f' }}>
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                          {importResults.errors.length > 10 && (
                            <li>... and {importResults.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                }
                type={importResults.failed === 0 ? 'success' : 'warning'}
                showIcon
              />
            </div>
          )}
        </Space>
      </Modal>
    </Card>
  );
};

export default QuestionList;
