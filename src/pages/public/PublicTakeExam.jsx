import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Typography, message, Divider } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

/**
 * Public exam access page - allows students to access exam via share code
 * Route: /exam/:shareCode
 * 
 * Flow:
 * 1. If user is logged in -> redirect to authenticated TakeExam
 * 2. If exam allows everyone (isAllowUser: 'everyone') -> show guest name input
 * 3. If exam requires login -> redirect to login page
 */
const PublicTakeExam = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  
  const [examInfo, setExamInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [examId, setExamId] = useState(null);
  const [examExpired, setExamExpired] = useState(false);
  const [examExpiredMessage, setExamExpiredMessage] = useState('');
  const [startingExam, setStartingExam] = useState(false);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!shareCode) return;
    
    hasCalledRef.current = false;
    
    let isMounted = true;
    const abortController = new AbortController();
    
    const loadExam = async () => {
      if (hasCalledRef.current) {
        return;
      }
      hasCalledRef.current = true;
      
      try {
        setLoading(true);
        const examService = (await import('../../api/examService')).default;
        const response = await examService.getExamByShareCode(shareCode);
        
        if (abortController.signal.aborted || !isMounted) {
          return;
        }
        
        if (response && response.ok && response.data) {
          setExamInfo(response.data);
          setExamId(response.data._id);
          
          const examData = response.data;
          const requiresPassword = examData.examPassword === true;
          const allowsEveryone = examData.isAllowUser === 'everyone';
          const userLoggedIn = isAuthenticated && user;
          
          // If user is logged in, redirect to authenticated exam page
          if (userLoggedIn) {
            sessionStorage.setItem('examId', examData._id);
            sessionStorage.setItem('shareCode', shareCode);
            sessionStorage.removeItem('examPassword');
            
            if (requiresPassword) {
              setShowPasswordInput(true);
            } else {
              navigate(`/student/exam/${examData._id}/take`, { replace: true });
            }
          } 
          // If exam allows everyone and user is not logged in, show guest flow
          else if (allowsEveryone) {
            // Show guest name input (and password if required)
            setShowGuestInput(true);
            if (requiresPassword) {
              setShowPasswordInput(true);
            }
          } 
          // Exam requires login
          else {
            message.info(t('publicTakeExam.loginRequired'));
            sessionStorage.setItem('examId', examData._id);
            sessionStorage.setItem('shareCode', shareCode);
            navigate('/login', { 
              replace: true, 
              state: { from: `/exam/${shareCode}` } 
            });
          }
        } else {
          throw new Error(response?.message || 'Exam not found or not available');
        }
      } catch (error) {
        if (!isMounted) return;
        
        let errorMessage = '';
        let statusCode = null;
        
        if (typeof error === 'string') {
          errorMessage = error;
        } else {
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
  }, [shareCode, navigate, t, isAuthenticated, user]);

  // Handle authenticated user starting exam
  const handleStartExamAuthenticated = async () => {
    if (!examId) return;

    try {
      sessionStorage.setItem('examId', examId);
      sessionStorage.setItem('shareCode', shareCode);
      if (examInfo.examPassword === true) {
        sessionStorage.setItem('examPassword', password);
      }
      
      navigate(`/student/exam/${examId}/take`, { replace: true });
    } catch (error) {
      message.error(t('publicTakeExam.failedToStart'));
    }
  };

  // Handle guest user starting exam
  const handleStartExamAsGuest = async () => {
    if (!examId || !guestName.trim()) {
      message.error(t('publicTakeExam.guestNameRequired'));
      return;
    }

    if (guestName.trim().length > 128) {
      message.error(t('publicTakeExam.guestNameTooLong'));
      return;
    }

    try {
      setStartingExam(true);
      const guestService = (await import('../../api/guestService')).default;
      
      const response = await guestService.startSubmission({
        examId,
        guestName: guestName.trim(),
        password: password || undefined
      });

      if (response && response.ok && response.data) {
        // Store guest session data
        sessionStorage.setItem('guestSubmissionId', response.data.submission._id);
        sessionStorage.setItem('guestName', guestName.trim());
        sessionStorage.setItem('guestExamData', JSON.stringify(response.data.exam));
        sessionStorage.setItem('guestQuestionOrder', JSON.stringify(response.data.submission.questionOrder));
        
        // Navigate to guest exam page
        navigate(`/guest/exam/${response.data.submission._id}/take`, { replace: true });
      } else {
        throw new Error(response?.message || 'Failed to start exam');
      }
    } catch (error) {
      console.error('Error starting guest exam:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.data?.message || 
                          error?.message || 
                          t('publicTakeExam.failedToStart');
      message.error(errorMessage);
    } finally {
      setStartingExam(false);
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
              onClick={() => window.location.href = '/'}
            >
              {t('common.goHome')}
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

  // Show guest name input (for guests taking exams with isAllowUser: 'everyone')
  if (showGuestInput) {
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

            <Divider />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {t('publicTakeExam.enterYourName')}
              </Text>
              <Input
                prefix={<UserOutlined />}
                placeholder={t('publicTakeExam.guestNamePlaceholder')}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                size="large"
                maxLength={128}
              />
            </div>

            {showPasswordInput && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {t('publicTakeExam.examPassword')}
                </Text>
                <Input.Password
                  placeholder={t('publicTakeExam.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onPressEnter={handleStartExamAsGuest}
                  size="large"
                />
              </div>
            )}

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="primary" 
                onClick={handleStartExamAsGuest} 
                size="large"
                loading={startingExam}
                disabled={!guestName.trim()}
              >
                {t('publicTakeExam.startExam')}
              </Button>
            </Space>

            <Divider>
              <Text type="secondary">{t('publicTakeExam.or')}</Text>
            </Divider>

            <Button 
              block 
              onClick={() => {
                sessionStorage.setItem('examId', examId);
                sessionStorage.setItem('shareCode', shareCode);
                navigate('/login', { state: { from: `/exam/${shareCode}` } });
              }}
            >
              {t('publicTakeExam.loginToTakeExam')}
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Show password input only (for authenticated users)
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
              onPressEnter={handleStartExamAuthenticated}
              size="large"
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" onClick={handleStartExamAuthenticated} size="large">
                {t('publicTakeExam.startExam')}
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    );
  }

  return null;
};

export default PublicTakeExam;
