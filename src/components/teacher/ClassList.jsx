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
  SearchOutlined,
  QrcodeOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import classService from '../../api/classService';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../constants/config';
import CreateClassModal from './CreateClassModal';
import EditClassModal from './EditClassModal';
import AddStudentsModal from './AddStudentsModal';
import QRCodeModal from '../common/QRCodeModal';

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
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [selectedClassForQR, setSelectedClassForQR] = useState(null);

  // Bulk delete states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const fetchClasses = async (params = {}) => {
    setLoading(true);
    try {

      let response;

      // Use Search API if there's a search query (minimum 2 characters)
      if (filters.q && filters.q.length >= 2) {
        response = await classService.searchClasses(filters.q, user?.email);
      } else {
        // Use List API for dashboard/pagination
        const listParams = {
          page: pagination.current || 1,
          limit: pagination.pageSize || 10,
          teacher_email: user?.email, // Add teacher email to filter
          ...filters,
          ...params
        };
        response = await classService.getClasses(listParams);
      }


      // Axios interceptor returns response.data, so response is already the data
      // API returns { ok: true, items: [...], total: 100, page: 1, limit: 20, pages: 5 }
      const classesData = response.items || [];

      setClasses(classesData);
      setPagination(prev => ({
        ...prev,
        total: response.total || classesData.length,
        current: response.page || 1,
        pageSize: response.limit || prev.pageSize,
      }));

    } catch (error) {
      console.error('❌ Error fetching classes:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('classes.fetchFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Debug token
    const token = localStorage.getItem('auth_token');
    const authStorage = localStorage.getItem('auth-storage');

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
      console.error('Delete class error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('classes.deleteFailed'));
      message.error(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('classes.noItemsSelected') || 'No items selected');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      const deletePromises = selectedRowKeys.map(id => classService.deleteClass(id));
      await Promise.all(deletePromises);

      message.success(
        t('classes.bulkDeleteSuccess') ||
        `Successfully deleted ${selectedRowKeys.length} class(es)`
      );
      setSelectedRowKeys([]);
      fetchClasses();
    } catch (error) {
      console.error('Bulk delete error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('classes.bulkDeleteFailed'));
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

  const handleRegenerateCode = async (classId) => {
    try {
      await classService.regenerateClassCode(classId);
      message.success(t('classes.codeRegenerated'));
      fetchClasses();
    } catch (error) {
      console.error('Regenerate code error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('classes.codeRegenerateFailed'));
      message.error(errorMessage);
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
      title: 'QR',
      key: 'qrCode',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (!record.code) {
          return <span style={{ color: '#d9d9d9' }}>-</span>;
        }
        return (
          <Tooltip title={t('classes.showQRCode') || 'Show QR Code'}>
            <Button
              type="text"
              icon={<QrcodeOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
              onClick={() => {
                setSelectedClassForQR(record);
                setQrCodeModalVisible(true);
              }}
            />
          </Tooltip>
        );
      },
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
      title: t('classes.bulletinBoard') || 'Bulletin Board',
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
            <Tooltip title={t('classes.viewDetails') || 'View Details'}>
              <Button
                type="text"
                icon={<ArrowRightOutlined style={{ color: '#1890ff' }} />}
                onClick={() => navigate(`${ROUTES.TEACHER_CLASSES}/${record._id}?tab=newsfeed`)}
              />
            </Tooltip>
          </div>
        );
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
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <Search
            placeholder={t('classes.searchPlaceholder')}
            allowClear
            style={{
              width: '100%',
              maxWidth: 300,
              minWidth: 200
            }}
            onSearch={handleSearch}
            prefix={<SearchOutlined />}
          />

          <Space wrap size="small">
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={t('classes.confirmBulkDelete') || `Are you sure you want to delete ${selectedRowKeys.length} selected class(es)?`}
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
                  {t('classes.deleteSelected') || `Delete Selected (${selectedRowKeys.length})`}
                </Button>
              </Popconfirm>
            )}

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              {t('classes.createNew')}
            </Button>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={classes}
        loading={loading}
        rowKey="_id"
        rowSelection={rowSelection}
        locale={{
          emptyText: t('classes.noClasses')
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} ${t('classes.items')}`,
          responsive: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
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

      {/* QR Code Modal */}
      <QRCodeModal
        open={qrCodeModalVisible}
        onCancel={() => {
          setQrCodeModalVisible(false);
          setSelectedClassForQR(null);
        }}
        value={selectedClassForQR?.code || ''}
        title={selectedClassForQR?.name || t('classes.classCodeQR')}
        description={t('classes.qrDescription') || 'Students can scan this QR code to join the class'}
        filename={selectedClassForQR?.name ? `qr_class_${selectedClassForQR.name.replace(/[^a-zA-Z0-9]/g, '_')}` : `qr_class_${selectedClassForQR?.code || 'class'}`}
      />
    </Card>
  );
};

export default ClassList;
