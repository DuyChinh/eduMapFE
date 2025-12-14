import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

/**
 * Public exam access page - allows students to access exam via share code
 * Route: /exam/:shareCode
 */
const PublicTakeExam = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [examInfo, setExamInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [examId, setExamId] = useState(null);
  const [examExpired, setExamExpired] = useState(false);
  const [examExpiredMessage, setExamExpiredMessage] = useState('');
  const hasCalledRef = useRef(false); // Track if API has been called for this shareCode

  useEffect(() => {
    if (!shareCode) return;
    
    // Reset flag if shareCode changed
    hasCalledRef.current = false;
    
    let isMounted = true;
    const abortController = new AbortController();
    
    const loadExam = async () => {
      // Prevent duplicate calls (React Strict Mode causes double mount in dev)
      if (hasCalledRef.current) {
        return;
      }
      hasCalledRef.current = true;
      
      try {
        setLoading(true);
        const examService = (await import('../../api/examService')).default;
        const response = await examService.getExamByShareCode(shareCode);
        
        // Check if request was aborted or component unmounted
        if (abortController.signal.aborted || !isMounted) {
          return;
        }
        
        // Axios interceptor returns response.data, so response is already { ok: true, data: {...} }
        if (response && response.ok && response.data) {
          setExamInfo(response.data);
          setExamId(response.data._id);
          
          // Check if exam requires password
          // examPassword is a boolean flag from API (true if password required, false otherwise)
          if (response.data.examPassword === true) {
            setShowPasswordInput(true);
          } else {
            // No password required, redirect to TakeExam
            // Store examId and shareCode in sessionStorage for TakeExam to use
            sessionStorage.setItem('examId', response.data._id);
            sessionStorage.setItem('shareCode', shareCode);
            // Clear any old password
            sessionStorage.removeItem('examPassword');
            navigate(`/student/exam/${response.data._id}/take`, { replace: true });
          }
        } else {
          // Response doesn't have expected format, treat as error
          throw new Error(response?.message || 'Exam not found or not available');
        }
      } catch (error) {
        if (!isMounted) return; // Component unmounted, don't update state
        
        // Handle error - could be string or object
        let errorMessage = '';
        let statusCode = null;
        
        if (typeof error === 'string') {
          // Error was transformed to string by axios interceptor
          errorMessage = error;
        } else {
          // Error is an object
          errorMessage = error?.response?.data?.message || 
                        error?.data?.message || 
                        error?.message || 
                        '';
          statusCode = error?.response?.status || error?.status;
        }
        
        const isExpiredError = 
          statusCode === 404 || 
          statusCode === 403 ||
          errorMessage.includes('not available') ||
          errorMessage.includes('no longer available') ||
          errorMessage.includes('Exam not found') ||
          errorMessage.includes('Exam not found or not available');
        
        if (isExpiredError) {
          setExamExpired(true);
          setExamExpiredMessage(errorMessage || t('takeExam.examExpiredDescription'));
          setLoading(false);
          return;
        }
        
        message.error(t('publicTakeExam.examNotFound'));
        window.location.href = '/';
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExam();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [shareCode, navigate, t]);

  const handleStartExam = async () => {
    if (!examId) return;

    try {
      // Note: We can't verify password on client side since API doesn't return actual password
      // Password will be verified by backend when starting submission
      // Just store the password and let backend verify it

      // Store examId, password, and shareCode in sessionStorage for TakeExam to use
      sessionStorage.setItem('examId', examId);
      sessionStorage.setItem('shareCode', shareCode);
      // Always store password if exam requires it (examPassword flag is true)
      if (examInfo.examPassword === true) {
        sessionStorage.setItem('examPassword', password);
      }
      
      // Redirect to TakeExam page
      navigate(`/student/exam/${examId}/take`, { replace: true });
    } catch (error) {
      message.error(t('publicTakeExam.failedToStart'));
    }
  };

  if (loading && !examExpired) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Text>{t('publicTakeExam.loading')}</Text>
      </div>
    );
  }

  // Show exam expired screen
  if (examExpired) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
        <Card style={{ maxWidth: 500, textAlign: 'center', padding: '40px' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3} type="danger">{t('takeExam.examExpired')}</Title>
              <Paragraph type="secondary">
                {examExpiredMessage || t('takeExam.examExpiredDescription')}
              </Paragraph>
            </div>
            <div style={{ fontSize: '48px' }}>⏰</div>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.location.href = '/student/dashboard'}
            >
              {t('takeExam.backToDashboard')}
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (!examInfo) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Card>
          <Title level={4}>{t('publicTakeExam.examNotFound')}</Title>
          <Button onClick={() => window.location.href = '/'}>{t('publicTakeExam.goHome')}</Button>
        </Card>
      </div>
    );
  }

  if (showPasswordInput) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 500 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3}>{examInfo.name}</Title>
              <Text type="secondary">{examInfo.description}</Text>
            </div>
            
            <div>
              <Text strong>{t('publicTakeExam.duration')}: </Text>
              <Text>{examInfo.duration} {t('publicTakeExam.minutes')}</Text>
            </div>
            
            <div>
              <Text strong>{t('publicTakeExam.totalMarks')}: </Text>
              <Text>{examInfo.totalMarks}</Text>
            </div>

            <Input.Password
              placeholder={t('publicTakeExam.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleStartExam}
              size="large"
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" onClick={handleStartExam} size="large">
                {t('publicTakeExam.startExam')}
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
};

export default PublicTakeExam;

