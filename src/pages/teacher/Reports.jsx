import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Typography, 
  Space, 
  Button, 
  Select,
  Statistic,
  Row,
  Col,
  message,
  Spin,
  Empty,
  Tag
} from 'antd';
import { 
  DownloadOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getClassReport, exportClassReportCSV } from '../../api/reportService';
import { useTranslation } from 'react-i18next';
import './Reports.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Reports = () => {
  const { classId } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [classId, selectedExam]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await getClassReport(classId, selectedExam);
      setReport(response.data);
    } catch (error) {
      message.error(t('reports.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await exportClassReportCSV(classId, selectedExam);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class-report-${classId}${selectedExam ? `-exam-${selectedExam}` : ''}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success(t('reports.exportSuccess'));
    } catch (error) {
      message.error(t('reports.exportFailed'));
    }
  };

  const submissionColumns = [
    {
      title: t('reports.student'),
      dataIndex: ['userId', 'name'],
      key: 'student',
      render: (name, record) => (
        <Space>
          <Text strong>{name || 'Unknown'}</Text>
          <Text type="secondary">{record.userId?.email}</Text>
        </Space>
      )
    },
    {
      title: t('reports.score'),
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => (
        <Text>
          {score || 0} / {record.maxScore || 100}
        </Text>
      ),
      sorter: (a, b) => (a.score || 0) - (b.score || 0)
    },
    {
      title: t('reports.percentage'),
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => (
        <Text strong={percentage >= 50} style={{ color: percentage >= 50 ? '#52c41a' : '#ff4d4f' }}>
          {percentage || 0}%
        </Text>
      ),
      sorter: (a, b) => (a.percentage || 0) - (b.percentage || 0)
    },
    {
      title: t('reports.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'submitted': 'success',
          'graded': 'success',
          'late': 'warning'
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    },
    {
      title: t('reports.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => date ? new Date(date).toLocaleString() : 'N/A'
    }
  ];

  const questionColumns = [
    {
      title: t('reports.question'),
      dataIndex: 'questionText',
      key: 'question',
      ellipsis: true,
      render: (text) => <Text>{text}</Text>
    },
    {
      title: t('reports.type'),
      dataIndex: 'questionType',
      key: 'type',
      render: (type) => <Tag>{type?.toUpperCase()}</Tag>
    },
    {
      title: t('reports.correct'),
      dataIndex: 'correctCount',
      key: 'correct',
      sorter: (a, b) => a.correctCount - b.correctCount
    },
    {
      title: t('reports.incorrect'),
      dataIndex: 'incorrectCount',
      key: 'incorrect',
      sorter: (a, b) => b.incorrectCount - a.incorrectCount
    },
    {
      title: t('reports.accuracy'),
      dataIndex: 'accuracyRate',
      key: 'accuracy',
      render: (rate) => (
        <Text style={{ color: rate >= 50 ? '#52c41a' : '#ff4d4f' }}>
          {rate.toFixed(1)}%
        </Text>
      ),
      sorter: (a, b) => a.accuracyRate - b.accuracyRate
    }
  ];

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />;
  }

  if (!report) {
    return <Empty description={t('reports.noData')} />;
  }

  return (
    <div className="reports-container">
      <Card>
        <div className="reports-header">
          <Title level={2}>{t('reports.title')}</Title>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
          >
            {t('reports.exportCSV')}
          </Button>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Statistics */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('reports.totalStudents')}
                  value={report.totalStudents}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('reports.submissions')}
                  value={report.totalSubmissions}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('reports.averageScore')}
                  value={report.statistics?.averageScore || 0}
                  suffix={`/ ${report.statistics?.maxScore || 100}`}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('reports.passRate')}
                  value={report.statistics?.passRate || 0}
                  suffix="%"
                  valueStyle={{ color: (report.statistics?.passRate || 0) >= 50 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Score Distribution */}
          {report.scoreDistribution && report.scoreDistribution.length > 0 && (
            <Card title={t('reports.scoreDistribution')}>
              <Row gutter={16}>
                {report.scoreDistribution.map((dist, index) => (
                  <Col xs={24} sm={12} md={4} key={index}>
                    <Card>
                      <Statistic
                        title={dist.range}
                        value={dist.count}
                        suffix={`(${dist.percentage.toFixed(1)}%)`}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Submissions Table */}
          {report.submissions && report.submissions.length > 0 && (
            <Card title={t('reports.studentSubmissions')}>
              <Table
                dataSource={report.submissions}
                columns={submissionColumns}
                rowKey={(record) => record.userId?._id || record._id}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}

          {/* Question Analysis */}
          {report.questionAnalysis && report.questionAnalysis.length > 0 && (
            <Card title={t('reports.mostIncorrectQuestions')}>
              <Table
                dataSource={report.questionAnalysis}
                columns={questionColumns}
                rowKey="questionId"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Reports;

