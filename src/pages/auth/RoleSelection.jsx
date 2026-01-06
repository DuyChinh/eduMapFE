import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, App } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { USER_ROLES, ROUTES } from '../../constants/config';

const { Title, Text } = Typography;

const RoleSelection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { switchRole, user } = useAuthStore();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role) => {
    setLoading(true);
    try {
      await switchRole(role);
      message.success(t('auth.roleSelectionSuccess') || 'Role updated successfully!');
      
      if (role === USER_ROLES.TEACHER) {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
    } catch (error) {
      console.error('Failed to set role:', error);
      message.error(t('auth.roleSelectionError') || 'Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5',
      padding: '24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2}>{t('auth.welcome') || 'Welcome to EduMap'}</Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          {t('auth.selectRolePrompt') || 'Please select your role to continue'}
        </Text>
      </div>

      <Row gutter={[24, 24]} justify="center" style={{ width: '100%', maxWidth: '800px' }}>
        <Col xs={24} sm={12}>
          <Card
            hoverable
            style={{ 
              textAlign: 'center', 
              height: '100%',
              borderRadius: '16px',
              border: '2px solid transparent',
              transition: 'all 0.3s'
            }}
            bodyStyle={{ 
              padding: '40px 24px',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
            onClick={() => handleRoleSelect(USER_ROLES.STUDENT)}
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: '#e6f7ff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <UserOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
            </div>
            <Title level={3}>{t('auth.student') || 'Student'}</Title>
            <Text type="secondary">
              {t('auth.studentDescription') || 'I want to learn and take exams'}
            </Text>
            <Button 
              type="primary" 
              size="large" 
              style={{ marginTop: '24px', width: '100%' }}
              loading={loading}
              onClick={(e) => {
                e.stopPropagation();
                handleRoleSelect(USER_ROLES.STUDENT);
              }}
            >
              {t('auth.continueAsStudent') || 'Continue as Student'}
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card
            hoverable
            style={{ 
              textAlign: 'center',
              height: '100%',
              borderRadius: '16px', 
              border: '2px solid transparent',
              transition: 'all 0.3s'
            }}
            bodyStyle={{ 
              padding: '40px 24px',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
            onClick={() => handleRoleSelect(USER_ROLES.TEACHER)}
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: '#fff7e6', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <TeamOutlined style={{ fontSize: '40px', color: '#fa8c16' }} />
            </div>
            <Title level={3}>{t('auth.teacher') || 'Teacher'}</Title>
            <Text type="secondary">
              {t('auth.teacherDescription') || 'I want to create exams and manage classes'}
            </Text>
            <Button 
              type="default" 
              size="large" 
              style={{ marginTop: '24px', width: '100%', borderColor: '#fa8c16', color: '#fa8c16' }}
              loading={loading}
              onClick={(e) => {
                e.stopPropagation();
                handleRoleSelect(USER_ROLES.TEACHER);
              }}
            >
              {t('auth.continueAsTeacher') || 'Continue as Teacher'}
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RoleSelection;
