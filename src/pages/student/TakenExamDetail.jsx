import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Radio,
  Checkbox,
  Input,
  Space,
  Progress,
  Spin,
  message,
  Modal,
  Alert,
  Tag,
  Affix,
  Descriptions,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckOutlined,
  WarningOutlined,
  FlagOutlined,
  LockOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examService from '../../api/examService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TakeExamNew = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const timerRef = useRef(null);

  // Exam info phase
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  const [startingExam, setStartingExam] = useState(false);

  // Exam taking phase
  const [submissionData, setSubmissionData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [examStartTime, setExamStartTime] = useState(null);

  useEffect(() => {
    console.log('useEffect', examId);
    fetchExamInfo();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examId]);

  useEffect(() => {
    if (timeRemaining > 0 && examStarted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [timeRemaining, examStarted]);

  const fetchExamInfo = async () => {
    console.log('fetchExamInfo', examId);
    setLoading(true);
    try {
      const response = await examService.getExamById(examId);
      const exam = response.data || response;
      setExamData(exam);
    } catch (error) {
      console.error('Error fetching exam:', error);
      message.error(t('takeExam.loadFailed'));
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    console.log('handleStartExam', examData.examPassword, password);
    if (examData.examPassword && !password) {
      message.error(t('takeExam.pleaseEnterPassword'));
      return;
    }

    setStartingExam(true);
    try {
      const response = await examService.startSubmission(examId, password || null);
      const submission = response.data || response;

      setSubmissionData(submission);
      setExamStarted(true);
      setExamStartTime(new Date());
      setTimeRemaining(examData.duration * 60); // Convert minutes to seconds

      // Initialize answers object
      const initialAnswers = {};
      examData.questions?.forEach((q, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);

      message.success(t('takeExam.examStarted'));
    } catch (error) {
      console.error('Error starting exam:', error);
      const errorMsg = error.response?.data?.message || t('takeExam.failedToStart');
      message.error(errorMsg);
    } finally {
      setStartingExam(false);
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: value
    }));
  };

  const handleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < examData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionSelect = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleAutoSubmit = () => {
    Modal.warning({
      title: t('takeExam.timeUp'),
      content: t('takeExam.autoSubmitting'),
      onOk: () => submitExam(),
    });
  };

  const handleSubmitClick = () => {
    const unanswered = Object.values(answers).filter(a => a === null).length;

    Modal.confirm({
      title: t('takeExam.confirmSubmit'),
      content: unanswered > 0
        ? `${t('takeExam.unansweredQuestions')}: ${unanswered}`
        : t('takeExam.submitConfirmation'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      onOk: submitExam,
    });
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      await examService.submitExam(submissionData._id);
      message.success(t('takeExam.submitSuccess'));
      navigate(`/student/exams/${examId}/result`);
    } catch (error) {
      console.error('Error submitting exam:', error);
      message.error(t('takeExam.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (index) => {
    if (answers[index] !== null) return 'answered';
    if (markedForReview.has(index)) return 'marked';
    return 'unanswered';
  };

  const getStatusColor = (status) => {
    const colors = {
      answered: '#52c41a',
      marked: '#faad14',
      unanswered: '#d9d9d9',
    };
    return colors[status];
  };

  const renderQuestion = () => {
    const question = examData.questions[currentQuestionIndex];
    const questionData = question.questionId;

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <Space align="start" size="large">
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('takeExam.question')} {currentQuestionIndex + 1}/{examData.questions.length}
            </Tag>
            {question.marks && (
              <Tag color="green" style={{ fontSize: 14 }}>
                {question.marks} {t('takeExam.marks')}
              </Tag>
            )}
            {question.isRequired && (
              <Tag color="red">{t('takeExam.required')}</Tag>
            )}
          </Space>
        </div>

        <Title level={4}>{questionData.name || questionData.text}</Title>

        {questionData.image && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={questionData.image}
              alt="Question"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}
            />
          </div>
        )}

        {questionData.description && (
          <Paragraph type="secondary">{questionData.description}</Paragraph>
        )}

        <div style={{ marginTop: 24 }}>
          {questionData.type === 'mcq' && (
            <Radio.Group
              value={answers[currentQuestionIndex]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {questionData.choices?.map((choice, index) => (
                  <Radio key={index} value={choice} style={{ padding: '12px', border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                    {choice}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          )}

          {questionData.type === 'tf' && (
            <Radio.Group
              value={answers[currentQuestionIndex]}
              onChange={(e) => handleAnswerChange(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value={true}>{t('takeExam.true')}</Radio>
                <Radio value={false}>{t('takeExam.false')}</Radio>
              </Space>
            </Radio.Group>
          )}

          {questionData.type === 'multiple' && (
            <Checkbox.Group
              value={answers[currentQuestionIndex] || []}
              onChange={handleAnswerChange}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {questionData.choices?.map((choice, index) => (
                  <Checkbox key={index} value={choice} style={{ padding: '12px', border: '1px solid #d9d9d9', borderRadius: 4, width: '100%' }}>
                    {choice}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}

          {questionData.type === 'short' && (
            <Input
              placeholder={t('takeExam.enterAnswer')}
              value={answers[currentQuestionIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              size="large"
            />
          )}

          {questionData.type === 'essay' && (
            <TextArea
              placeholder={t('takeExam.enterAnswer')}
              value={answers[currentQuestionIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={6}
              size="large"
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('takeExam.loading')}</Text>
        </div>
      </div>
    );
  }

  if (!examData) {
    return (
      <Alert
        message={t('takeExam.notFound')}
        type="error"
        showIcon
      />
    );
  }

  // Phase 1: Exam Information & Start
  if (!examStarted) {
    const now = new Date();
    const startTime = examData.startTime ? new Date(examData.startTime) : null;
    const endTime = examData.endTime ? new Date(examData.endTime) : null;

    // Check if exam is available
    if (startTime && now < startTime) {
      return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
          <Alert
            message={t('takeExam.examNotAvailableYet')}
            description={`${t('exams.startTime')}: ${startTime.toLocaleString('vi-VN')}`}
            type="warning"
            showIcon
          />
        </div>
      );
    }

    if (endTime && now > endTime) {
      return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
          <Alert
            message={t('takeExam.examNotAvailable')}
            description={`${t('exams.endTime')}: ${endTime.toLocaleString('vi-VN')}`}
            type="error"
            showIcon
          />
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        {/* Exam Header */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2}>{examData.name}</Title>
            {examData.description && (
              <Paragraph type="secondary" style={{ fontSize: 16 }}>
                {examData.description}
              </Paragraph>
            )}
          </div>

          {/* Exam Statistics */}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6f6f6' }}>
                <Statistic
                  title={t('takeExam.timeLimit')}
                  value={examData.duration}
                  suffix={t('takeExam.minutes')}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: 18 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6f6f6' }}>
                <Statistic
                  title={t('exams.totalQuestions')}
                  value={examData.questions?.length || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6f6f6' }}>
                <Statistic
                  title={t('exams.totalMarks')}
                  value={examData.totalMarks}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: 18 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6f6f6' }}>
                <Statistic
                  title={t('exams.maxAttempts')}
                  value={examData.maxAttempts}
                  suffix={`/ ${examData.maxAttempts}`}
                  prefix={<CheckOutlined />}
                  valueStyle={{ color: '#722ed1', fontSize: 18 }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Exam Details */}
        <Card title={t('exams.examDetails')} style={{ marginBottom: 24 }}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            {examData.examPurpose && (
              <Descriptions.Item label={t('exams.examPurpose')}>
                <Tag color="blue">{examData.examPurpose}</Tag>
              </Descriptions.Item>
            )}
            {startTime && (
              <Descriptions.Item label={t('exams.startTime')}>
                {startTime.toLocaleString('vi-VN')}
              </Descriptions.Item>
            )}
            {endTime && (
              <Descriptions.Item label={t('exams.endTime')}>
                {endTime.toLocaleString('vi-VN')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('takeExam.timeLimit')}>
              {examData.duration} {t('takeExam.minutes')}
            </Descriptions.Item>
            <Descriptions.Item label={t('exams.questions')}>
              {examData.questions?.length || 0} {t('takeExam.questions')}
            </Descriptions.Item>
            <Descriptions.Item label={t('exams.totalMarks')}>
              {examData.totalMarks} {t('takeExam.marks')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Password Input (if required) */}
        {examData.examPassword && (
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>
                <LockOutlined /> {t('takeExam.enterPassword')}
              </Title>
              <Text type="secondary">{t('takeExam.passwordRequired')}</Text>
              <Input.Password
                placeholder={t('takeExam.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="large"
                onPressEnter={handleStartExam}
              />
            </Space>
          </Card>
        )}

        {/* Instructions */}
        {examData.settings?.instructions && (
          <Card style={{ marginBottom: 24 }}>
            <Title level={4}>{t('takeExam.instructions')}</Title>
            <div dangerouslySetInnerHTML={{ __html: examData.settings.instructions }} />
          </Card>
        )}

        {/* Start Button */}
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartExam}
              loading={startingExam}
              style={{ minWidth: 200, height: 50, fontSize: 16 }}
            >
              {t('takeExam.startExam')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Phase 2: Exam Taking (existing logic)
  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const progressPercent = (answeredCount / examData.questions.length) * 100;

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Timer & Progress Bar - Fixed */}
      <Affix offsetTop={64}>
        <Card style={{ marginBottom: 16, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>{examData.name}</Title>
            </div>

            <Space size="large">
              <div>
                <ClockCircleOutlined style={{ marginRight: 8, fontSize: 20, color: timeRemaining < 300 ? '#ff4d4f' : '#1890ff' }} />
                <Text strong style={{ fontSize: 20, color: timeRemaining < 300 ? '#ff4d4f' : '#1890ff' }}>
                  {formatTime(timeRemaining)}
                </Text>
              </div>

              <div>
                <Progress
                  type="circle"
                  percent={Math.round(progressPercent)}
                  width={60}
                  format={() => `${answeredCount}/${examData.questions.length}`}
                />
              </div>
            </Space>
          </div>
        </Card>
      </Affix>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap-reverse' }}>
        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <Card>
            {renderQuestion()}

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Button
                onClick={handleMarkForReview}
                icon={<FlagOutlined />}
                type={markedForReview.has(currentQuestionIndex) ? 'primary' : 'default'}
              >
                {markedForReview.has(currentQuestionIndex)
                  ? t('takeExam.unmarked')
                  : t('takeExam.markForReview')
                }
              </Button>

              <Space>
                <Button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  {t('takeExam.previous')}
                </Button>

                {currentQuestionIndex < examData.questions.length - 1 ? (
                  <Button type="primary" onClick={handleNextQuestion}>
                    {t('takeExam.next')}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    danger
                    icon={<CheckOutlined />}
                    onClick={handleSubmitClick}
                    loading={submitting}
                  >
                    {t('takeExam.submit')}
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </div>

        {/* Question Navigator */}
        <Card
          title={t('takeExam.questionNavigator')}
          style={{ width: 300 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {examData.questions.map((_, index) => (
              <Button
                key={index}
                onClick={() => handleQuestionSelect(index)}
                style={{
                  background: index === currentQuestionIndex
                    ? '#1890ff'
                    : getStatusColor(getQuestionStatus(index)),
                  color: index === currentQuestionIndex || answers[index] !== null ? 'white' : '#666',
                  border: 'none',
                  height: 40,
                }}
              >
                {index + 1}
              </Button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 2 }} />
                <Text>{t('takeExam.answered')}: {answeredCount}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, background: '#faad14', borderRadius: 2 }} />
                <Text>{t('takeExam.marked')}: {markedForReview.size}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, background: '#d9d9d9', borderRadius: 2 }} />
                <Text>{t('takeExam.unanswered')}: {examData.questions.length - answeredCount}</Text>
              </div>
            </Space>
          </div>

          <Button
            type="primary"
            danger
            block
            icon={<CheckOutlined />}
            onClick={handleSubmitClick}
            loading={submitting}
            style={{ marginTop: 16 }}
          >
            {t('takeExam.submit')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default TakeExamNew;
