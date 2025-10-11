import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, App, Card, Progress } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import authService from '../../api/authService';
import { validatePassword, getPasswordStrength, getPasswordValidationRules } from '../../utils/passwordValidator';
import { ROUTES } from '../../constants/config';
import './AuthPages.css';

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ level: '', color: '', percent: 0 });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { t } = useTranslation();
  const { message } = App.useApp();

  useEffect(() => {
    if (!token) {
      message.error(t('resetPassword.invalidToken'));
      navigate(ROUTES.LOGIN);
    }
  }, [token, navigate, message, t]);

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordStrength(getPasswordStrength(pwd));
  };

  const onFinish = async (values) => {
    // Validate password
    const validation = validatePassword(values.password);
    if (!validation.isValid) {
      message.error(validation.errors[0]);
      return;
    }

    // Check password confirmation
    if (values.password !== values.confirmPassword) {
      message.error(t('resetPassword.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        token: token,
        newPassword: values.password,
      });
      message.success(t('resetPassword.resetSuccess'));
      navigate(ROUTES.LOGIN);
    } catch (error) {
      // Error is now a string from axios interceptor
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('resetPassword.resetFailed'));
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
            <div className="element element-2">🔒</div>
            <div className="element element-3">✨</div>
          </div>
          <div className="illustration-content">
            <h1>{t('resetPassword.createNew')}</h1>
            <h2 className="brand-name">{t('app.name')}</h2>
            <p>{t('resetPassword.strongPassword')}</p>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <Card className="auth-card" variant="borderless">
          <h2 className="auth-title">{t('resetPassword.title')}</h2>
          <p className="auth-subtitle">
            {t('resetPassword.subtitle')}
          </p>

          <Form
            name="reset-password"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              label={t('resetPassword.newPassword')}
              name="password"
              rules={getPasswordValidationRules(t)}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                onChange={handlePasswordChange}
              />
            </Form.Item>

            {password && (
              <div className="password-strength">
                <Progress 
                  percent={passwordStrength.percent} 
                  strokeColor={passwordStrength.color}
                  showInfo={false}
                  size="small"
                />
                <span style={{ color: passwordStrength.color, fontSize: '12px' }}>
                  {t('resetPassword.passwordStrength')}: {passwordStrength.level}
                </span>
              </div>
            )}

            <Form.Item
              label={t('resetPassword.confirmPassword')}
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: t('resetPassword.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('resetPassword.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
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
                {t('resetPassword.resetButton')}
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

export default ResetPassword;