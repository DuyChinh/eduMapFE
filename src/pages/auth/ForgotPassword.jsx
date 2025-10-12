import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, App, Card } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import authService from '../../api/authService';
import { ROUTES } from '../../constants/config';
import './AuthPages.css';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.forgotPassword(values.email);
      message.success(t('forgotPassword.sendSuccess'));
      // Navigate to OTP verification page with email
      navigate(ROUTES.VERIFY_OTP, { 
        state: { email: values.email } 
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
              name="email"
              rules={[
                { required: true, message: t('forgotPassword.emailRequired') },
                { type: 'email', message: t('forgotPassword.emailInvalid') },
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder={t('forgotPassword.emailPlaceholder')}
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