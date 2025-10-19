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
  UserAddOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import classService from '../../api/classService';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../constants/config';
import CreateClassModal from './CreateClassModal';
import EditClassModal from './EditClassModal';
import AddStudentsModal from './AddStudentsModal';

const { Search } = Input;
const { Option } = Select;

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    q: '',
    sort: '-createdAt'
  });
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addStudentsModalVisible, setAddStudentsModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const fetchClasses = async (params = {}) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching classes...', { filters, pagination });
      
      let response;
      
      // Use Search API if there's a search query (minimum 2 characters)
      if (filters.q && filters.q.length >= 2) {
        console.log('🔍 Using Search API for query:', filters.q);
        response = await classService.searchClasses(filters.q, user?.email);
      } else {
        // Use List API for dashboard/pagination
        console.log('🔍 Using List API with pagination');
        const listParams = {
          page: pagination.current || 1,
          limit: pagination.pageSize || 10,
          teacher_email: user?.email, // Add teacher email to filter
          ...filters,
          ...params
        };
        console.log('📤 List API params:', listParams);
        response = await classService.getClasses(listParams);
      }
      
      console.log('📦 Classes response:', response);
      
      // Axios interceptor returns response.data, so response is already the data
      // API returns { ok: true, items: [...], total: 100, page: 1, limit: 20, pages: 5 }
      const classesData = response.items || [];
      console.log('📋 Classes data:', classesData);

      setClasses(classesData);
      setPagination(prev => ({
        ...prev,
        total: response.total || classesData.length,
        current: response.page || 1,
        pageSize: response.limit || prev.pageSize,
      }));
      
      console.log('✅ Classes loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
      message.error(t('classes.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login');
      navigate(ROUTES.LOGIN);
      return;
    }

    // Debug token
    const token = localStorage.getItem('auth_token');
    const authStorage = localStorage.getItem('auth-storage');
    console.log('🔑 Token check:', { token, authStorage, user: user?.email, role: user?.role });
    
    fetchClasses();
  }, [filters, isAuthenticated, navigate]);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, q: value }));
    // Reset pagination when searching
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (classId) => {
    try {
      await classService.deleteClass(classId);
      message.success(t('classes.deleteSuccess'));
      fetchClasses();
    } catch (error) {
      message.error(t('classes.deleteFailed'));
    }
  };

  const handleRegenerateCode = async (classId) => {
    try {
      await classService.regenerateClassCode(classId);
      message.success(t('classes.codeRegenerated'));
      fetchClasses();
    } catch (error) {
      message.error(t('classes.codeRegenerateFailed'));
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
    // Fetch classes with new pagination
    fetchClasses({ page: pagination.current, limit: pagination.pageSize });
  };

  const columns = [
    {
      title: t('classes.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('classes.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: t('classes.students'),
      dataIndex: 'studentIds',
      key: 'students',
      render: (studentIds) => (
        <Tag color="green">
          {studentIds?.length || 0} {t('classes.students')}
        </Tag>
      ),
    },
    {
      title: t('classes.academicYear'),
      dataIndex: ['metadata', 'academicYear'],
      key: 'academicYear',
      render: (year) => year || '-',
    },
    {
      title: t('classes.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
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
          <Tooltip title={t('classes.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                navigate(`${ROUTES.TEACHER_CLASSES}/${record._id}`);
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('classes.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedClass(record);
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('classes.addStudents')}>
            <Button 
              type="text" 
              icon={<UserAddOutlined />}
              onClick={() => {
                setSelectedClass(record);
                setAddStudentsModalVisible(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title={t('classes.regenerateCode')}>
            <Button 
              type="text" 
              icon={<ReloadOutlined />}
              onClick={() => handleRegenerateCode(record._id)}
            />
          </Tooltip>
          
          <Popconfirm
            title={t('classes.confirmDelete')}
            onConfirm={() => handleDelete(record._id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('classes.delete')}>
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Search
          placeholder={t('classes.searchPlaceholder')}
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          prefix={<SearchOutlined />}
        />
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          {t('classes.createNew')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={classes}
        loading={loading}
        rowKey="_id"
        locale={{
          emptyText: t('classes.noClasses')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} ${t('classes.items')}`,
        }}
        onChange={handleTableChange}
      />

      {/* Modals */}
      <CreateClassModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchClasses();
        }}
      />

      <EditClassModal
        visible={editModalVisible}
        classData={selectedClass}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedClass(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setSelectedClass(null);
          fetchClasses();
        }}
      />

      <AddStudentsModal
        visible={addStudentsModalVisible}
        classData={selectedClass}
        onCancel={() => {
          setAddStudentsModalVisible(false);
          setSelectedClass(null);
        }}
        onSuccess={() => {
          setAddStudentsModalVisible(false);
          setSelectedClass(null);
          fetchClasses();
        }}
      />
    </Card>
  );
};

export default ClassList;
