import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, App, Card } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import authService from '../../api/authService';
import { ROUTES } from '../../constants/config';
import './AuthPages.css';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { message } = App.useApp();

  useEffect(() => {
    // Get email from navigation state
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // If no email provided, redirect back to login
      message.error(t('forgotPassword.emailRequired'));
      navigate(ROUTES.LOGIN);
    }
  }, [location.state, navigate, message, t]);

  const onFinish = async () => {
    if (!email) {
      message.error(t('forgotPassword.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      message.success(t('forgotPassword.sendSuccess'));
      // Navigate to OTP verification page with email
      navigate(ROUTES.VERIFY_OTP, { 
        state: { email: email } 
      });
    } catch (error) {
       // Error is now a string from axios interceptor
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('forgotPassword.sendFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-illustration">
          <div className="floating-elements">
            <div className="element element-1">🔐</div>
            <div className="element element-2">🔑</div>
            <div className="element element-3">🛡️</div>
          </div>
          <div className="illustration-content">
            <h1>{t('auth.forgotPassword')}</h1>
            <h2 className="brand-name">{t('app.name')}</h2>
            <p>{t('forgotPassword.subtitle')}</p>
          </div>
          <div className='auth-illustration-img-forgot'>
              <img src='/forgot-password.webp' style={{ width: '80%', height: '80%' }}></img>
            </div>
        </div>
      </div>
      
      <div className="auth-right">
        <Card className="auth-card" variant="borderless">
          <Link to={ROUTES.LOGIN} className="back-link">
            <ArrowLeftOutlined /> {t('forgotPassword.backToLogin')}
          </Link>

          <h2 className="auth-title">{t('forgotPassword.title')}</h2>
          <p className="auth-subtitle">
            {t('forgotPassword.subtitle')}
          </p>

          <Form
            name="forgot-password"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              label={t('forgotPassword.emailLabel')}
            >
              <Input 
                prefix={<MailOutlined />} 
                value={email}
                readOnly
                style={{ 
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                className="submit-btn"
              >
                {t('forgotPassword.sendButton')}
              </Button>
            </Form.Item>

            <div className="auth-footer">
              {t('forgotPassword.rememberPassword')}{' '}
              <Link to={ROUTES.LOGIN}>{t('forgotPassword.loginNow')}</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;