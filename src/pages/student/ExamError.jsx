import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Result, Typography, Space } from 'antd';
import { 
  CloseCircleOutlined, 
  HomeOutlined, 
  StopOutlined,
  ExclamationCircleOutlined,
  BlockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
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

  const getErrorConfig = () => {
    if (errorMessage.includes('maximum') || errorMessage.includes('attempts')) {
      return {
        title: t('takeExam.maxAttemptsReached') || 'Maximum Attempts Reached',
        icon: <StopOutlined className="error-icon max-attempts" />,
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
            <Paragraph className="error-message">
              {errorMessage}
            </Paragraph>
          }
          extra={[
            <Button 
              type="primary" 
              size="large"
              key="home"
              icon={<HomeOutlined />}
              onClick={() => navigate('/student/dashboard')}
              className="back-button"
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

