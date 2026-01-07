import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, App, Card } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import authService from '../../api/authService';
import { ROUTES, USER_ROLES } from '../../constants/config';
import { FcGoogle } from "react-icons/fc";
import './AuthPages.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailForForgotPassword, setEmailForForgotPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const login = useAuthStore((state) => state.login);
  const { t } = useTranslation();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values);
      message.success(t('login.loginSuccess'));


      // Check for redirect path
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Redirect based on user role
      if (result.user?.role === USER_ROLES.TEACHER) {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
      } else if (result.user?.role === USER_ROLES.STUDENT) {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      } else {
        // Fallback if role not found
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error); // Debug log
      // Error is now a string from axios interceptor
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('login.loginFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (googleLoading) return; // Prevent multiple clicks
    
    try {
      setGoogleLoading(true);
      // Show loading message
      message.loading(t('login.googleRedirecting'), 0);

      // Redirect to Google OAuth
      authService.loginWithGoogle();
    } catch (error) {
      setGoogleLoading(false);
      message.destroy(); // Clear loading message
      message.error(t('login.googleLoginFailed'));
      console.error('Google login error:', error);
    }
  };

  const handleForgotPassword = () => {
    if (!emailForForgotPassword) {
      message.error(t('login.emailRequiredForForgotPassword'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForForgotPassword)) {
      message.error(t('login.emailInvalidForForgotPassword'));
      return;
    }

    // Navigate to forgot password with email
    navigate(ROUTES.FORGOT_PASSWORD, {
      state: { email: emailForForgotPassword }
    });
  };

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

          <div className='auth-illustration-img'>
            <img src='/education.png' style={{ width: '60%', height: '60%' }}></img>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <Card className="auth-card" variant="borderless">
          <div className="auth-header">
            <img src="/logo.png" alt="Logo" className="auth-logo" />
          </div>

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
                onChange={(e) => setEmailForForgotPassword(e.target.value)}
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
              <button
                type="button"
                onClick={handleForgotPassword}
                className="forgot-link"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1890ff',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {t('login.forgotPassword')}
              </button>
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
              icon={<FcGoogle style={{ fontSize: '16px' }} />}
              block
              onClick={handleGoogleLogin}
              loading={googleLoading}
              disabled={googleLoading}
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
