import { useState, useEffect } from 'react';
import { Card, Row, Col, Empty, Typography, Button, Table, Tag, Spin, Progress } from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { ROUTES } from '../../constants/config';
import dashboardService from '../../api/dashboardService';
import toast from 'react-hot-toast';
import './StudentPages.css';

const { Title, Text } = Typography;

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStudentDashboard();
      if (response.ok) {
        setStats(response.data);
      } else {
        toast.error(response.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>Loading your dashboard...</Text>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-loading">
        <Empty description="No data available" />
      </div>
    );
  }

  const { overview, charts, recentResults, upcomingExams } = stats;

  // Recent Results Table Columns
  const recentResultsColumns = [
    {
      title: t('studentDashboard.table.examName'),
      dataIndex: 'examName',
      key: 'examName',
      render: (name) => <Text strong className="exam-name-cell">{name || 'Unknown'}</Text>,
    },
    {
      title: t('studentDashboard.table.score'),
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => {
        const formattedScore = Number.isInteger(score) ? score : parseFloat(score).toFixed(1);
        return <Text className="score-cell">{formattedScore} / {record.maxScore}</Text>;
      },
    },
    {
      title: t('studentDashboard.table.percentage'),
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => {
        const color = percentage >= 80 ? '#52c41a' : percentage >= 50 ? '#faad14' : '#ff4d4f';
        return (
          <Tag 
            className="percentage-tag"
            style={{ 
              background: `${color}15`, 
              color: color, 
              border: `1px solid ${color}30`,
              fontWeight: 600 
            }}
          >
            {percentage.toFixed(1)}%
          </Tag>
        );
      },
    },
    {
      title: t('studentDashboard.table.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => (
        <Text type="secondary">{new Date(date).toLocaleDateString()}</Text>
      ),
    },
  ];

  // Upcoming Exams Table Columns
  const upcomingExamsColumns = [
    {
      title: t('studentDashboard.table.examName'),
      dataIndex: 'examName',
      key: 'examName',
      render: (name) => <Text strong className="exam-name-cell">{name}</Text>,
    },
    {
      title: t('studentDashboard.table.totalMarks'),
      dataIndex: 'totalMarks',
      key: 'totalMarks',
      render: (marks) => <Tag color="blue">{marks}</Tag>,
    },
    {
      title: t('studentDashboard.table.startTime'),
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date) => (
        <Text type="secondary">{date ? new Date(date).toLocaleString() : '-'}</Text>
      ),
    },
    {
      title: t('studentDashboard.table.endTime'),
      dataIndex: 'endTime',
      key: 'endTime',
      render: (date) => (
        <Text type="secondary">{date ? new Date(date).toLocaleString() : '-'}</Text>
      ),
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <Title level={2} className="welcome-title">
              {t('studentDashboard.welcome')} 
            </Title>
            <Text type="secondary" className="welcome-subtitle">
              {t('studentDashboard.description')}
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate(ROUTES.STUDENT_CLASSES)}
            className="join-class-btn"
          >
            {t('studentDashboard.joinClass')}
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <Row gutter={[20, 20]} className="stats-grid">
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-classes">
            <div className="stat-icon-wrapper">
              <TeamOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('studentDashboard.statistics.classes')}</Text>
              <Title level={2} className="stat-value">{overview.totalClasses}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-exams">
            <div className="stat-icon-wrapper">
              <BookOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('studentDashboard.statistics.exams')}</Text>
              <Title level={2} className="stat-value">{overview.totalExams}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-completed">
            <div className="stat-icon-wrapper">
              <TrophyOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('studentDashboard.statistics.completed')}</Text>
              <Title level={2} className="stat-value">{overview.completedExams}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-upcoming">
            <div className="stat-icon-wrapper">
              <ClockCircleOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('studentDashboard.statistics.upcoming')}</Text>
              <Title level={2} className="stat-value">{overview.upcomingExams}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={[20, 20]} className="metrics-row">
        <Col xs={24} md={8}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-header">
              <TrophyOutlined className="metric-icon gold" />
              <Text className="metric-label">{t('studentDashboard.statistics.averageScore')}</Text>
            </div>
            <div className="metric-body">
              <Progress
                type="circle"
                percent={overview.averagePercentage || 0}
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
                strokeWidth={8}
                format={(percent) => (
                  <span className="progress-text">{percent.toFixed(1)}%</span>
                )}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-header">
              <CheckCircleOutlined className="metric-icon green" />
              <Text className="metric-label">{t('studentDashboard.statistics.passRate')}</Text>
            </div>
            <div className="metric-body">
              <Progress
                type="circle"
                percent={overview.passRate || 0}
                strokeColor={{
                  '0%': '#52c41a',
                  '100%': '#73d13d',
                }}
                strokeWidth={8}
                format={(percent) => (
                  <span className="progress-text">{percent.toFixed(1)}%</span>
                )}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-header">
              <FireOutlined className="metric-icon orange" />
              <Text className="metric-label">{t('studentDashboard.statistics.recentActivity')}</Text>
            </div>
            <div className="metric-body activity-metric">
              <Title level={1} className="activity-number">{overview.recentSubmissions}</Title>
              <Text type="secondary">{t('studentDashboard.last7Days')}</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[20, 20]} className="charts-row">
        <Col xs={24} lg={12}>
          <Card 
            className="chart-card-modern"
            title={
              <div className="chart-title">
                <RiseOutlined className="chart-icon" />
                <span>{t('studentDashboard.charts.scoreDistribution')}</span>
              </div>
            }
            bordered={false}
          >
            {charts.scoreDistribution && charts.scoreDistribution.some(item => item.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.scoreDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: '#8c8c8c', fontSize: 12 }}
                    axisLine={{ stroke: '#e8e8e8' }}
                  />
                  <YAxis 
                    tick={{ fill: '#8c8c8c', fontSize: 12 }}
                    axisLine={{ stroke: '#e8e8e8' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="url(#colorScore)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('studentDashboard.noData')} className="chart-empty" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            className="chart-card-modern"
            title={
              <div className="chart-title">
                <RiseOutlined className="chart-icon" />
                <span>{t('studentDashboard.charts.performanceOverTime')}</span>
              </div>
            }
            bordered={false}
          >
            {charts.performanceOverTime && charts.performanceOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={charts.performanceOverTime} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52c41a" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#52c41a" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#8c8c8c', fontSize: 12 }}
                    axisLine={{ stroke: '#e8e8e8' }}
                  />
                  <YAxis 
                    tick={{ fill: '#8c8c8c', fontSize: 12 }}
                    axisLine={{ stroke: '#e8e8e8' }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="avgPercentage"
                    stroke="#52c41a"
                    strokeWidth={3}
                    fill="url(#colorPerformance)"
                    dot={{ fill: '#52c41a', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: '#52c41a' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('studentDashboard.noData')} className="chart-empty" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Tables Section */}
      <Row gutter={[20, 20]} className="tables-row">
        <Col xs={24} lg={12}>
          <Card 
            className="table-card-modern"
            title={
              <div className="table-title">
                <CheckCircleOutlined className="table-icon green" />
                <span>{t('studentDashboard.recentResults')}</span>
              </div>
            }
            extra={
              <Button 
                type="text"
                className="view-all-btn"
                onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
              >
                {t('common.viewAll')} <ArrowRightOutlined />
              </Button>
            }
            bordered={false}
          >
            {recentResults && recentResults.length > 0 ? (
              <Table
                columns={recentResultsColumns}
                dataSource={recentResults}
                rowKey="examId"
                pagination={false}
                size="middle"
                className="modern-table"
              />
            ) : (
              <Empty 
                description={t('studentDashboard.noResults')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="table-empty"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            className="table-card-modern"
            title={
              <div className="table-title">
                <ClockCircleOutlined className="table-icon blue" />
                <span>{t('studentDashboard.upcomingExams')}</span>
              </div>
            }
            extra={
              <Button 
                type="text"
                className="view-all-btn"
                onClick={() => navigate(ROUTES.STUDENT_EXAMS)}
              >
                {t('common.viewAll')} <ArrowRightOutlined />
              </Button>
            }
            bordered={false}
          >
            {upcomingExams && upcomingExams.length > 0 ? (
              <Table
                columns={upcomingExamsColumns}
                dataSource={upcomingExams}
                rowKey="examId"
                pagination={false}
                size="middle"
                className="modern-table"
              />
            ) : (
              <Empty 
                description={t('studentDashboard.noExams')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="table-empty"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
