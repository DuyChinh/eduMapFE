import { Card, Descriptions, Avatar, Typography, Space, Tag } from 'antd';
import { MailOutlined, UserOutlined } from '@ant-design/icons';
import useAuthStore from '../store/authStore';
import { USER_ROLES } from '../constants/config';

const { Title, Paragraph } = Typography;

const roleColorMap = {
  [USER_ROLES.TEACHER]: 'blue',
  [USER_ROLES.STUDENT]: 'green',
  [USER_ROLES.ADMIN]: 'red',
};

const Profile = () => {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const avatarSrc = user.profile?.avatar || user.avatar;

  const roleLabel =
    user.role === USER_ROLES.TEACHER
      ? 'Teacher'
      : user.role === USER_ROLES.STUDENT
      ? 'Student'
      : user.role === USER_ROLES.ADMIN
      ? 'Admin'
      : user.role;

  return (
    <div className="profile-page">
      <Card className="profile-card" bordered={false}>
        <Space align="center" size="large">
          <Avatar size={80} src={avatarSrc} icon={!avatarSrc && <UserOutlined />} />
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              {user.name}
            </Title>
            <Space>
              <Tag color={roleColorMap[user.role] || 'default'}>{roleLabel}</Tag>
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              <MailOutlined style={{ marginRight: 8 }} />
              {user.email}
            </Paragraph>
          </div>
        </Space>
      </Card>

      <Card title="Account Information" bordered={false} style={{ marginTop: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{roleLabel}</Descriptions.Item>
          <Descriptions.Item label="Status">{user.status}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default Profile;


