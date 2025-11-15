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
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  BarChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examStatsService from '../../api/examStatsService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ExamResults = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [examHistory, setExamHistory] = useState([]);
  const [subjectAverages, setSubjectAverages] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [filters, setFilters] = useState({
    subject: null,
    dateRange: null,
    status: null,
  });

  useEffect(() => {
    fetchExamResults();
    fetchSubjectAverages();
  }, [filters]);

  const fetchExamResults = async () => {
    setLoading(true);
    try {
      const params = {
        subject: filters.subject,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
        status: filters.status,
      };

      const response = await examStatsService.getOverallExamResults(params);
      const data = response.data || response;
      
      setExamHistory(data.examHistory || []);
      setOverallStats(data.overallStats || {
        totalExams: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        passRate: 0,
      });
    } catch (error) {
      console.error('Error fetching exam results:', error);
      message.error(t('exams.submissions.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectAverages = async () => {
    try {
      const response = await examStatsService.getSubjectAverageScores();
      setSubjectAverages(response.data || response || []);
    } catch (error) {
      console.error('Error fetching subject averages:', error);
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

  const examHistoryColumns = [
    {
      title: t('exams.name'),
      dataIndex: 'exam',
      key: 'examName',
      render: (exam) => (
        <div>
          <Text strong>{exam?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {exam?.subject}
          </Text>
        </div>
      ),
    },
    {
      title: t('exams.submissions.score'),
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score, record) => {
        const percentage = (score / record.totalMarks) * 100;
        return (
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 16, color: getScoreColor(percentage) }}>
              {score}/{record.totalMarks}
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
          <Text>{time ? `${Math.floor(time / 60)}h ${time % 60}m` : '-'}</Text>
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
          graded: { color: 'blue', text: t('takeExam.graded') },
          late: { color: 'orange', text: t('takeExam.late') },
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
            onClick={() => navigate(`/student/exams/${record.examId}/result`)}
          >
            {t('exams.viewDetail')}
          </Button>
        </Space>
      ),
    },
  ];

  const subjectAverageColumns = [
    {
      title: t('exams.subject'),
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => <Text strong>{subject}</Text>,
    },
    {
      title: t('exams.stats.totalSubmissions'),
      dataIndex: 'examCount',
      key: 'examCount',
      width: 150,
      render: (count) => (
        <Space>
          <CheckCircleOutlined />
          <Text>{count}</Text>
        </Space>
      ),
    },
    {
      title: t('exams.stats.averageScore'),
      dataIndex: 'averageScore',
      key: 'averageScore',
      width: 200,
      render: (score, record) => {
        const percentage = (score / record.totalMarks) * 100;
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: getScoreColor(percentage) }}>
                {score.toFixed(1)}/{record.totalMarks}
              </Text>
              <Tag color={getScoreColor(percentage)}>
                {Math.round(percentage)}%
              </Tag>
            </div>
            <Progress
              percent={Math.round(percentage)}
              strokeColor={getScoreColor(percentage)}
              size="small"
            />
          </Space>
        );
      },
    },
    {
      title: t('exams.stats.highestScore'),
      dataIndex: 'highestScore',
      key: 'highestScore',
      width: 120,
      render: (score, record) => (
        <Space>
          <TrophyOutlined style={{ color: '#FFD700' }} />
          <Text>{score}/{record.totalMarks}</Text>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
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
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="submitted">{t('exams.submissions.submitted')}</Option>
              <Option value="graded">{t('takeExam.graded')}</Option>
              <Option value="late">{t('takeExam.late')}</Option>
            </Select>

            <RangePicker
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              style={{ width: 300 }}
            />
          </div>

          <Table
            columns={examHistoryColumns}
            dataSource={examHistory}
            loading={loading}
            rowKey={(record) => record._id || record.id}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} exams`,
            }}
          />
        </div>
      ),
    },
    {
      key: 'statistics',
      label: (
        <Space>
          <BarChartOutlined />
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
                  prefix={<CheckCircleOutlined />}
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
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: getScoreColor(overallStats?.averageScore || 0) }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('exams.leaderboard.timeSpent')}
                  value={overallStats?.totalTimeSpent ? Math.floor(overallStats.totalTimeSpent / 60) : 0}
                  suffix="hours"
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
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={t('exams.subjectStatistics')}>
            <Table
              columns={subjectAverageColumns}
              dataSource={subjectAverages}
              pagination={false}
              rowKey={(record) => record.subject}
              locale={{
                emptyText: <Empty description={t('exams.stats.noData')} />,
              }}
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{t('student.examResults')}</Title>
        <Text type="secondary">{t('exams.examResultsDescription')}</Text>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default ExamResults;

