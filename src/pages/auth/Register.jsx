import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, App, Tabs, Card, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { validatePassword, getPasswordStrength, getPasswordValidationRules } from '../../utils/passwordValidator';
import { ROUTES } from '../../constants/config';
import './AuthPages.css';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ level: '', color: '', percent: 0 });
  const navigate = useNavigate();
  const { message } = App.useApp();
  const register = useAuthStore((state) => state.register);
  const { t } = useTranslation();

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
      message.error(t('register.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        role: activeTab, // student or teacher
      });
      message.success(t('register.registerSuccess'));
      navigate(ROUTES.LOGIN);
    } catch (error) {
      // Error is now a string from axios interceptor
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('register.registerFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
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
            <div className="element element-1">🚀</div>
            <div className="element element-2">📖</div>
            <div className="element element-3">🎯</div>
            <div className="element element-4">💡</div>
          </div>
          <div className="illustration-content">
            <h1>{t('register.joinWith')}</h1>
            <h2 className="brand-name">{t('app.name')}</h2>
            <p>{t('register.startJourney')}</p>
          </div>
          <div className='auth-illustration-img'>
            <img src='/public/education-regis.png' style={{ width: '60%', height: '60%' }}></img>
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

          <h2 className="auth-title">{t('register.title')}</h2>
          <p className="auth-subtitle">
            {t('register.subtitle')}
          </p>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              label={t('register.fullName')}
              name="name"
              rules={[
                { required: true, message: t('register.nameRequired') },
                { min: 2, message: t('register.nameMinLength') },
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder={t('register.namePlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('auth.email')}
              name="email"
              rules={[
                { required: true, message: t('login.emailRequired') },
                { type: 'email', message: t('login.emailInvalid') },
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder={t('login.emailPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('auth.password')}
              name="password"
              rules={getPasswordValidationRules(t)}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
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
                  {t('register.passwordStrength')}: {passwordStrength.level}
                </span>
              </div>
            )}

            <Form.Item
              label={t('register.confirmPasswordLabel')}
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: t('register.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('register.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
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
                {t('register.registerButton')}
              </Button>
            </Form.Item>

            <div className="auth-footer">
              {t('register.haveAccount')}{' '}
              <Link to={ROUTES.LOGIN}>{t('register.loginNow')}</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
