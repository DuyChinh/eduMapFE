import { useState } from 'react';
import { 
  Card, 
  Descriptions, 
  Avatar, 
  Typography, 
  Space, 
  Tag, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Upload, 
  message, 
  Spin 
} from 'antd';
import { 
  MailOutlined, 
  UserOutlined, 
  EditOutlined, 
  CameraOutlined, 
  LoadingOutlined 
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';
import { USER_ROLES } from '../constants/config';
import uploadService from '../api/uploadService';
import './Profile.css';

const { Title, Paragraph, Text } = Typography;

const roleColorMap = {
  [USER_ROLES.TEACHER]: 'blue',
  [USER_ROLES.STUDENT]: 'green',
  [USER_ROLES.ADMIN]: 'red',
};

const Profile = () => {
  const { user, updateProfile } = useAuthStore();
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPublicId, setAvatarPublicId] = useState(null);

  if (!user) {
    return null;
  }

  const currentAvatarSrc = avatarUrl || user.profile?.avatar || user.avatar;

  const roleLabel =
    user.role === USER_ROLES.TEACHER
      ? 'Teacher'
      : user.role === USER_ROLES.STUDENT
      ? 'Student'
      : user.role === USER_ROLES.ADMIN
      ? 'Admin'
      : user.role;

  const showEditModal = () => {
    form.setFieldsValue({
      name: user.name,
    });
    setAvatarUrl(null);
    setAvatarPublicId(null);
    setEditModalVisible(true);
  };

  const handleCancel = async () => {
    // If user uploaded a new avatar but didn't save, delete it from Cloudinary
    if (avatarPublicId) {
      try {
        await uploadService.deleteImage(avatarPublicId);
        console.log('Deleted unused avatar from Cloudinary');
      } catch (error) {
        console.error('Error deleting unused avatar:', error);
        // Continue with cancel even if deletion fails
      }
    }

    setEditModalVisible(false);
    setAvatarUrl(null);
    setAvatarPublicId(null);
    form.resetFields();
  };

  const handleUpload = async (file) => {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    // Validate file size (max 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    setUploading(true);
    try {
      // If there's already a temporary uploaded avatar, delete it first
      if (avatarPublicId) {
        try {
          await uploadService.deleteImage(avatarPublicId);
        } catch (error) {
          console.error('Error deleting previous temp avatar:', error);
        }
      }

      const response = await uploadService.uploadImage(file);
      
      // Response structure after axios interceptor: { success: true, data: { url, public_id } }
      if (response.success && response.data?.url) {
        setAvatarUrl(response.data.url);
        setAvatarPublicId(response.data.public_id);
        message.success('Avatar uploaded successfully!');
      } else {
        console.error('Unexpected response structure:', response);
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }

    return false; // Prevent default upload behavior
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const updateData = {
        name: values.name,
      };

      // Only update avatar if a new one was uploaded
      // Use dot notation to update nested field without overwriting entire profile object
      if (avatarUrl) {
        updateData['profile.avatar'] = avatarUrl;
      }

      await updateProfile(user._id || user.id, updateData);
      message.success('Profile updated successfully!');
      setEditModalVisible(false);
      setAvatarUrl(null);
      setAvatarPublicId(null); // Clear public_id after successful save
      form.resetFields();
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || 'Failed to update profile';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Card className="profile-card" bordered={false}>
        <div className="profile-header">
          <div className="profile-info">
            <Avatar 
              size={100} 
              src={currentAvatarSrc} 
              icon={!currentAvatarSrc && <UserOutlined />}
              className="profile-avatar"
            />
            <div className="profile-details">
              <Title level={3} style={{ marginBottom: 8 }}>
                {user.name}
              </Title>
              <Space>
                <Tag color={roleColorMap[user.role] || 'default'}>{roleLabel}</Tag>
                {user.status && (
                  <Tag color={user.status === 'active' ? 'success' : 'default'}>
                    {user.status}
                  </Tag>
                )}
              </Space>
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                <MailOutlined style={{ marginRight: 8 }} />
                {user.email}
              </Paragraph>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={showEditModal}
            size="large"
          >
            Edit Profile
          </Button>
        </div>
      </Card>

      <Card title="Account Information" bordered={false} style={{ marginTop: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{roleLabel}</Descriptions.Item>
          <Descriptions.Item label="Status">{user.status}</Descriptions.Item>
          {user.profile?.phone && (
            <Descriptions.Item label="Phone">{user.profile.phone}</Descriptions.Item>
          )}
          {user.profile?.studentId && (
            <Descriptions.Item label="Student ID">{user.profile.studentId}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Modal
        title="Edit Profile"
        open={editModalVisible}
        onCancel={handleCancel}
        onOk={handleSave}
        confirmLoading={loading}
        width={500}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <div className="avatar-upload-section">
            <div className="avatar-preview">
              <Avatar 
                size={100} 
                src={avatarUrl || currentAvatarSrc} 
                icon={!avatarUrl && !currentAvatarSrc && <UserOutlined />}
              />
              {uploading && (
                <div className="avatar-uploading-overlay">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                </div>
              )}
            </div>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleUpload}
              disabled={uploading}
            >
              <Button icon={<CameraOutlined />} loading={uploading}>
                {uploading ? 'Uploading...' : 'Change Avatar'}
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              Max size: 5MB. Supported: JPG, PNG, GIF, WEBP
            </Text>
          </div>

          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter your name!' },
              { min: 2, message: 'Name must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="Enter your name" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
