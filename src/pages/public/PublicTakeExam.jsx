import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, message, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { startSubmission } from '../../api/submissionService';
import TakeExam from '../student/TakeExam';

const { Title, Text } = Typography;

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

  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);
        const examService = (await import('../../api/examService')).default;
        const response = await examService.getExamByShareCode(shareCode);
        
        if (response.data) {
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
        }
      } catch (error) {
        message.error(t('publicTakeExam.examNotFound'));
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (shareCode) {
      loadExam();
    }
  }, [shareCode, navigate]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Text>{t('publicTakeExam.loading')}</Text>
      </div>
    );
  }

  if (!examInfo) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Card>
          <Title level={4}>{t('publicTakeExam.examNotFound')}</Title>
          <Button onClick={() => navigate('/')}>{t('publicTakeExam.goHome')}</Button>
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

