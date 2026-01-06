import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Spin,
  Row,
  Col,
  Divider,
  DatePicker,
} from 'antd';
import {
  MailOutlined,
  UserOutlined,
  EditOutlined,
  CameraOutlined,
  LoadingOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  SketchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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

const roleIconMap = {
  [USER_ROLES.TEACHER]: '👨‍🏫',
  [USER_ROLES.STUDENT]: '👨‍🎓',
  [USER_ROLES.ADMIN]: '👑',
};

const planConfig = {
  free: { color: 'default', icon: <SketchOutlined />, label: 'Free', bg: '#8c8c8c' },
  plus: { color: 'blue', icon: <ThunderboltOutlined />, label: 'Plus', bg: '#1890ff' },
  pro: { color: 'gold', icon: <CrownOutlined />, label: 'Pro', bg: '#faad14' }
};

const Profile = () => {
  const { t } = useTranslation();
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

  const roleLabel = t(`role.${user.role}`);

  const showEditModal = () => {
    form.setFieldsValue({
      name: user.name,
      phone: user.phone || user.profile?.phone || '',
      address: user.address || '',
      dob: user.dob ? dayjs(user.dob) : null,
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
      message.error(t('profile.uploadError.type'));
      return false;
    }

    // Validate file size (max 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('profile.uploadError.size'));
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
        message.success(t('profile.uploadSuccess', 'Avatar uploaded successfully!'));
      } else {
        console.error('Unexpected response structure:', response);
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error(t('profile.uploadError.failed'));
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
        phone: values.phone?.trim() || null,
        address: values.address?.trim() || null,
        dob: values.dob ? values.dob.toISOString() : null,
      };

      // Only update avatar if a new one was uploaded
      // Use dot notation to update nested field without overwriting entire profile object
      if (avatarUrl) {
        updateData['profile.avatar'] = avatarUrl;
      }

      await updateProfile(user._id || user.id, updateData);
      message.success(t('profile.updateSuccess'));
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

  const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  // Helper to format DOB
  const formattedDOB = user.dob ? new Date(user.dob).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : t('profile.notProvided');

  // Get display phone
  const displayPhone = user.phone || user.profile?.phone;

  // Subscription Details
  const subscription = user.subscription || { plan: 'free' };
  const { plan, expiresAt } = subscription;
  const planInfo = planConfig[plan] || planConfig.free;
  
  const daysRemaining = expiresAt ? dayjs(expiresAt).diff(dayjs(), 'day') : null;
  const expirationDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  return (
    <div className="profile-page-container">
      {/* Profile Header Card */}
      <Card className="profile-hero-card" variant="borderless">
        <div className="profile-hero-content">
          <div className="profile-avatar-section">
              <div className="avatar-wrapper">
                <Avatar
                  size={140}
                  src={currentAvatarSrc}
                  icon={!currentAvatarSrc && <UserOutlined />}
                  className="profile-main-avatar"
                />
                <div className="avatar-badge">
                  <span className="role-emoji">{roleIconMap[user.role]}</span>
                </div>
                {/* Subscription Tier Badge */}
                <div 
                  className="tier-badge"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: -15,
                    background: planInfo.bg,
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 2,
                    border: '2px solid white'
                  }}
                >
                  {planInfo.icon} {planInfo.label}
                </div>
              </div>
          </div>

          <div className="profile-info-section">
            <div className="profile-name-row">
              <Title level={2} className="profile-name">
                {user.name}
              </Title>
              {user.status === 'active' && (
                <CheckCircleOutlined className="verified-badge" />
              )}
            </div>

            <Space size="middle" wrap className="profile-tags">
              <Tag
                color={roleColorMap[user.role]}
                className="role-tag"
                icon={<SafetyOutlined />}
              >
                {roleLabel}
              </Tag>
              {user.status && (
                <Tag
                  color={user.status === 'active' ? 'success' : 'default'}
                  className="status-tag"
                >
                  {t(`status.${user.status}`, user.status.charAt(0).toUpperCase() + user.status.slice(1))}
                </Tag>
              )}
            </Space>

            <div className="profile-contact-info">
              <Space direction="vertical" size="small">
                <div className="contact-item">
                  <MailOutlined className="contact-icon" />
                  <Text className="contact-text">{user.email}</Text>
                </div>
                {displayPhone && (
                  <div className="contact-item">
                    <PhoneOutlined className="contact-icon" />
                    <Text className="contact-text">{displayPhone}</Text>
                  </div>
                )}
                <div className="contact-item">
                  <CalendarOutlined className="contact-icon" />
                  <Text className="contact-text" type="secondary">
                    {t('profile.joined')} {createdDate}
                  </Text>
                </div>
              </Space>
            </div>
          </div>

          <div className="profile-action-section">
            <Button
              type="primary"
              size="large"
              icon={<EditOutlined />}
              onClick={showEditModal}
              className="edit-profile-btn"
            >
              {t('profile.editProfile')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <IdcardOutlined />
                <span>{t('profile.accountInfo')}</span>
              </Space>
            }
            variant="borderless"
            className="info-card"
          >
            <Descriptions column={1} styles={{ label: { fontWeight: 600 } }}>
              <Descriptions.Item label={t('profile.fullName')}>{user.name}</Descriptions.Item>
              <Descriptions.Item label={t('profile.email')}>{user.email}</Descriptions.Item>
              <Descriptions.Item label={t('profile.role')}>{roleLabel}</Descriptions.Item>
              <Descriptions.Item label={t('profile.accountStatus')}>
                <Tag color={user.status === 'active' ? 'success' : 'default'}>
                  {t(`status.${user.status}`, user.status)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>{t('profile.additionalInfo')}</span>
              </Space>
            }
            variant="borderless"
            className="info-card"
          >
            <Descriptions column={1} styles={{ label: { fontWeight: 600 } }}>
              <Descriptions.Item label={t('profile.phone')}>
                {displayPhone || <Text type="secondary">{t('profile.notProvided')}</Text>}
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.dob')}>
                {formattedDOB}
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.address')}>
                {user.address || <Text type="secondary">{t('profile.notProvided')}</Text>}
              </Descriptions.Item>
              {user.profile?.studentId ? (
                <Descriptions.Item label={t('profile.studentId')}>{user.profile.studentId}</Descriptions.Item>
              ) : null}
              <Descriptions.Item label={t('profile.memberSince')}>
                {createdDate}
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.subscriptionPlan')}>
                <Space>
                  <Tag color={planInfo.color} icon={planInfo.icon}>
                    {planInfo.label.toUpperCase()}
                  </Tag>
                  {daysRemaining !== null && (
                    <Tag color={daysRemaining < 0 ? 'error' : (daysRemaining <= 7 ? 'warning' : 'success')}>
                      {daysRemaining < 0 ? t('profile.expired') : `${daysRemaining} ${t('profile.daysLeft')}`}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              {expirationDate && (
                <Descriptions.Item label={t('profile.expiresOn')}>
                  {expirationDate}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Edit Profile Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>{t('profile.editProfile')}</span>
          </Space>
        }
        open={editModalVisible}
        onCancel={handleCancel}
        onOk={handleSave}
        confirmLoading={loading}
        width={600}
        okText={t('profile.saveChanges')}
        cancelText={t('profile.cancel')}
        className="edit-profile-modal"
      >
        <Divider />

        <Form form={form} layout="vertical">
          <div className="modal-avatar-section">
            <div className="modal-avatar-preview">
              <Avatar
                size={120}
                src={avatarUrl || currentAvatarSrc}
                icon={!avatarUrl && !currentAvatarSrc && <UserOutlined />}
                className="modal-avatar"
              />
              {uploading && (
                <div className="avatar-uploading-overlay">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#fff' }} spin />} />
                </div>
              )}
            </div>

            <div className="modal-avatar-actions">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleUpload}
                disabled={uploading}
              >
                <Button
                  icon={<CameraOutlined />}
                  loading={uploading}
                  size="large"
                  type="dashed"
                  block
                >
                  {uploading ? t('profile.uploading') : t('profile.uploadAvatar')}
                </Button>
              </Upload>
              <Text type="secondary" className="upload-hint">
                {t('profile.uploadHint')}
              </Text>
            </div>
          </div>

          <Divider />

          <Form.Item
            label={t('profile.fullName')}
            name="name"
            rules={[
              { required: true, message: t('profile.validation.nameRequired') },
              { min: 2, message: t('profile.validation.nameMin') },
              { max: 50, message: t('profile.validation.nameMax') },
            ]}
          >
            <Input
              size="large"
              placeholder={t('profile.enterName')}
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('profile.phone')}
                name="phone"
                rules={[
                  {
                    pattern: /^[0-9+\-\s()]*$/,
                    message: t('profile.validation.phoneInvalid')
                  },
                  {
                    min: 10,
                    message: t('profile.validation.phoneMin')
                  },
                  {
                    max: 15,
                    message: t('profile.validation.phoneMax')
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={t('profile.enterPhone')}
                  prefix={<PhoneOutlined />}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('profile.dob')}
                name="dob"
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={t('profile.selectDate')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t('profile.address')}
            name="address"
          >
            <Input
              size="large"
              placeholder={t('profile.enterAddress')}
              prefix={<EnvironmentOutlined />}
              allowClear
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
