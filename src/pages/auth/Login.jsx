import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, App, Tabs, Card } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import authService from '../../api/authService';
import { ROUTES, USER_ROLES } from '../../constants/config';
import './AuthPages.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const login = useAuthStore((state) => state.login);
  const { t } = useTranslation();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values);
      message.success(t('login.loginSuccess'));
      
      console.log('Login result:', result); // Debug log
      
      // Redirect based on user role
      if (result.user?.role === USER_ROLES.TEACHER) {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
      } else if (result.user?.role === USER_ROLES.STUDENT) {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      } else {
        // Fallback if role not found
        console.warn('User role not found, redirecting to student dashboard');
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error); // Debug log
      // Convert error to string if it's an Error object
      const errorMessage = error instanceof Error ? error.message : (error || t('login.loginFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      // Show loading message
      message.loading(t('login.googleRedirecting'), 0);
      
      // Redirect to Google OAuth
      authService.loginWithGoogle();
    } catch (error) {
      message.destroy(); // Clear loading message
      message.error(t('login.googleLoginFailed'));
      console.error('Google login error:', error);
    }
  };

  const tabItems = [
    {
      key: 'student',
      label: t('role.student'),
    },
    {
      key: 'teacher',
      label: t('role.teacher'),
    },
  ];

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-illustration">
          <div className="floating-elements">
            <div className="element element-1">📚</div>
            <div className="element element-2">✏️</div>
            <div className="element element-3">🎓</div>
            <div className="element element-4">⭐</div>
          </div>
          <div className="illustration-content">
            <h1>{t('login.welcome')}</h1>
            <h2 className="brand-name">{t('app.name')}</h2>
            <p>{t('app.description')}</p>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <Card className="auth-card" variant="borderless">
          <div className="auth-header">
            <img src="/logo.png" alt="Logo" className="auth-logo" />
          </div>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={tabItems}
            centered
            className="role-tabs"
          />

          <h2 className="auth-title">{t('auth.login')}</h2>
          <p className="auth-subtitle">
            {t('login.subtitle')}
          </p>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              label={t('auth.email')}
              name="email"
              rules={[
                { required: true, message: t('login.emailRequired') },
                { type: 'email', message: t('login.emailInvalid') },
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder={t('login.emailPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('auth.password')}
              name="password"
              rules={[{ required: true, message: t('login.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
              />
            </Form.Item>

            <div className="auth-actions">
              <Link to={ROUTES.FORGOT_PASSWORD} className="forgot-link">
                {t('login.forgotPassword')}
              </Link>
            </div>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                className="submit-btn"
              >
                {t('login.loginButton')}
              </Button>
            </Form.Item>

            <div className="divider">
              <span>{t('login.orDivider')}</span>
            </div>

            <Button 
              icon={<GoogleOutlined />}
              block
              onClick={handleGoogleLogin}
              className="google-btn"
            >
              {t('login.googleLogin')}
            </Button>

            <div className="auth-footer">
              {t('login.noAccount')}{' '}
              <Link to={ROUTES.REGISTER}>{t('login.registerNow')}</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
