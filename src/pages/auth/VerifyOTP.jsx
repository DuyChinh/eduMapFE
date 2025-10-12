import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Form, Input, Button, App, Card, Typography, Space, Alert } from 'antd';
import { ArrowLeftOutlined, SafetyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import authService from '../../api/authService';
import { ROUTES } from '../../constants/config';
import './AuthPages.css';

const { Title, Text } = Typography;

const VerifyOTP = () => {
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { message } = App.useApp();

  useEffect(() => {
    // Get email from location state
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // If no email in state, redirect to forgot password
      navigate(ROUTES.FORGOT_PASSWORD);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) return;
    
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Auto focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtpValues = [...otpValues];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtpValues[i] = pastedData[i];
    }
    
    setOtpValues(newOtpValues);
    
    // Focus on the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = async () => {
    const otpCode = otpValues.join('');
    
    // Validate OTP
    if (otpCode.length !== 6) {
      message.error(t('verifyOTP.otpLength'));
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOTP({
        email: email,
        otp: otpCode
      });
      message.success(t('verifyOTP.success'));
      // Navigate to reset password with email
      navigate(ROUTES.RESET_PASSWORD, { 
        state: { email: email, verified: true } 
      });
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('verifyOTP.failed'));
      message.error(errorMessage);
      // Clear OTP on error
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setTimeLeft(15 * 60);
      setCanResend(false);
      message.success(t('verifyOTP.resendSuccess'));
      
      // Clear OTP inputs after successful resend
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('verifyOTP.resendFailed'));
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
            <div className="element element-2">📱</div>
            <div className="element element-3">✉️</div>
          </div>
          <div className="illustration-content">
            <h1>{t('verifyOTP.title')}</h1>
            <h2 className="brand-name">{t('app.name')}</h2>
            <p>{t('verifyOTP.subtitle')}</p>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <Card className="auth-card" variant="borderless">
          <Link to={ROUTES.FORGOT_PASSWORD} className="back-link">
            <ArrowLeftOutlined /> {t('verifyOTP.backToForgot')}
          </Link>

          <Title level={2} className="auth-title">{t('verifyOTP.title')}</Title>
          <Text className="auth-subtitle">
            {t('verifyOTP.instruction', { email: email })}
          </Text>

          <Alert
            message={t('verifyOTP.timeRemaining')}
            description={`${formatTime(timeLeft)} - ${t('verifyOTP.timeDescription')}`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <div className="otp-input-container">
            <Text className="otp-label">{t('verifyOTP.otpLabel')}</Text>
            <div className="otp-inputs">
              {otpValues.map((value, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  maxLength={1}
                  className="otp-input"
                  style={{
                    width: '50px',
                    height: '50px',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: '2px solid #d9d9d9',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          <Button 
            type="primary" 
            onClick={handleVerifyOTP}
            block 
            loading={loading}
            className="submit-btn"
            style={{ marginTop: '24px' }}
            disabled={otpValues.join('').length !== 6}
          >
            {t('verifyOTP.verifyButton')}
          </Button>

            <div className="auth-footer">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button 
                  type="link" 
                  onClick={handleResendOTP}
                  disabled={loading}
                  loading={loading}
                >
                  {t('verifyOTP.resendButton')}
                </Button>
              </Space>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOTP;
