import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Button, Typography, Space, Progress, Divider, Tag, Spin, Result } from 'antd';
import { 
  CheckCircleOutlined, ClockCircleOutlined, 
  TrophyOutlined, HomeOutlined, UserOutlined 
} from '@ant-design/icons';
import guestService from '../../api/guestService';

const { Title, Text, Paragraph } = Typography;

/**
 * Guest Exam Result Component
 * Route: /guest/result/:submissionId
 */
const GuestExamResult = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  const [result, setResult] = useState(location.state?.result || null);
  const [guestName, setGuestName] = useState(location.state?.guestName || '');
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we have result from navigation state, use it
    if (result) {
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchResult = async () => {
      try {
        const response = await guestService.getSubmission(submissionId);
        if (response && response.ok && response.data) {
          setResult(response.data);
          setGuestName(response.data.guestName || '');
        } else {
          throw new Error('Failed to load result');
        }
      } catch (err) {
        console.error('Error fetching result:', err);
        setError(err?.message || t('guestResult.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submissionId, result, t]);

  // Format time spent
  const formatTimeSpent = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 24 }}>
        <Result
          status="error"
          title={t('guestResult.errorTitle')}
          subTitle={error || t('guestResult.notFound')}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          }
        />
      </div>
    );
  }

  const isLate = result.status === 'late';
  const percentageColor = result.percentage >= 80 ? '#52c41a' : 
                         result.percentage >= 50 ? '#faad14' : '#ff4d4f';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      padding: 24,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Success Icon */}
          <div>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          </div>

          {/* Title */}
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {t('guestResult.examCompleted')}
            </Title>
            <Space style={{ marginTop: 8 }}>
              <UserOutlined />
              <Text type="secondary">{guestName}</Text>
              <Tag color="orange">{t('guestExam.guestMode')}</Tag>
            </Space>
          </div>

          <Divider />

          {/* Score */}
          <div>
            <Progress
              type="circle"
              percent={result.percentage || 0}
              strokeColor={percentageColor}
              format={(percent) => (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 'bold' }}>{percent}%</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {result.score}/{result.maxScore}
                  </div>
                </div>
              )}
              size={150}
            />
          </div>

          {/* Stats */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 32,
            flexWrap: 'wrap'
          }}>
            <div>
              <ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <div>
                <Text strong>{formatTimeSpent(result.timeSpent)}</Text>
                <div><Text type="secondary">{t('guestResult.timeSpent')}</Text></div>
              </div>
            </div>
            
            <div>
              <TrophyOutlined style={{ fontSize: 20, color: '#faad14' }} />
              <div>
                <Text strong>{result.score || 0}</Text>
                <div><Text type="secondary">{t('guestResult.score')}</Text></div>
              </div>
            </div>
          </div>

          {/* Status */}
          {isLate && (
            <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
              {t('guestResult.lateSubmission')}
            </Tag>
          )}

          <Divider />

          {/* Message */}
          <Paragraph type="secondary">
            {t('guestResult.thankYouMessage')}
          </Paragraph>

          {/* Actions */}
          <Button 
            type="primary" 
            size="large" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            block
          >
            {t('common.goHome')}
          </Button>
          
          <Button 
            type="default" 
            size="large"
            onClick={() => navigate('/login')}
            block
            style={{ 
              marginTop: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              height: 48,
              fontSize: 15,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            ✨ {t('guestResult.registerCTA')}
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default GuestExamResult;
