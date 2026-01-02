import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Table,
  Avatar,
  Progress,
  Empty,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
  BarChartOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examService from '../../api/examService';
import examStatsService from '../../api/examStatsService';
import { ROUTES } from '../../constants/config';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ExamDetailNew = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [examData, setExamData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [statsLoading, setStatsLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    fetchExamDetail();
  }, [examId]);

  const fetchExamDetail = async () => {
    setLoading(true);
    try {
      const response = await examService.getExamById(examId);
      setExamData(response.data || response);
    } catch (error) {
      console.error('Error fetching exam:', error);
      message.error(t('exams.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const response = await examStatsService.getExamStatistics(examId);
      setStatistics(response.data || response);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      message.error(t('exams.examStats.fetchFailed'));
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const response = await examStatsService.getExamLeaderboard(examId);
      setLeaderboard(response.data || response || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      message.error(t('exams.leaderboard.fetchFailed'));
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const response = await examStatsService.getStudentSubmissions(examId);
      setSubmissions(response.data || response || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      message.error(t('exams.submissions.fetchFailed'));
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'statistics' && !statistics) {
      fetchStatistics();
    } else if (key === 'leaderboard' && leaderboard.length === 0) {
      fetchLeaderboard();
    } else if (key === 'students' && submissions.length === 0) {
      fetchSubmissions();
    }
  };

  const handleDelete = async () => {
    try {
      await examService.deleteExam(examId);
      message.success(t('exams.deleteSuccess'));
      navigate(ROUTES.TEACHER_EXAMS);
    } catch (error) {
      console.error('Error deleting exam:', error);
      message.error(t('exams.deleteFailed'));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      published: 'green',
      archived: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const statuses = {
      draft: t('exams.statusDraft'),
      published: t('exams.statusPublished'),
      archived: t('exams.statusArchived')
    };
    return statuses[status] || status;
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
        const colors = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
        return (
          <Tag color={colors[rank] || 'default'} style={{ fontSize: '16px', fontWeight: 'bold' }}>
            #{rank}
          </Tag>
        );
      },
    },
    {
      title: t('exams.leaderboard.student'),
      key: 'student',
      render: (_, record) => (
        <Space>
          <Avatar src={record.student?.avatar} icon={!record.student?.avatar && <TeamOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.student?.name || record.student?.email}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.student?.studentCode}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('exams.leaderboard.score'),
      dataIndex: 'score',
      key: 'score',
      width: 120,
      render: (score, record) => (
        <div>
          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
            {score}/{record.totalMarks}
          </Text>
          <Progress
            percent={Math.round((score / record.totalMarks) * 100)}
            size="small"
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: t('exams.leaderboard.timeSpent'),
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      width: 120,
      render: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      },
    },
    {
      title: t('exams.leaderboard.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 170,
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/exams/${examId}/submissions/${record.student?._id}`)}
        >
          {t('exams.viewDetail')}
        </Button>
      ),
    },
  ];

  const submissionsColumns = [
    {
      title: t('exams.submissions.student'),
      key: 'student',
      render: (_, record) => (
        <Space>
          <Avatar src={record.student?.avatar} icon={!record.student?.avatar && <TeamOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.student?.name || record.student?.email}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.student?.studentCode}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('exams.submissions.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusConfig = {
          submitted: { color: 'green', text: t('exams.submissions.submitted') },
          in_progress: { color: 'blue', text: t('exams.submissions.inProgress') },
          not_started: { color: 'default', text: t('exams.submissions.notStarted') },
        };
        const config = statusConfig[status] || statusConfig.not_started;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t('exams.submissions.score'),
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score, record) => {
        if (record.status !== 'submitted') return '-';
        return (
          <div>
            <Text strong style={{ fontSize: 14 }}>
              {score || 0}/{record.totalMarks}
            </Text>
            <Progress
              percent={Math.round(((score || 0) / record.totalMarks) * 100)}
              size="small"
              showInfo={false}
              status={score >= record.totalMarks * 0.8 ? 'success' : score >= record.totalMarks * 0.5 ? 'normal' : 'exception'}
            />
          </div>
        );
      },
    },
    {
      title: t('exams.submissions.timeSpent'),
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      width: 120,
      render: (minutes) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      },
    },
    {
      title: t('exams.submissions.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 170,
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/exams/${examId}/submissions/${record.student?._id}`)}
          disabled={record.status === 'not_started'}
        >
          {t('exams.viewDetail')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!examData) {
    return (
      <Empty
        description={t('exams.examNotFound')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => navigate(ROUTES.TEACHER_EXAMS)}>
          {t('common.back')}
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(ROUTES.TEACHER_EXAMS)}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>{examData.name}</Title>
          <Tag color={getStatusColor(examData.status)}>
            {getStatusText(examData.status)}
          </Tag>
        </Space>

        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
          >
            {t('exams.edit')}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            {t('exams.delete')}
          </Button>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={handleTabChange} size="large">
        <TabPane
          tab={<span><InfoCircleOutlined /> {t('exams.tabs.overview')}</span>}
          key="overview"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card>
                <Descriptions title={t('exams.basicInfo')} bordered column={{ xs: 1, sm: 2 }}>
                  <Descriptions.Item label={t('exams.description')} span={2}>
                    {examData.description || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.examPurpose')}>
                    <Tag>{examData.examPurpose}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.duration')}>
                    {examData.duration} {t('exams.minutes')}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.totalMarks')}>
                    {examData.totalMarks}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.maxAttempts')}>
                    {examData.maxAttempts}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.startTime')}>
                    {examData.startTime ? new Date(examData.startTime).toLocaleString('vi-VN') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('exams.endTime')}>
                    {examData.endTime ? new Date(examData.endTime).toLocaleString('vi-VN') : '-'}
                  </Descriptions.Item>
                </Descriptions>

                {examData.questions && examData.questions.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={4}>{t('exams.questions')}</Title>
                    <Table
                      dataSource={examData.questions}
                      rowKey={(record) => record.questionId?._id || record.questionId}
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: t('exams.order'),
                          dataIndex: 'order',
                          key: 'order',
                          width: 80,
                        },
                        {
                          title: t('questions.name'),
                          key: 'name',
                          render: (_, record) => record.questionId?.name || '-',
                        },
                        {
                          title: t('questions.type'),
                          key: 'type',
                          width: 120,
                          render: (_, record) => (
                            <Tag>{record.questionId?.type}</Tag>
                          ),
                        },
                        {
                          title: t('exams.marks'),
                          dataIndex: 'marks',
                          key: 'marks',
                          width: 80,
                        },
                      ]}
                    />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card>
                  <Statistic
                    title={t('exams.examStats.totalQuestions')}
                    value={examData.questions?.length || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
                <Card>
                  <Statistic
                    title={t('exams.examStats.totalSubmissions')}
                    value={statistics?.totalSubmissions || 0}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
                <Card>
                  <Statistic
                    title={t('exams.examStats.averageScore')}
                    value={statistics?.averageScore || 0}
                    suffix={`/ ${examData.totalMarks}`}
                    precision={1}
                    prefix={<TrophyOutlined />}
                  />
                </Card>
              </Space>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={<span><BarChartOutlined /> {t('exams.tabs.statistics')}</span>}
          key="statistics"
        >
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin />
            </div>
          ) : statistics ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={t('exams.examStats.totalSubmissions')}
                    value={statistics.totalSubmissions || 0}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={t('exams.examStats.averageScore')}
                    value={statistics.averageScore || 0}
                    suffix={`/ ${examData.totalMarks}`}
                    precision={1}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={t('exams.examStats.highestScore')}
                    value={statistics.highestScore || 0}
                    suffix={`/ ${examData.totalMarks}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={t('exams.examStats.passRate')}
                    value={statistics.passRate || 0}
                    suffix="%"
                    precision={1}
                  />
                </Card>
              </Col>
            </Row>
          ) : (
            <Empty description={t('exams.examStats.noData')} />
          )}
        </TabPane>

        <TabPane
          tab={<span><TrophyOutlined /> {t('exams.tabs.leaderboard')}</span>}
          key="leaderboard"
        >
          <Card>
            {leaderboardLoading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin />
              </div>
            ) : (
              <Table
                columns={leaderboardColumns}
                dataSource={leaderboard}
                rowKey={(record) => record.student?._id}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
                locale={{ emptyText: t('exams.leaderboard.noData') }}
              />
            )}
          </Card>
        </TabPane>

        <TabPane
          tab={<span><TeamOutlined /> {t('exams.tabs.students')}</span>}
          key="students"
        >
          <Card>
            {submissionsLoading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin />
              </div>
            ) : (
              <Table
                columns={submissionsColumns}
                dataSource={submissions}
                rowKey={(record) => record._id || record.student?._id}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                locale={{ emptyText: t('exams.submissions.noData') }}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ExamDetailNew;

