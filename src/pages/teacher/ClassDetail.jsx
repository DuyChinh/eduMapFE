import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Spin, 
  message, 
  Descriptions,
  Table,
  Avatar,
  Tooltip
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  UserAddOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import classService from '../../api/classService';
import userService from '../../api/userService';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../constants/config';
import EditClassModal from '../../components/teacher/EditClassModal';
import AddStudentsModal from '../../components/teacher/AddStudentsModal';

const { Title, Text } = Typography;

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addStudentsModalVisible, setAddStudentsModalVisible] = useState(false);

  const fetchClassDetail = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching class detail for ID:', classId);
      const response = await classService.getClassById(classId);
      console.log('📦 Class detail response:', response);
      
      // Axios interceptor returns response.data, so response is already the data
      const classInfo = response.data || response;
      console.log('📋 Class info:', classInfo);
      
      setClassData(classInfo);
      
      // Extract students from class data and fetch their details
      if (classInfo.students && Array.isArray(classInfo.students)) {
        // If students data is already available
        setStudents(classInfo.students);
      } else if (classInfo.studentIds && Array.isArray(classInfo.studentIds)) {
        // If only student IDs are available, fetch student details
        console.log('🔍 Fetching student details for IDs:', classInfo.studentIds);
        const studentPromises = classInfo.studentIds.map(async (studentId) => {
          try {
            const studentResponse = await userService.getUserById(studentId);
            console.log('👤 Student detail response:', studentResponse);
            return studentResponse.data || studentResponse;
          } catch (error) {
            console.error('❌ Error fetching student:', studentId, error);
            return { _id: studentId, name: 'Unknown Student', email: 'unknown@example.com' };
          }
        });
        
        const studentsData = await Promise.all(studentPromises);
        console.log('👥 All students data:', studentsData);
        setStudents(studentsData);
      }
      
      console.log('✅ Class detail loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching class detail:', error);
      message.error('Failed to load class details');
      navigate(ROUTES.TEACHER_CLASSES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchClassDetail();
    }
  }, [classId]);

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchClassDetail(); // Refresh data
  };

  const handleAddStudentsSuccess = () => {
    setAddStudentsModalVisible(false);
    fetchClassDetail(); // Refresh data
  };

  const handleRegenerateCode = async () => {
    try {
      await classService.regenerateClassCode(classId);
      message.success(t('classes.codeRegenerated'));
      fetchClassDetail(); // Refresh data
    } catch (error) {
      message.error(t('classes.codeRegenerateFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await classService.deleteClass(classId);
      message.success(t('classes.deleteSuccess'));
      navigate(ROUTES.TEACHER_CLASSES);
    } catch (error) {
      message.error(t('classes.deleteFailed'));
    }
  };

  const studentColumns = [
    {
      title: t('classes.students'),
      key: 'student',
      render: (_, record) => (
        <Space>
          <Avatar 
            size="small" 
            src={record.avatar}
            style={{ backgroundColor: record.avatar ? 'transparent' : '#1890ff' }}
          >
            {record.name?.charAt(0)?.toUpperCase() || 'S'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name || 'Student'}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email || 'student@example.com'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('classes.joinedAt'),
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
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!classData) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">Class not found</Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(ROUTES.TEACHER_CLASSES)}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>{classData.name}</Title>
        </Space>
        
        <Space>
          <Button 
            icon={<EditOutlined />}
            onClick={() => setEditModalVisible(true)}
          >
            {t('classes.edit')}
          </Button>
          <Button 
            icon={<UserAddOutlined />}
            onClick={() => setAddStudentsModalVisible(true)}
          >
            {t('classes.addStudents')}
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleRegenerateCode}
          >
            {t('classes.regenerateCode')}
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            {t('classes.delete')}
          </Button>
        </Space>
      </div>

      {/* Class Information */}
      <Card title={t('classes.classInfo')} style={{ marginBottom: 24 }}>
        <Descriptions column={2}>
          <Descriptions.Item label={t('classes.name')}>
            <Text strong>{classData.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('classes.code')}>
            <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: '16px' }}>
              {classData.code}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('classes.academicYear')}>
            {classData.metadata?.academicYear || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('classes.createdAt')}>
            {(() => {
              const d = new Date(classData.createdAt);
              const day = d.getDate().toString().padStart(2, '0');
              const month = (d.getMonth() + 1).toString().padStart(2, '0');
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
            })()}
          </Descriptions.Item>
          <Descriptions.Item label={t('classes.students')}>
            <Tag color="green">
              {students.length} {t('classes.students')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('classes.teacher')}>
            <Space>
              <Avatar 
                size="small" 
                src={user?.avatar}
                style={{ backgroundColor: user?.avatar ? 'transparent' : '#52c41a' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'T'}
              </Avatar>
              <div>
                <div style={{ fontWeight: 500 }}>{user?.name || 'Teacher'}</div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {user?.email || 'teacher@example.com'}
                </Text>
              </div>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Students List */}
      <Card title={`${t('classes.students')} (${students.length})`}>
        <Table
          columns={studentColumns}
          dataSource={students}
          rowKey="_id"
          locale={{
            emptyText: t('classes.noStudents')
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} ${t('classes.students')}`,
          }}
        />
      </Card>

      {/* Modals */}
      <EditClassModal
        visible={editModalVisible}
        classData={classData}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
      />

      <AddStudentsModal
        visible={addStudentsModalVisible}
        classData={classData}
        onCancel={() => setAddStudentsModalVisible(false)}
        onSuccess={handleAddStudentsSuccess}
      />
    </div>
  );
};

export default ClassDetail;
