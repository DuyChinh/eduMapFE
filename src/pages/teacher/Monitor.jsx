import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Select, 
  DatePicker,
  message,
  Spin,
  Empty
} from 'antd';
import { 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { getExamLogs } from '../../api/proctorService';
import { getExamSubmissions } from '../../api/submissionService';
import { useTranslation } from 'react-i18next';
import './Monitor.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Monitor = () => {
  const { examId } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [examId, selectedSubmission, severityFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, submissionsRes] = await Promise.all([
        getExamLogs(examId),
        getExamSubmissions(examId)
      ]);

      setLogs(logsRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (error) {
      message.error(t('monitor.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'gold';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'visibility':
      case 'tab_switch':
        return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      case 'copy_paste':
      case 'right_click':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (selectedSubmission !== 'all' && log.submissionId?._id !== selectedSubmission) {
      return false;
    }
    if (severityFilter !== 'all' && log.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  const logColumns = [
    {
      title: t('monitor.time'),
      dataIndex: 'ts',
      key: 'ts',
      render: (ts) => new Date(ts).toLocaleString(),
      sorter: (a, b) => new Date(a.ts) - new Date(b.ts),
      defaultSortOrder: 'descend'
    },
    {
      title: t('monitor.student'),
      dataIndex: ['userId', 'name'],
      key: 'student',
      render: (name, record) => (
        <Space>
          <Text strong>{name || t('monitor.unknown')}</Text>
          <Text type="secondary">{record.userId?.email}</Text>
        </Space>
      )
    },
    {
      title: t('monitor.event'),
      dataIndex: 'event',
      key: 'event',
      render: (event) => (
        <Space>
          {getEventIcon(event)}
          <Text>{event}</Text>
        </Space>
      )
    },
    {
      title: t('monitor.severity'),
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: t('monitor.details'),
      dataIndex: 'meta',
      key: 'details',
      render: (meta) => (
        <Text type="secondary">
          {meta?.reason || meta?.action || t('monitor.na')}
        </Text>
      )
    }
  ];

  const submissionColumns = [
    {
      title: t('monitor.student'),
      dataIndex: ['userId', 'name'],
      key: 'student',
      render: (name, record) => (
        <Space>
          <Text strong>{name || t('monitor.unknown')}</Text>
          <Text type="secondary">{record.userId?.email}</Text>
        </Space>
      )
    },
    {
      title: t('monitor.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'in_progress': 'processing',
          'submitted': 'success',
          'graded': 'success',
          'late': 'warning'
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    },
    {
      title: t('monitor.score'),
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => (
        <Text>
          {score || 0} / {record.maxScore || 100} 
          ({record.percentage || 0}%)
        </Text>
      )
    },
    {
      title: t('monitor.started'),
      dataIndex: 'startedAt',
      key: 'startedAt',
        render: (date) => date ? new Date(date).toLocaleString() : t('monitor.na')
    },
    {
      title: t('monitor.submitted'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
        render: (date) => date ? new Date(date).toLocaleString() : t('monitor.na')
    },
    {
      title: t('monitor.violations'),
      key: 'violations',
      render: (_, record) => {
        const violations = record.proctoringData?.violations || [];
        if (violations.length === 0) {
          return <Tag color="green">{t('monitor.none')}</Tag>;
        }
        return (
          <Tag color="red">
            {violations.length} {violations.length > 1 ? t('monitor.violationsPlural') : t('monitor.violation')}
          </Tag>
        );
      }
    }
  ];

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />;
  }

  return (
    <div className="monitor-container">
      <Card>
        <Title level={2}>{t('monitor.title')}</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Filters */}
          <Card>
            <Space wrap>
              <Text strong>{t('monitor.filterBySubmission')}:</Text>
              <Select
                value={selectedSubmission}
                onChange={setSelectedSubmission}
                style={{ width: 200 }}
              >
                <Option value="all">{t('monitor.allSubmissions')}</Option>
                {submissions.map(sub => (
                  <Option key={sub._id} value={sub._id}>
                    {sub.userId?.name || t('monitor.unknown')} - {sub.status}
                  </Option>
                ))}
              </Select>

              <Text strong>{t('monitor.severity')}:</Text>
              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: 150 }}
              >
                <Option value="all">{t('monitor.all')}</Option>
                <Option value="critical">{t('monitor.critical')}</Option>
                <Option value="high">{t('monitor.high')}</Option>
                <Option value="medium">{t('monitor.medium')}</Option>
                <Option value="low">{t('monitor.low')}</Option>
              </Select>
            </Space>
          </Card>

          {/* Submissions Overview */}
          <Card title={t('monitor.submissionsOverview')}>
            <Table
              dataSource={submissions}
              columns={submissionColumns}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>

          {/* Proctoring Logs */}
          <Card title={t('monitor.proctoringLogs')}>
            {filteredLogs.length === 0 ? (
              <Empty description={t('monitor.noLogs')} />
            ) : (
              <Table
                dataSource={filteredLogs}
                columns={logColumns}
                rowKey="_id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
              />
            )}
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default Monitor;

