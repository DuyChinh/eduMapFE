import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Space,
  Button,
  Spin,
  message,
  Result,
  Progress,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Divider,
  Modal,
  Avatar,
} from 'antd';
import {
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StarFilled,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examService from '../../api/examService';
import examStatsService from '../../api/examStatsService';
import confetti from 'canvas-confetti';

const { Title, Text, Paragraph } = Typography;

const ExamResult = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [examData, setExamData] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    fetchExamResult();
    fetchLeaderboard();
  }, [examId]);

  const fetchExamResult = async () => {
    setLoading(true);
    try {
      const examResponse = await examService.getExamById(examId);
      setExamData(examResponse.data || examResponse);

      // TODO: Fetch actual submission data
      // const submissionResponse = await examService.getMySubmission(examId);
      // setSubmissionData(submissionResponse.data || submissionResponse);

      // Mock data for now
      setSubmissionData({
        score: 85,
        totalMarks: 100,
        correctAnswers: 17,
        totalQuestions: 20,
        timeSpent: 45, // minutes
        rank: 3,
        percentage: 85,
      });

      // Trigger confetti for good scores
      const percentage = (85 / 100) * 100;
      if (percentage >= 80) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching exam result:', error);
      message.error(t('exams.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await examStatsService.getExamLeaderboard(examId);
      setLeaderboardData(response.data?.leaderboard || response.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#52c41a';
    if (percentage >= 60) return '#1890ff';
    if (percentage >= 40) return '#faad14';
    return '#ff4d4f';
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return { 
      icon: <img src="/1st-medal.png" alt="1st Place" style={{ width: 64, height: 64, objectFit: 'contain' }} />, 
      color: '#FFD700' 
    };
    if (rank === 2) return { 
      icon: <img src="/2nd-medal.png" alt="2nd Place" style={{ width: 64, height: 64, objectFit: 'contain' }} />, 
      color: '#C0C0C0' 
    };
    if (rank === 3) return { 
      icon: <img src="/3rd-medal.png" alt="3rd Place" style={{ width: 64, height: 64, objectFit: 'contain' }} />, 
      color: '#CD7F32' 
    };
    return null;
  };

  const leaderboardColumns = [
    {
      title: t('exams.leaderboard.rank'),
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        if (rank === 1) {
          return (
            <img 
              src="/1st-medal.png" 
              alt="1st Place" 
              style={{ width: 32, height: 32, objectFit: 'contain' }} 
            />
          );
        }
        if (rank === 2) {
          return (
            <img 
              src="/2nd-medal.png" 
              alt="2nd Place" 
              style={{ width: 32, height: 32, objectFit: 'contain' }} 
            />
          );
        }
        if (rank === 3) {
          return (
            <img 
              src="/3rd-medal.png" 
              alt="3rd Place" 
              style={{ width: 32, height: 32, objectFit: 'contain' }} 
            />
          );
        }
        // Color palette for ranks 4+
        const colors = [
          { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' }, // blue
          { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' }, // green
          { bg: '#fff7e6', border: '#ffd591', text: '#fa8c16' }, // orange
          { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' }, // purple
          { bg: '#fff0f6', border: '#ffadd2', text: '#eb2f96' }, // pink
          { bg: '#e6fffb', border: '#87e8de', text: '#13c2c2' }, // cyan
          { bg: '#fcffe6', border: '#eaff8f', text: '#a0d911' }, // lime
          { bg: '#fff1f0', border: '#ffa39e', text: '#f5222d' }, // red
        ];
        const colorIndex = (rank - 4) % colors.length;
        const color = colors[colorIndex];
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: color.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 14,
              color: color.text,
              border: `2px solid ${color.border}`,
            }}
          >
            {rank}
          </div>
        );
      },
    },
    {
      title: t('exams.leaderboard.student'),
      dataIndex: 'student',
      key: 'student',
      render: (student) => (
        <Space>
          <Avatar src={student?.avatar} icon={<UserOutlined />} />
          <div>
            <Text strong>{student?.name || student?.email}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {student?.studentCode}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('exams.leaderboard.score'),
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => (
        <Space direction="vertical" size="small">
          <Text strong style={{ fontSize: 18, color: getScoreColor(record.percentage) }}>
            {score}/{record.totalMarks}
          </Text>
          <Tag color={getScoreColor(record.percentage)}>
            {getGrade(record.percentage)}
          </Tag>
        </Space>
      ),
    },
    {
      title: t('exams.leaderboard.timeSpent'),
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      render: (time) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{Math.floor(time / 60)}h {time % 60}m</Text>
        </Space>
      ),
    },
    {
      title: t('exams.leaderboard.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => new Date(date).toLocaleString('vi-VN'),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!examData || !submissionData) {
    return (
      <Result
        status="404"
        title={t('exams.examNotFound')}
        extra={
          <Button type="primary" onClick={() => navigate('/student/dashboard')}>
            {t('common.backToHome')}
          </Button>
        }
      />
    );
  }

  const percentage = (submissionData.score / submissionData.totalMarks) * 100;
  const scoreColor = getScoreColor(percentage);
  const grade = getGrade(percentage);
  const medal = submissionData.rank ? getRankMedal(submissionData.rank) : null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ fontSize: 48, color: scoreColor }}>
            {percentage >= 60 ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
          </div>

          <div>
            <Title level={2}>{examData.name}</Title>
            <Text type="secondary">{examData.description}</Text>
          </div>

          {medal && (
            <div>
              <div>
                {medal.icon}
              </div>
              <div>
                <Title level={3} style={{ margin: '8px 0 0 0', color: medal.color }}>
                  {t('exams.leaderboard.rank')} #{submissionData.rank}
                </Title>
              </div>
            </div>
          )}

          <Progress
            type="circle"
            percent={Math.round(percentage)}
            width={150}
            strokeColor={{
              '0%': scoreColor,
              '100%': scoreColor,
            }}
            format={() => (
              <div>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: scoreColor }}>
                  {grade}
                </div>
                <div style={{ fontSize: 14 }}>{Math.round(percentage)}%</div>
              </div>
            )}
          />

          <Title level={1} style={{ margin: 0, color: scoreColor }}>
            {submissionData.score} / {submissionData.totalMarks}
          </Title>

          <Text type="secondary" style={{ fontSize: 16 }}>
            {t('takeExam.yourScore')}
          </Text>
        </Space>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('exams.stats.totalQuestions')}
              value={submissionData.totalQuestions}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('exams.submissions.submitted')}
              value={submissionData.correctAnswers}
              suffix={`/ ${submissionData.totalQuestions}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('exams.leaderboard.timeSpent')}
              value={submissionData.timeSpent}
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('takeExam.percentage')}
              value={Math.round(percentage)}
              suffix="%"
              valueStyle={{ color: scoreColor }}
              prefix={<StarFilled />}
            />
          </Card>
        </Col>
      </Row>

      {/* Leaderboard Section */}
      {examData.settings?.showLeaderboard && leaderboardData.length > 0 && (
        <Card 
          title={
            <Space>
              <TrophyOutlined />
              {t('exams.leaderboard.rank')}
            </Space>
          }
          style={{ marginBottom: 24 }}
          extra={
            <Button 
              type="link" 
              onClick={() => setShowLeaderboard(true)}
            >
              {t('exams.viewDetail')}
            </Button>
          }
        >
          <Table
            columns={leaderboardColumns}
            dataSource={leaderboardData.slice(0, 5)}
            pagination={false}
            rowKey={(record) => record._id || record.id}
            scroll={{ x: 800 }}
          />
        </Card>
      )}

      {/* Actions */}
      <Card>
        <Space size="middle" style={{ width: '100%', justifyContent: 'center', display: 'flex', flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="large"
            icon={<HomeOutlined />}
            onClick={() => navigate('/student/dashboard')}
          >
            {t('common.backToHome')}
          </Button>
          
          {examData.settings?.showCorrectAnswer && (
            <Button
              size="large"
              onClick={() => navigate(`/student/exams/${examId}/review`)}
            >
              {t('exams.reviewAnswers')}
            </Button>
          )}
        </Space>
      </Card>

      {/* Leaderboard Modal */}
      <Modal
        title={
          <Space>
            <TrophyOutlined />
            {t('exams.leaderboard.rank')}
          </Space>
        }
        open={showLeaderboard}
        onCancel={() => setShowLeaderboard(false)}
        footer={null}
        width={900}
      >
        <Table
          columns={leaderboardColumns}
          dataSource={leaderboardData}
          pagination={{ pageSize: 10 }}
          rowKey={(record) => record._id || record.id}
          scroll={{ x: 800 }}
        />
      </Modal>
    </div>
  );
};

export default ExamResult;

