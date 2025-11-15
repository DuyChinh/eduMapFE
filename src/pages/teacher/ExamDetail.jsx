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
  Descriptions,
  Table,
  Popconfirm,
  Empty
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examService from '../../api/examService';
import { ROUTES } from '../../constants/config';

const { Title, Text } = Typography;

const ExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExamDetail = async () => {
    setLoading(true);
    try {
      const response = await examService.getExamById(examId);
      const examInfo = response.data || response;
      setExamData(examInfo);
    } catch (error) {
      console.error('Error fetching exam detail:', error);
      message.error(t('exams.fetchFailed'));
      navigate(ROUTES.TEACHER_EXAMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchExamDetail();
    }
  }, [examId]);

  const handleDelete = async () => {
    try {
      await examService.deleteExam(examId);
      message.success(t('exams.deleteSuccess'));
      navigate(ROUTES.TEACHER_EXAMS);
    } catch (error) {
      console.error('Delete exam error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.deleteFailed'));
      message.error(errorMessage);
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

  const getPurposeColor = (purpose) => {
    const colors = {
      exam: 'blue',
      practice: 'green',
      quiz: 'orange',
      assignment: 'purple'
    };
    return colors[purpose] || 'default';
  };

  const getPurposeText = (purpose) => {
    const purposes = {
      exam: t('exams.purposeExam'),
      practice: t('exams.purposePractice'),
      quiz: t('exams.purposeQuiz'),
      assignment: t('exams.purposeAssignment')
    };
    return purposes[purpose] || purpose;
  };

  const getQuestionTypeText = (type) => {
    const types = {
      mcq: t('questions.types.mcq'),
      tf: t('questions.types.tf'),
      short: t('questions.types.short'),
      essay: t('questions.types.essay')
    };
    return types[type] || type;
  };

  const getQuestionTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const dateObj = new Date(date);
    return dateObj.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!examData) {
    return (
      <Card>
        <Empty description={t('exams.examNotFound')} />
      </Card>
    );
  }

  const questionColumns = [
    {
      title: t('exams.order'),
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: t('questions.name'),
      key: 'questionName',
      render: (_, record) => {
        const question = record.questionId;
        if (typeof question === 'object' && question !== null) {
          return question.name || question.text || '-';
        }
        return '-';
      },
    },
    {
      title: t('questions.type'),
      key: 'type',
      width: 120,
      render: (_, record) => {
        const question = record.questionId;
        if (typeof question === 'object' && question !== null) {
          const type = question.type;
          return (
            <Tag color={getQuestionTypeColor(type)}>
              {getQuestionTypeText(type)}
            </Tag>
          );
        }
        return '-';
      },
    },
    {
      title: t('exams.marks'),
      dataIndex: 'marks',
      key: 'marks',
      width: 100,
    },
    {
      title: t('exams.isRequired'),
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 100,
      render: (isRequired) => (
        <Tag color={isRequired ? 'green' : 'default'}>
          {isRequired ? t('common.yes') : t('common.no')}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(ROUTES.TEACHER_EXAMS)}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>{examData.name}</Title>
        </Space>
        
        <Space>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
          >
            {t('exams.edit')}
          </Button>
          
          <Popconfirm
            title={t('exams.confirmDelete')}
            onConfirm={handleDelete}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button 
              danger
              icon={<DeleteOutlined />}
            >
              {t('exams.delete')}
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title={t('exams.basicInfo')} bordered column={2}>
          <Descriptions.Item label={t('exams.name')}>
            {examData.name}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.status')}>
            <Tag color={getStatusColor(examData.status)}>
              {getStatusText(examData.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.description')} span={2}>
            {examData.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.examPurpose')}>
            <Tag color={getPurposeColor(examData.examPurpose)}>
              {getPurposeText(examData.examPurpose)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.isAllowUser')}>
            {examData.isAllowUser === 'everyone' ? t('exams.allowEveryone') :
             examData.isAllowUser === 'class' ? t('exams.allowClass') :
             t('exams.allowStudent')}
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
          <Descriptions.Item label={t('exams.fee')}>
            {examData.fee || 0} VND
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.startTime')}>
            {formatDate(examData.startTime)}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.endTime')}>
            {formatDate(examData.endTime)}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.timezone')}>
            {examData.timezone || 'Asia/Ho_Chi_Minh'}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.createdAt')}>
            {formatDate(examData.createdAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('exams.questions')} style={{ marginBottom: 24 }}>
        <Table
          dataSource={examData.questions || []}
          columns={questionColumns}
          rowKey={(record) => {
            const questionId = record.questionId?._id || record.questionId;
            const order = record.order;
            return questionId ? `${questionId}-${order || ''}` : `question-${record._id || Math.random()}`;
          }}
          pagination={false}
        />
      </Card>

      <Card title={t('exams.viewSettings')}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label={t('exams.viewMark')}>
            {examData.viewMark === 0 ? t('exams.viewMarkNever') :
             examData.viewMark === 1 ? t('exams.viewMarkAfterCompletion') :
             t('exams.viewMarkAfterAllFinish')}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.viewExamAndAnswer')}>
            {examData.viewExamAndAnswer === 0 ? t('exams.viewExamNever') :
             examData.viewExamAndAnswer === 1 ? t('exams.viewExamAfterCompletion') :
             t('exams.viewExamAfterAllFinish')}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.autoMonitoring')}>
            {examData.autoMonitoring === 'off' ? t('exams.monitoringOff') :
             examData.autoMonitoring === 'screenExit' ? t('exams.monitoringScreenExit') :
             t('exams.monitoringFull')}
          </Descriptions.Item>
          <Descriptions.Item label={t('exams.studentVerification')}>
            <Tag color={examData.studentVerification ? 'green' : 'default'}>
              {examData.studentVerification ? t('common.yes') : t('common.no')}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ExamDetail;

