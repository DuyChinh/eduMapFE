import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Table,
  Space,
  Tag,
  Button,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Progress,
  Empty,
  Spin,
  message,
  Tabs,
  Divider,
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  BarChartOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getMySubmissions } from '../../api/submissionService';
import useAuthStore from '../../store/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ExamResults = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [filters, setFilters] = useState({
    subject: null,
    dateRange: null,
    status: null,
    answerFilter: null, // 'all', 'correct', 'incorrect'
  });

  useEffect(() => {
    fetchExamResults();
  }, [filters.subject, filters.dateRange, filters.status]);

  useEffect(() => {
    applyAnswerFilter();
  }, [filters.answerFilter, submissions]);

  const fetchExamResults = async () => {
    setLoading(true);
    try {
      const params = {
        subject: filters.subject,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
        status: filters.status,
      };

      const response = await getMySubmissions(params);
      const data = Array.isArray(response) ? response : (response.data || response.items || []);

      setSubmissions(data);
      setFilteredSubmissions(data);

      // Calculate overall stats
      if (data.length > 0) {
        const totalExams = data.length;
        const totalScore = data.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalMarks = data.reduce((sum, s) => sum + (s.totalMarks || 0), 0);
        const averageScore = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
        const totalTimeSpent = data.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
        const passedExams = data.filter(s => {
          const percentage = s.totalMarks > 0 ? ((s.score || 0) / s.totalMarks) * 100 : 0;
          return percentage >= 50;
        }).length;
        const passRate = totalExams > 0 ? (passedExams / totalExams) * 100 : 0;

        setOverallStats({
          totalExams,
          averageScore,
          totalTimeSpent,
          passRate,
        });
      } else {
        setOverallStats({
          totalExams: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          passRate: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
      message.error(t('exams.submissions.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const applyAnswerFilter = () => {
    if (filters.answerFilter === 'all' || !filters.answerFilter) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter(submission => {
      if (!submission.answers || submission.answers.length === 0) return false;

      const correctCount = submission.answers.filter(a => a.isCorrect).length;
      const incorrectCount = submission.answers.length - correctCount;

      if (filters.answerFilter === 'correct') {
        return correctCount > 0;
      } else if (filters.answerFilter === 'incorrect') {
        return incorrectCount > 0;
      }

      return true;
    });

    setFilteredSubmissions(filtered);
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

  const formatTimeSpent = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const formatNumber = (num) => num < 10 ? `0${num}` : `${num}`;
    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(secs)}`;
  };

  const getCorrectAnswerCount = (submission) => {
    if (!submission.answers) return 0;
    return submission.answers.filter(a => a.isCorrect).length;
  };

  const getTotalQuestions = (submission) => {
    return submission.answers?.length || 0;
  };

  const examHistoryColumns = [
    {
      title: t('exams.name'),
      dataIndex: 'exam',
      key: 'examName',
      render: (exam) => {
        const examData = typeof exam === 'object' ? exam : {};
        return (
          <div>
            <Text strong>{examData?.name || '-'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {examData?.subject || '-'}
            </Text>
          </div>
        );
      },
    },
    {
      title: t('exams.submissions.score'),
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score, record) => {
        const totalMarks = record.totalMarks || 1;
        const percentage = (score / totalMarks) * 100;
        const formattedScore = typeof score === 'number' ? Number(score.toFixed(2)) : (score || 0);
        return (
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 16, color: getScoreColor(percentage) }}>
              {formattedScore}/{totalMarks}
            </Text>
            <Progress
              percent={Math.round(percentage)}
              size="small"
              strokeColor={getScoreColor(percentage)}
              showInfo={false}
            />
            <Tag color={getScoreColor(percentage)}>{getGrade(percentage)}</Tag>
          </Space>
        );
      },
    },
    {
      title: t('exams.leaderboard.timeSpent'),
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      width: 120,
      render: (time) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{formatTimeSpent(time)}</Text>
        </Space>
      ),
    },
    {
      title: t('exams.submissions.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date) => (
        date ? new Date(date).toLocaleString('vi-VN') : '-'
      ),
    },
    {
      title: t('exams.submissions.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          submitted: { color: 'green', text: t('exams.submissions.submitted') },
          graded: { color: 'blue', text: t('exams.submissions.graded') },
          late: { color: 'orange', text: t('exams.submissions.late') },
          in_progress: { color: 'default', text: t('exams.submissions.inProgress') },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/student/results/${record._id}`)}
          >
            {t('exams.viewDetail')}
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'history',
      label: (
        <Space>
          <img src="/exam-results.png" alt="History" style={{ width: 16, height: 16 }} />
          {t('exams.examHistory')}
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              placeholder={t('exams.filterBySubject')}
              style={{ width: 200 }}
              allowClear
              value={filters.subject}
              onChange={(value) => setFilters({ ...filters, subject: value })}
            >
              <Option value="Math">{t('subjects.math')}</Option>
              <Option value="Physics">{t('subjects.physics')}</Option>
              <Option value="Chemistry">{t('subjects.chemistry')}</Option>
              <Option value="English">{t('subjects.english')}</Option>
            </Select>

            <Select
              placeholder={t('exams.filterByStatus')}
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="submitted">{t('exams.submissions.submitted')}</Option>
              <Option value="graded">{t('exams.submissions.graded')}</Option>
              <Option value="late">{t('exams.submissions.late')}</Option>
            </Select>

            <Select
              placeholder={t('studentResults.filterByAnswer')}
              style={{ width: 180 }}
              allowClear
              value={filters.answerFilter}
              onChange={(value) => setFilters({ ...filters, answerFilter: value || 'all' })}
            >
              <Option value="all">{t('studentResults.allAnswers')}</Option>
              <Option value="correct">{t('studentResults.correctAnswers')}</Option>
              <Option value="incorrect">{t('studentResults.incorrectAnswers')}</Option>
            </Select>

            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              style={{ width: 300 }}
            />
          </div>

          <Table
            columns={examHistoryColumns}
            dataSource={filteredSubmissions}
            loading={loading}
            rowKey={(record) => record._id || record.id}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} ${t('exams.items') || 'exams'}`,
            }}
          />
        </div>
      ),
    },
    {
      key: 'statistics',
      label: (
        <Space>
          <img src="/statistic.png" alt="Statistics" style={{ width: 16, height: 16 }} />
          {t('exams.tabs.statistics')}
        </Space>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('exams.stats.totalSubmissions')}
                  value={overallStats?.totalExams || 0}
                  prefix={<img src="/exam-results.png" alt="Submissions" style={{ width: 20, height: 20 }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('exams.stats.averageScore')}
                  value={overallStats?.averageScore || 0}
                  precision={1}
                  suffix="%"
                  prefix={<img src="/statistic.png" alt="Average" style={{ width: 20, height: 20 }} />}
                  valueStyle={{ color: getScoreColor(overallStats?.averageScore || 0) }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('exams.leaderboard.timeSpent')}
                  value={overallStats?.totalTimeSpent ? Math.floor(overallStats.totalTimeSpent / 3600) : 0}
                  suffix={t('common.hours') || 'hours'}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('exams.stats.passRate')}
                  value={overallStats?.passRate || 0}
                  precision={1}
                  suffix="%"
                  prefix={<img src="/leaderboard.png" alt="Pass Rate" style={{ width: 20, height: 20 }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* Left Sidebar */}
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                {overallStats?.totalExams > 0 && filteredSubmissions.length > 0
                  ? (() => {
                    const latest = filteredSubmissions[0];
                    const totalMarks = latest.totalMarks || 1;
                    const percentage = ((latest.score || 0) / totalMarks) * 100;
                    const formattedScore = typeof latest.score === 'number' ? Number(latest.score.toFixed(2)) : (latest.score || 0);
                    return `${formattedScore}/${totalMarks}`;
                  })()
                  : '0/0'}
              </Title>
              <Text type="secondary">{t('studentResults.currentScore')}</Text>
            </div>

            <Divider />

            <div>
              <Title level={5}>{t('studentResults.detailedInfo')}</Title>

              {filteredSubmissions.length > 0 && (() => {
                const latest = filteredSubmissions[0];
                return (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>{t('studentResults.timeSpent')}: </Text>
                      <Text>{formatTimeSpent(latest.timeSpent)}</Text>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Text strong>{t('studentResults.submittedAt')}: </Text>
                      <Text>
                        {latest.submittedAt
                          ? new Date(latest.submittedAt).toLocaleString('vi-VN')
                          : '-'
                        }
                      </Text>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Text strong>{t('studentResults.mcq')}: </Text>
                      <Text>
                        {getCorrectAnswerCount(latest)} ({getCorrectAnswerCount(latest)}/{getTotalQuestions(latest)} {t('studentResults.questions')})
                      </Text>
                    </div>

                    <Divider />

                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Button
                        icon={<EyeOutlined />}
                        block
                        onClick={() => {
                          if (filteredSubmissions.length > 0) {
                            navigate(`/student/results/${filteredSubmissions[0]._id}`);
                          }
                        }}
                      >
                        {t('studentResults.viewDetail')}
                      </Button>

                      <Button
                        icon={<CopyOutlined />}
                        block
                        onClick={() => {
                          if (filteredSubmissions.length > 0) {
                            const link = `${window.location.origin}/student/results/${filteredSubmissions[0]._id}`;
                            navigator.clipboard.writeText(link);
                            message.success(t('exams.linkCopied'));
                          }
                        }}
                      >
                        {t('studentResults.copyLinkToTeacher')}
                      </Button>
                    </Space>
                  </>
                );
              })()}
            </div>
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExamResults;
