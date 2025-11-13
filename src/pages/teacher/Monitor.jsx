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
import './Monitor.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Monitor = () => {
  const { examId } = useParams();
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
      message.error('Failed to load monitoring data');
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
      title: 'Time',
      dataIndex: 'ts',
      key: 'ts',
      render: (ts) => new Date(ts).toLocaleString(),
      sorter: (a, b) => new Date(a.ts) - new Date(b.ts),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Student',
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
      title: 'Event',
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
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Details',
      dataIndex: 'meta',
      key: 'details',
      render: (meta) => (
        <Text type="secondary">
          {meta?.reason || meta?.action || 'N/A'}
        </Text>
      )
    }
  ];

  const submissionColumns = [
    {
      title: 'Student',
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
      title: 'Status',
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
      title: 'Score',
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
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date) => date ? new Date(date).toLocaleString() : 'N/A'
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => date ? new Date(date).toLocaleString() : 'N/A'
    },
    {
      title: 'Violations',
      key: 'violations',
      render: (_, record) => {
        const violations = record.proctoringData?.violations || [];
        if (violations.length === 0) {
          return <Tag color="green">None</Tag>;
        }
        return (
          <Tag color="red">
            {violations.length} violation{violations.length > 1 ? 's' : ''}
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
        <Title level={2}>Exam Monitoring</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Filters */}
          <Card>
            <Space>
              <Text strong>Filter by Submission:</Text>
              <Select
                value={selectedSubmission}
                onChange={setSelectedSubmission}
                style={{ width: 200 }}
              >
                <Option value="all">All Submissions</Option>
                {submissions.map(sub => (
                  <Option key={sub._id} value={sub._id}>
                    {sub.userId?.name || 'Unknown'} - {sub.status}
                  </Option>
                ))}
              </Select>

              <Text strong>Severity:</Text>
              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All</Option>
                <Option value="critical">Critical</Option>
                <Option value="high">High</Option>
                <Option value="medium">Medium</Option>
                <Option value="low">Low</Option>
              </Select>
            </Space>
          </Card>

          {/* Submissions Overview */}
          <Card title="Submissions Overview">
            <Table
              dataSource={submissions}
              columns={submissionColumns}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>

          {/* Proctoring Logs */}
          <Card title="Proctoring Logs">
            {filteredLogs.length === 0 ? (
              <Empty description="No logs found" />
            ) : (
              <Table
                dataSource={filteredLogs}
                columns={logColumns}
                rowKey="_id"
                pagination={{ pageSize: 20 }}
              />
            )}
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default Monitor;

