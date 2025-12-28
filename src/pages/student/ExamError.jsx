import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Result, Typography, Space, message, Spin } from 'antd';
import { 
  CloseCircleOutlined, 
  HomeOutlined, 
  StopOutlined,
  ExclamationCircleOutlined,
  BlockOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { startSubmission } from '../../api/submissionService';
import './ExamError.css';

const { Paragraph } = Typography;

/**
 * Error page displayed when exam cannot be started
 * Shows error message instead of toast notification
 */
const ExamError = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Get error message from location state or default
  const errorMessage = location.state?.errorMessage || t('takeExam.failedToStart');
  const errorType = location.state?.errorType || 'error'; // 'maxAttempts', 'notAvailable', etc.
  const examId = location.state?.examId || null; // Get examId from location state
  const shareCode = location.state?.shareCode || null; // Get shareCode if exists
  
  // Countdown state
  const [countdown, setCountdown] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [autoStarting, setAutoStarting] = useState(false);
  const hasAutoStartedRef = useRef(false); // Prevent multiple auto-start attempts
  
  // Parse start time from error message
  useEffect(() => {
    if (errorMessage.includes('will begin at') || errorMessage.includes('The exam will begin at')) {
      // Extract date string from message like "will begin at 22:36:58 29/12/2025"
      // or "The exam will begin at 22:36:58 29/12/2025"
      const match = errorMessage.match(/(?:will begin at|The exam will begin at)\s+(.+)/i);
      if (match) {
        const dateStr = match[1].trim();
        // Remove trailing period if exists
        const cleanDateStr = dateStr.replace(/\.$/, '');
        
        // Try to parse Vietnamese date format: "22:36:58 29/12/2025"
        const parts = cleanDateStr.split(' ');
        if (parts.length >= 2) {
          const timePart = parts[0]; // "22:36:58" or "22:36"
          const datePart = parts[1]; // "29/12/2025"
          
          if (datePart && datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            const timeParts = timePart.split(':');
            const hour = parseInt(timeParts[0]) || 0;
            const minute = parseInt(timeParts[1]) || 0;
            const second = parseInt(timeParts[2]) || 0;
            
            // Create date in local timezone
            const startDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              hour,
              minute,
              second
            );
            
            // Validate date
            if (!isNaN(startDate.getTime()) && startDate > new Date()) {
              setCountdown(startDate);
            }
          }
        }
      }
    }
  }, [errorMessage]);
  
  // Update countdown every second and auto-start when countdown reaches 0
  useEffect(() => {
    if (!countdown) return;
    
    const updateCountdown = async () => {
      const now = new Date();
      const diff = Math.max(0, countdown.getTime() - now.getTime());
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ days, hours, minutes, seconds });
      
      // Auto-start exam when countdown reaches 0
      if (diff === 0 && examId && !hasAutoStartedRef.current) {
        hasAutoStartedRef.current = true;
        setAutoStarting(true);
        
        try {
          // Get password from sessionStorage if exists
          const storedPassword = sessionStorage.getItem('examPassword') || null;
          
          // Try to start exam
          await startSubmission(examId, storedPassword || '');
          
          // Success - redirect to exam page
          message.success(t('takeExam.examStarted') || 'Exam started successfully!');
          
          // Small delay to show success message
          setTimeout(() => {
            if (shareCode) {
              navigate(`/exam/${shareCode}`, { replace: true });
            } else {
              navigate(`/student/exam/${examId}/take`, { replace: true });
            }
          }, 500);
        } catch (error) {
          // Handle errors
          hasAutoStartedRef.current = false; // Allow retry
          setAutoStarting(false);
          
          const errorMsg = error?.response?.data?.message || error?.message || t('takeExam.failedToStart');
          
          // If password error, we can't auto-start (need user input)
          if (errorMsg.includes('password') || errorMsg.includes('Invalid exam password')) {
            message.warning(t('takeExam.passwordRequired') || 'Password required. Please click "Back to Dashboard" and try again.');
          } else {
            // Other errors - show message and allow manual retry
            message.error(errorMsg);
          }
        }
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [countdown, examId, shareCode, navigate, t]);
  
  // Format countdown text as HH:MM:SS or DD:HH:MM:SS
  const formatCountdown = () => {
    const { days, hours, minutes, seconds } = timeRemaining;
    
    // Format as HH:MM:SS or DD:HH:MM:SS
    const formatTime = (value) => String(value).padStart(2, '0');
    
    if (days > 0) {
      return `${formatTime(days)}:${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;
    } else {
      return `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;
    }
  };
  
  // Format countdown with labels (for display below)
  const formatCountdownWithLabels = () => {
    const { days, hours, minutes, seconds } = timeRemaining;
    const parts = [];
    
    if (days > 0) {
      parts.push(`${days} ${t('takeExam.days')}`);
    }
    if (hours > 0 || days > 0) {
      parts.push(`${hours} ${t('takeExam.hours')}`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
      parts.push(`${minutes} ${t('takeExam.minutes')}`);
    }
    parts.push(`${seconds} ${t('takeExam.seconds')}`);
    
    return parts.join(' ');
  };

  const getErrorConfig = () => {
    if (errorMessage.includes('maximum') || errorMessage.includes('attempts')) {
      return {
        title: t('takeExam.maxAttemptsReached') || 'Maximum Attempts Reached',
        icon: <StopOutlined className="error-icon max-attempts" />,
        status: 'error'
      };
    }
    if (errorMessage.includes('Time limit exceeded') || errorType === 'timeExceeded') {
      return {
        title: t('takeExam.timeLimitExceeded') || 'Time Limit Exceeded',
        icon: <ClockCircleOutlined className="error-icon time-exceeded" />,
        status: 'error'
      };
    }
    if (errorMessage.includes('not available') || errorMessage.includes('no longer available')) {
      return {
        title: t('takeExam.examNotAvailable') || 'Exam Not Available',
        icon: <BlockOutlined className="error-icon not-available" />,
        status: 'warning'
      };
    }
    if (errorMessage.includes('not available yet')) {
      return {
        title: t('takeExam.examNotAvailableYet') || 'Exam Not Available Yet',
        icon: <ExclamationCircleOutlined className="error-icon not-available-yet" />,
        status: 'info'
      };
    }
    return {
      title: t('takeExam.errorTitle') || 'Cannot Start Exam',
      icon: <CloseCircleOutlined className="error-icon general-error" />,
      status: 'error'
    };
  };

  const errorConfig = getErrorConfig();

  return (
    <div className="exam-error-container">
      <div className="exam-error-content">
        <Result
          status={errorConfig.status}
          icon={errorConfig.icon}
          title={
            <Typography.Title level={3} className="error-title">
              {errorConfig.title}
            </Typography.Title>
          }
          subTitle={
            <div>
              <Paragraph className="error-message">
                {errorMessage}
              </Paragraph>
              {countdown && (
                <div className="countdown-container">
                  {autoStarting ? (
                    <div className="auto-starting-container">
                      <Spin size="large" />
                      <Typography.Text className="auto-starting-text">
                        {t('takeExam.autoStarting') || 'Starting exam...'}
                      </Typography.Text>
                    </div>
                  ) : (
                    <>
                      <ClockCircleOutlined className="countdown-icon" />
                      <div className="countdown-content">
                        <Typography.Text className="countdown-label">
                          {t('takeExam.countdownLabel')}:
                        </Typography.Text>
                        <Typography.Text className="countdown-text">
                          {formatCountdown()}
                        </Typography.Text>
                        <Typography.Text className="countdown-detail">
                          ({formatCountdownWithLabels()})
                        </Typography.Text>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          }
          extra={[
            <Button 
              type="primary" 
              size="large"
              key="home"
              icon={<HomeOutlined />}
              onClick={() => window.location.href = '/student/dashboard'}
              className="back-button highlight-button"
            >
              {t('common.backToDashboard') || 'Back to Dashboard'}
            </Button>
          ]}
        />
      </div>
    </div>
  );
};

export default ExamError;

