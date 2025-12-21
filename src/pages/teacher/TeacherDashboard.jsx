import { useState, useEffect } from 'react';
import { Card, Row, Col, Space, Typography, Spin, Empty, Progress } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ROUTES } from '../../constants/config';
import dashboardService from '../../api/dashboardService';
import toast from 'react-hot-toast';
import './TeacherPages.css';

const { Title, Text, Paragraph } = Typography;

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

// Colors for pie chart
const COLORS = ['#52c41a', '#faad14', '#ff4d4f', '#1890ff'];

const TeacherDashboard = () => {
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
      const response = await dashboardService.getTeacherDashboard();
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

  const { overview, charts } = stats;

  // Prepare pie chart data
  const pieChartData = [
    { name: t('teacherDashboard.charts.published'), value: charts.examStatusDistribution.published },
    { name: t('teacherDashboard.charts.draft'), value: charts.examStatusDistribution.draft },
  ].filter(item => item.value > 0);

  // Custom label for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text 
        x={x} 
        y={y} 
        fill={COLORS[index % COLORS.length]} 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        fontSize={14}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <Title level={2} className="welcome-title">
              {t('teacherDashboard.welcomeBack')} 
            </Title>
            <Text type="secondary" className="welcome-subtitle">
              {t('teacherDashboard.description')}
            </Text>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <Row gutter={[20, 20]} className="stats-grid">
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-questions">
            <div className="stat-icon-wrapper">
              <FileTextOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('teacherDashboard.statistics.questions')}</Text>
              <Title level={2} className="stat-value">{overview.totalQuestions}</Title>
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
              <Text className="stat-label">{t('teacherDashboard.statistics.exams')}</Text>
              <Title level={2} className="stat-value">
                {overview.totalExams}
                <span className="stat-suffix">({overview.publishedExams} {t('teacherDashboard.published')})</span>
              </Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-classes">
            <div className="stat-icon-wrapper">
              <TeamOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('teacherDashboard.statistics.classes')}</Text>
              <Title level={2} className="stat-value">{overview.totalClasses}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="stat-card-modern stat-students">
            <div className="stat-icon-wrapper">
              <TeamOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <Text className="stat-label">{t('teacherDashboard.statistics.students')}</Text>
              <Title level={2} className="stat-value">{overview.totalStudents}</Title>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={[20, 20]} className="metrics-row">
        <Col xs={24} sm={12} md={6}>
          <Card className="metric-card" variant="borderless">
            <div className="metric-header">
              <CheckCircleOutlined className="metric-icon blue" />
              <Text className="metric-label">{t('teacherDashboard.statistics.totalSubmissions')}</Text>
            </div>
            <div className="metric-body simple-metric">
              <Title level={2} className="metric-number">{overview.totalSubmissions}</Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="metric-card" variant="borderless">
            <div className="metric-header">
              <TrophyOutlined className="metric-icon gold" />
              <Text className="metric-label">{t('teacherDashboard.statistics.averageScore')}</Text>
            </div>
            <div className="metric-body">
              <Progress
                type="circle"
                size={100}
                percent={overview.averagePercentage || 0}
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
                strokeWidth={8}
                format={(percent) => (
                  <span className="progress-text-sm">{percent.toFixed(2)}%</span>
                )}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="metric-card" variant="borderless">
            <div className="metric-header">
              <BookOutlined className="metric-icon green" />
              <Text className="metric-label">{t('teacherDashboard.statistics.recentExams')}</Text>
            </div>
            <div className="metric-body simple-metric">
              <Title level={2} className="metric-number">{overview.recentExams}</Title>
              <Text type="secondary" className="metric-subtitle">{t('teacherDashboard.last7Days')}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="metric-card" variant="borderless">
            <div className="metric-header">
              <ClockCircleOutlined className="metric-icon orange" />
              <Text className="metric-label">{t('teacherDashboard.statistics.recentSubmissions')}</Text>
            </div>
            <div className="metric-body simple-metric">
              <Title level={2} className="metric-number">{overview.recentSubmissions}</Title>
              <Text type="secondary" className="metric-subtitle">{t('teacherDashboard.last7Days')}</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section - Row 1 */}
      <Row gutter={[20, 20]} className="charts-row">
        <Col xs={24} lg={12}>
          <Card 
            className="chart-card-modern"
            title={
              <div className="chart-title">
                <BarChartOutlined className="chart-icon" />
                <span>{t('teacherDashboard.charts.examStatus')}</span>
              </div>
            }
            variant="borderless"
          >
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#666', fontSize: 14 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('teacherDashboard.noData')} className="chart-empty" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            className="chart-card-modern"
            title={
              <div className="chart-title">
                <RiseOutlined className="chart-icon" />
                <span>{t('teacherDashboard.charts.scoreDistribution')}</span>
              </div>
            }
            variant="borderless"
          >
            {charts.scoreDistribution.some(item => item.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.scoreDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorScoreTeacher" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#colorScoreTeacher)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('teacherDashboard.noData')} className="chart-empty" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Submissions Over Time Chart */}
      <Row gutter={[20, 20]} className="charts-row">
        <Col xs={24}>
          <Card 
            className="chart-card-modern"
            title={
              <div className="chart-title">
                <RiseOutlined className="chart-icon" />
                <span>{t('teacherDashboard.charts.submissionsOverTime')}</span>
              </div>
            }
            variant="borderless"
          >
            {charts.submissionsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={charts.submissionsOverTime} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.05}/>
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
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    strokeWidth={3}
                    fill="url(#colorSubmissions)"
                    dot={{ fill: '#667eea', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: '#667eea' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('teacherDashboard.noData')} className="chart-empty" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Top Performing Exams */}
      {charts.topExams && charts.topExams.length > 0 && (
        <Card 
          className="chart-card-modern top-exams-card"
          title={
            <div className="chart-title">
              <TrophyOutlined className="chart-icon gold" />
              <span>{t('teacherDashboard.charts.topExams')}</span>
            </div>
          }
          variant="borderless"
        >
          <Row gutter={[20, 20]}>
            {charts.topExams.map((exam, index) => (
              <Col xs={24} sm={12} lg={8} key={exam.examId}>
                <div className={`top-exam-card rank-${index + 1}`}>
                  <div className="exam-rank">
                    <TrophyOutlined className="trophy-icon" />
                    <span className="rank-number">#{index + 1}</span>
                  </div>
                  <div className="exam-info">
                    <Text strong className="exam-name">{exam.examName}</Text>
                    <div className="exam-stats">
                      <span className="exam-percentage">{exam.avgPercentage.toFixed(2)}%</span>
                      <Text type="secondary" className="exam-submissions">
                        {exam.totalSubmissions} {t('teacherDashboard.submissions')}
                      </Text>
                    </div>
                  </div>
                  <Progress 
                    percent={exam.avgPercentage} 
                    showInfo={false}
                    strokeColor={{
                      '0%': index === 0 ? '#faad14' : index === 1 ? '#bfbfbf' : '#d48806',
                      '100%': index === 0 ? '#ffc53d' : index === 1 ? '#d9d9d9' : '#faad14',
                    }}
                    trailColor="#f0f0f0"
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Quick Actions */}
      <Card 
        className="quick-actions-card-modern"
        title={
          <div className="chart-title">
            <RiseOutlined className="chart-icon" />
            <span>{t('teacherDashboard.quickStart')}</span>
          </div>
        }
        variant="borderless"
      >
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} lg={8}>
            <div 
              className="action-card-modern"
              onClick={() => navigate(ROUTES.TEACHER_EXAMS + '/create')}
            >
              <div className="action-icon-modern action-icon-blue">
                <PlusOutlined />
              </div>
              <div className="action-text">
                <Title level={4}>{t('teacherDashboard.actions.createExam')}</Title>
                <Text type="secondary">{t('teacherDashboard.actions.createExamDesc')}</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div 
              className="action-card-modern"
              onClick={() => navigate(ROUTES.TEACHER_QUESTIONS)}
            >
              <div className="action-icon-modern action-icon-green">
                <FileTextOutlined />
              </div>
              <div className="action-text">
                <Title level={4}>{t('teacherDashboard.actions.manageQuestions')}</Title>
                <Text type="secondary">{t('teacherDashboard.actions.manageQuestionsDesc')}</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div 
              className="action-card-modern"
              onClick={() => navigate(ROUTES.TEACHER_CLASSES)}
            >
              <div className="action-icon-modern action-icon-purple">
                <TeamOutlined />
              </div>
              <div className="action-text">
                <Title level={4}>{t('teacherDashboard.actions.manageClasses')}</Title>
                <Text type="secondary">{t('teacherDashboard.actions.manageClassesDesc')}</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
