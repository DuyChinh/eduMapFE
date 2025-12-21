import { useState, useEffect, useMemo } from 'react';
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
  message,
  Tabs,
  Switch,
  Empty,
  Divider,
} from 'antd';
import {
  ClockCircleOutlined,
  EyeOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getMySubmissions } from '../../api/submissionService';
import questionService from '../../api/questionService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Colors for charts
const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const ExamResults = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [showGradeLetter, setShowGradeLetter] = useState(false);
  const [filters, setFilters] = useState({
    subject: null,
    dateRange: null,
  });
  
  // Chart filters
  const [chartFilters, setChartFilters] = useState({
    subject: null,
    dateRange: null,
  });

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const currentLang = i18n.language || 'vi';
        const response = await questionService.getSubjects({ lang: currentLang });
        let subjectsData = [];
        if (Array.isArray(response)) {
          subjectsData = response;
        } else if (response?.data) {
          subjectsData = response.data;
        } else if (response?.items) {
          subjectsData = response.items;
        }
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [i18n.language]);

  // Helper function to get subject name based on current language
  const getSubjectName = (subject) => {
    const lang = i18n.language || 'vi';
    if (lang === 'en' && subject.name_en) return subject.name_en;
    if (lang === 'jp' && subject.name_jp) return subject.name_jp;
    return subject.name || subject.name_en || subject.name_jp || '';
  };

  useEffect(() => {
    fetchExamResults();
  }, [filters.subject, filters.dateRange]);

  const fetchExamResults = async () => {
    setLoading(true);
    try {
      const params = {
        subject: filters.subject,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
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

  // Helper function to get correct answer count from submission
  const getCorrectAnswerCount = (submission) => {
    if (!submission?.answers) return 0;
    return submission.answers.filter(answer => answer.isCorrect).length;
  };

  // Helper function to get total questions from submission
  const getTotalQuestions = (submission) => {
    return submission?.answers?.length || 0;
  };

  // Helper function to get subject name from exam based on language (for charts)
  const getChartSubjectName = (exam) => {
    if (!exam) return '';
    const lang = i18n.language || 'vi';
    if (lang === 'en' && exam.subject_en) return exam.subject_en;
    if (lang === 'jp' && exam.subject_jp) return exam.subject_jp;
    if (lang === 'vi' && exam.subject_vi) return exam.subject_vi;
    return exam.subject || '';
  };

  // Get chart data - latest score for each exam, filtered by chartFilters
  const chartData = useMemo(() => {
    let dataToFilter = [...submissions];
    
    // Apply chart filters
    if (chartFilters.subject) {
      dataToFilter = dataToFilter.filter(sub => {
        const examSubject = sub.exam?.subject || '';
        return examSubject.toLowerCase().includes(chartFilters.subject.toLowerCase());
      });
    }
    
    if (chartFilters.dateRange && chartFilters.dateRange[0] && chartFilters.dateRange[1]) {
      const startDate = chartFilters.dateRange[0].startOf('day').toDate();
      const endDate = chartFilters.dateRange[1].endOf('day').toDate();
      dataToFilter = dataToFilter.filter(sub => {
        const submittedAt = new Date(sub.submittedAt);
        return submittedAt >= startDate && submittedAt <= endDate;
      });
    }
    
    // Group by examId and get latest submission for each exam
    const examMap = new Map();
    dataToFilter.forEach(sub => {
      const examId = sub.examId || sub.exam?._id;
      const examName = sub.exam?.name || 'Unknown';
      if (!examId) return;
      
      const existing = examMap.get(examId);
      if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
        examMap.set(examId, {
          ...sub,
          examName,
          examId,
        });
      }
    });
    
    // Convert to array and calculate percentage
    const latestSubmissions = Array.from(examMap.values()).map(sub => {
      const totalMarks = sub.totalMarks || 100;
      const percentage = totalMarks > 0 ? ((sub.score || 0) / totalMarks) * 100 : 0;
      return {
        name: sub.examName.length > 15 ? sub.examName.substring(0, 15) + '...' : sub.examName,
        fullName: sub.examName,
        score: Number(percentage.toFixed(1)),
        rawScore: sub.score || 0,
        totalMarks,
        subject: getChartSubjectName(sub.exam),
        submittedAt: sub.submittedAt,
      };
    });
    
    // Sort by submittedAt
    return latestSubmissions.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  }, [submissions, chartFilters, i18n.language]);

  // Get score distribution data for pie chart
  const scoreDistribution = useMemo(() => {
    const distribution = {
      'A+ (90-100)': 0,
      'A (80-89)': 0,
      'B (70-79)': 0,
      'C (60-69)': 0,
      'D (50-59)': 0,
      'F (<50)': 0,
    };
    
    chartData.forEach(item => {
      const score = item.score;
      if (score >= 90) distribution['A+ (90-100)']++;
      else if (score >= 80) distribution['A (80-89)']++;
      else if (score >= 70) distribution['B (70-79)']++;
      else if (score >= 60) distribution['C (60-69)']++;
      else if (score >= 50) distribution['D (50-59)']++;
      else distribution['F (<50)']++;
    });
    
    return Object.entries(distribution)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [chartData]);

  // Get subject performance data
  const subjectPerformance = useMemo(() => {
    const subjectMap = new Map();
    
    chartData.forEach(item => {
      const subject = item.subject || 'Other';
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, count: 0 });
      }
      const data = subjectMap.get(subject);
      data.total += item.score;
      data.count++;
    });
    
    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      name: subject,
      fullName: subject,
      averageScore: Number((data.total / data.count).toFixed(1)),
      count: data.count,
    }));
  }, [chartData]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0]?.payload?.fullName || label}</p>
          <p style={{ margin: '5px 0 0', color: getScoreColor(payload[0]?.value) }}>
            {t('exams.submissions.score')}: {payload[0]?.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Helper function to get exam subject name based on current language
  const getExamSubjectName = (exam) => {
    if (!exam) return '-';
    const lang = i18n.language || 'vi';
    if (lang === 'en' && exam.subject_en) return exam.subject_en;
    if (lang === 'jp' && exam.subject_jp) return exam.subject_jp;
    if (lang === 'vi' && exam.subject_vi) return exam.subject_vi;
    return exam.subject || '-';
  };

  const examHistoryColumns = [
    {
      title: t('exams.name'),
      dataIndex: 'exam',
      key: 'examName',
      width: 200,
      render: (exam) => {
        const examData = typeof exam === 'object' ? exam : {};
        return (
          <div>
            <Text strong>{examData?.name || '-'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getExamSubjectName(examData)}
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
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 16, color: getScoreColor(percentage) }}>
              {showGradeLetter ? getGrade(percentage) : `${formattedScore}/${totalMarks}`}
            </Text>
            <Progress
              percent={Math.round(percentage)}
              size="small"
              strokeColor={getScoreColor(percentage)}
              showInfo={false}
              style={{ width: 100 }}
            />
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
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              placeholder={t('exams.filterBySubject')}
              style={{ width: 200 }}
              allowClear
              showSearch
              optionFilterProp="children"
              value={filters.subject}
              onChange={(value) => setFilters({ ...filters, subject: value })}
            >
              {subjects.map(subject => (
                <Option key={subject._id} value={subject.name}>
                  {getSubjectName(subject)}
                </Option>
              ))}
            </Select>

            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              style={{ width: 300 }}
            />

            <Space>
              <Switch
                checked={showGradeLetter}
                onChange={(checked) => setShowGradeLetter(checked)}
                size="small"
              />
              <Text type="secondary">{t('exams.showGradeLetter') || 'Show grade letter'}</Text>
            </Space>
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

          {/* Chart Filters */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text strong>{t('exams.chartFilters') || 'Chart Filters'}:</Text>
              <Select
                placeholder={t('exams.filterBySubject')}
                style={{ width: 200 }}
                allowClear
                showSearch
                optionFilterProp="children"
                value={chartFilters.subject}
                onChange={(value) => setChartFilters({ ...chartFilters, subject: value })}
              >
                {subjects.map(subject => (
                  <Option key={subject._id} value={subject.name}>
                    {getSubjectName(subject)}
                  </Option>
                ))}
              </Select>
              <RangePicker
                value={chartFilters.dateRange}
                onChange={(dates) => setChartFilters({ ...chartFilters, dateRange: dates })}
                style={{ width: 300 }}
              />
              <Button 
                type="link" 
                onClick={() => setChartFilters({ subject: null, dateRange: null })}
              >
                {t('common.clearFilters') || 'Clear Filters'}
              </Button>
            </div>
          </Card>

          {/* Score Chart - Bar Chart */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title={t('exams.stats.examScores') || 'Exam Scores (Latest Attempt)'}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        label={{ value: '%', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="score" 
                        name={t('exams.submissions.score') || 'Score'} 
                        fill="#1890ff"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description={t('common.noData') || 'No data'} />
                )}
              </Card>
            </Col>

            {/* Score Distribution - Pie Chart */}
            <Col xs={24} lg={8}>
              <Card title={t('exams.stats.scoreDistribution') || 'Score Distribution'}>
                {scoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={scoreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description={t('common.noData') || 'No data'} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Subject Performance - Bar Chart */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card title={t('exams.stats.subjectPerformance') || 'Performance by Subject'}>
                {subjectPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={subjectPerformance} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        label={{ value: '%', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value}% (${props.payload.count} ${t('exams.items') || 'exams'})`,
                          t('exams.stats.averageScore') || 'Average Score'
                        ]}
                        labelFormatter={(label) => subjectPerformance.find(s => s.name === label)?.fullName || label}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        wrapperStyle={{ paddingTop: '30px', bottom: 0 }} 
                      />
                      <Bar 
                        dataKey="averageScore" 
                        name={t('exams.stats.averageScore') || 'Average Score'} 
                        fill="#52c41a"
                        radius={[4, 4, 0, 0]}
                      >
                        {subjectPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description={t('common.noData') || 'No data'} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Score Trend - Line Chart */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card title={t('exams.stats.scoreTrend') || 'Score Trend Over Time'}>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        label={{ value: '%', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        name={t('exams.submissions.score') || 'Score'} 
                        stroke="#1890ff" 
                        strokeWidth={2}
                        dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description={t('exams.stats.needMoreData') || 'Need at least 2 exams to show trend'} />
                )}
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
        {/* Main Content */}
        <Col xs={24} lg={24}>
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExamResults;
