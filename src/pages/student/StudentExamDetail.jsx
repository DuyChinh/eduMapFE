import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography
} from 'antd';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import examStatsService from '../../api/examStatsService';
import useAuthStore from '../../store/authStore';
import './StudentExamDetail.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const StudentExamDetail = () => {
  const { examId, studentId, submissionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const { user } = useAuthStore();
  
  // Check if current user is teacher or admin
  const isTeacherOrAdmin = user && (user.role === 'teacher' || user.role === 'admin');

  const [submissionData, setSubmissionData] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [editingComment, setEditingComment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('mcq');

  useEffect(() => {
    fetchSubmissionDetail();
  }, [examId, studentId, submissionId]);

  const fetchSubmissionDetail = async () => {
    setLoading(true);
    try {
      let response;
      // If submissionId is provided, use the new API endpoint
      if (submissionId) {
        response = await examStatsService.getSubmissionDetailById(examId, submissionId);
      } else if (studentId) {
        // Otherwise, use the old API endpoint with studentId
        response = await examStatsService.getStudentSubmissionDetail(examId, studentId);
      } else {
        throw new Error('Missing submissionId or studentId');
      }
      const data = response.data || response;
      setSubmissionData(data);
      if (data.comment) {
        setComment(data.comment);
      }
      // Fetch activity log after getting submission data
      // Pass data directly to avoid state update delay
      if (data._id) {
        fetchActivityLog(data);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      messageApi.error(t('submissionDetail.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async (submissionDataParam = null) => {
    setActivityLoading(true);
    try {
      const data = submissionDataParam || submissionData;
      
      // Get studentId from params or submissionData
      const targetStudentId = studentId || data?.student?._id;
      const targetSubmissionId = submissionId || data?._id;
      
      if (!targetStudentId) {
        console.warn('Cannot fetch activity log: studentId not found');
        setActivityLog([]);
        return;
      }
      
      if (!targetSubmissionId) {
        console.warn('Cannot fetch activity log: submissionId not found');
        setActivityLog([]);
        return;
      }
      
      const response = await examStatsService.getSubmissionActivityLog(examId, targetStudentId, targetSubmissionId);
      const logData = response.data || response;
      
      // Handle both array and object with data property
      if (Array.isArray(logData)) {
        setActivityLog(logData);
      } else if (logData?.data && Array.isArray(logData.data)) {
        setActivityLog(logData.data);
      } else {
        setActivityLog([]);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setActivityLog([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      start: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
      answer: <FileTextOutlined style={{ color: '#52c41a' }} />,
      change: <HistoryOutlined style={{ color: '#faad14' }} />,
      submit: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      tab_switch: <EyeOutlined style={{ color: '#ff4d4f' }} />,
      visibility: <EyeOutlined style={{ color: '#ff4d4f' }} />,
      copy_attempt: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      paste_attempt: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      right_click: <CloseCircleOutlined style={{ color: '#faad14' }} />,
      beforeunload: <WarningOutlined style={{ color: '#ff4d4f' }} />,
    };
    return icons[type] || <ClockCircleOutlined />;
  };

  const getActivityColor = (type) => {
    const colors = {
      start: 'blue',
      answer: 'green',
      change: 'orange',
      submit: 'green',
      tab_switch: 'red',
      copy_attempt: 'red',
      paste_attempt: 'red',
      right_click: 'orange',
      beforeunload: 'red',
      visibility: 'orange',
    };
    return colors[type] || 'default';
  };

  const getActivityDisplayText = (activity) => {
    // Priority: meta.reason > action > type
    if (activity.meta?.reason) {
      return activity.meta.reason;
    }
    return activity.action || activity.type || activity.event || '-';
  };

  const getActivitySummary = () => {
    if (!activityLog || activityLog.length === 0) return {};
    
    const summary = {};
    activityLog.forEach((activity) => {
      const key = activity.type || activity.event || 'unknown';
      summary[key] = (summary[key] || 0) + 1;
    });
    
    return summary;
  };

  const formatActivityType = (type) => {
    const typeMap = {
      right_click: t('submissionDetail.activityTypes.rightClick'),
      beforeunload: t('submissionDetail.activityTypes.pageUnload'),
      visibility: t('submissionDetail.activityTypes.tabSwitch'),
      tab_switch: t('submissionDetail.activityTypes.tabSwitch'),
      start: t('submissionDetail.activityTypes.start'),
      answer: t('submissionDetail.activityTypes.answer'),
      change: t('submissionDetail.activityTypes.change'),
      submit: t('submissionDetail.activityTypes.submit'),
      copy_attempt: t('submissionDetail.activityTypes.copyAttempt'),
      paste_attempt: t('submissionDetail.activityTypes.pasteAttempt'),
    };
    return typeMap[type] || type;
  };

  const [savingComment, setSavingComment] = useState(false);

  const handleSaveComment = async () => {
    setSavingComment(true);
    try {
      // TODO: Implement API call to save comment
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      messageApi.success(t('submissionDetail.commentSaved'));
      setEditingComment(false);
    } catch (error) {
      console.error('Error saving comment:', error);
      messageApi.error(t('submissionDetail.commentSaveFailed'));
    } finally {
      setSavingComment(false);
    }
  };

  const handleResetAttempt = async () => {
    try {
      // Get studentId from params or from submissionData
      const targetStudentId = studentId || submissionData?.student?._id;
      if (!targetStudentId) {
        messageApi.error(t('submissionDetail.resetAttemptFailed') || 'Cannot reset: Student ID not found');
        return;
      }
      await examStatsService.resetStudentAttempt(examId, targetStudentId);
      messageApi.success(t('submissionDetail.resetAttemptSuccess') || 'Student attempt reset successfully. Student can now retake the exam.');
      // Refresh the page or navigate back
      navigate(-1);
    } catch (error) {
      console.error('Error resetting attempt:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.response?.data?.message || error?.message || t('submissionDetail.resetAttemptFailed'));
      messageApi.error(errorMessage);
    }
  };

  const formatTimeSpent = (seconds) => {
    if (!seconds) return `0 ${t('common.seconds')}`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours} ${t('common.hours')} ${minutes} ${t('common.minutes')} ${secs} ${t('common.seconds')}`;
    } else if (minutes > 0) {
      return `${minutes} ${t('common.minutes')} ${secs} ${t('common.seconds')}`;
    } else {
      return `${secs} ${t('common.seconds')}`;
    }
  };

  const getCorrectAnswerCount = () => {
    if (!submissionData?.answers) return 0;
    return submissionData.answers.filter(answer => answer.isCorrect).length;
  };

  const getTotalQuestions = () => {
    return submissionData?.answers?.length || 0;
  };

  const getMCQAnswers = () => {
    if (!submissionData?.answers) return [];
    return submissionData.answers.filter(answer => {
      const question = answer.question;
      if (!question) return false;
      return question?.type === 'mcq';
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submissionData) {
    return (
      <Card>
        <Alert
          message={t('submissionDetail.noData')}
          type="info"
          showIcon
        />
        <Button 
          type="primary" 
          onClick={() => navigate(-1)}
          style={{ marginTop: 16 }}
        >
          {t('common.back')}
        </Button>
      </Card>
    );
  }

  const exam = submissionData.exam || {};
  const student = submissionData.student || {};
  const mcqAnswers = getMCQAnswers();

  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    },
  };

  const renderMathContent = (content) => {
    if (!content) return '';
    
    // Split by lines and process each line separately
    const lines = content.split('\n');
    return (
      <>
        {lines.map((line, index) => {
          // Skip empty lines but preserve them
          if (!line.trim()) {
            return <br key={index} />;
          }
          
          // Check if line contains LaTeX commands
          const hasLatex = line.includes('\\') || line.includes('^') || line.includes('_');
          const hasDollarSigns = line.includes('$') || line.includes('\\(');
          
          if (hasLatex && !hasDollarSigns) {
            // Mixed content - need to parse and render properly
            // Split by LaTeX patterns and render each part
            const parts = line.split(/(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*)/g);
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {parts.map((part, partIndex) => {
                  if (part.match(/^\\[a-zA-Z]+/)) {
                    // This is a LaTeX command, render with MathJax
                    return (
                      <MathJax key={partIndex} inline>
                        {`$${part}$`}
                      </MathJax>
                    );
                  } else {
                    // This is plain text, render as is
                    return <span key={partIndex}>{part}</span>;
                  }
                })}
              </div>
            );
          } else if (hasDollarSigns) {
            // Already has dollar signs, render as is
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                <MathJax>{line}</MathJax>
              </div>
            );
          } else {
            // Plain text, render as is with preserved formatting
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {line}
              </div>
            );
          }
        })}
      </>
    );
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="submission-detail-container">
        {/* Header */}
        <div className="submission-header">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            style={{ marginBottom: 16 }}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {exam.name || t('submissionDetail.examName')}
          </Title>
        </div>

        <Row gutter={[24, 24]}>
          {/* Left Sidebar */}
          <Col xs={24} lg={8}>
            <Card className="student-info-card">
              <div className="student-profile">
                <Avatar 
                  size={64} 
                  src={student.avatar} 
                  icon={<UserOutlined />}
                />
                <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
                  {student.name || t('submissionDetail.unknownStudent')}
                </Title>
                <Text type="secondary">{student.email}</Text>
              </div>

              <Divider />

              <div className="detail-section">
                <Title level={5}>{t('submissionDetail.detailedInfo')}</Title>
                
                <div className="detail-item">
                  <Text strong>{t('submissionDetail.score')}: </Text>
                  <Text style={{ fontSize: 18, color: '#1890ff' }}>
                    {typeof submissionData.score === 'number' ? Number(submissionData.score.toFixed(1)) : (submissionData.score || 0)}/{submissionData.totalMarks || 0}
                  </Text>
                </div>

                <div className="detail-item">
                  <Text strong>{t('submissionDetail.comment')}: </Text>
                  {editingComment ? (
                    <div style={{ marginTop: 8 }}>
                      <TextArea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder={t('submissionDetail.commentPlaceholder')}
                      />
                      <Space style={{ marginTop: 8 }}>
                        <Button size="small" type="primary" onClick={handleSaveComment} loading={savingComment}>
                          {t('common.save')}
                        </Button>
                        <Button size="small" onClick={() => setEditingComment(false)}>
                          {t('common.cancel')}
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <Text>{comment || t('submissionDetail.noComment')}</Text>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => setEditingComment(true)}
                        style={{ padding: 0, marginLeft: 8 }}
                      />
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <Text strong>{t('submissionDetail.timeSpent')}: </Text>
                  <Text>{formatTimeSpent(submissionData.timeSpent)}</Text>
                </div>

                <div className="detail-item">
                  <Text strong>{t('submissionDetail.submittedAt')}: </Text>
                  <Text>
                    {submissionData.submittedAt 
                      ? new Date(submissionData.submittedAt).toLocaleString('vi-VN')
                      : '-'
                    }
                  </Text>
                </div>

                <div className="detail-item">
                  <Text strong>{t('submissionDetail.mcq')}: </Text>
                  <Text>
                    {getCorrectAnswerCount()} ({getCorrectAnswerCount()}/{getTotalQuestions()} {t('submissionDetail.questions')})
                  </Text>
                </div>

                <div className="detail-item">
                  <Text strong>{t('submissionDetail.gradedBy')}: </Text>
                  <Text>{student.name || t('submissionDetail.unknownTeacher')}</Text>
                </div>

                <Divider />

                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    icon={<FileTextOutlined />}
                    block
                    onClick={() => {
                      // TODO: Navigate to activity log
                    }}
                  >
                    {t('submissionDetail.viewActivityLog')}
                  </Button>
                  
                  {isTeacherOrAdmin && (
                    <Popconfirm
                      title={t('submissionDetail.resetAttemptConfirm') || `Are you sure you want to reset this student's attempt? This will delete all submissions and allow the student to retake the exam from attempt 1.`}
                      onConfirm={handleResetAttempt}
                      okText={t('common.yes')}
                      cancelText={t('common.no')}
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        icon={<ReloadOutlined />}
                        block
                        danger
                      >
                        {t('submissionDetail.resetAttempt') || 'Reset Attempt (Allow Retake)'}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>

                <Divider />

                <Button block>
                  {t('submissionDetail.viewAllAttempts')} ({submissionData.attemptNumber || 1})
                </Button>

                <div className="pagination-controls" style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button
                    icon={<LeftOutlined />}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  />
                  <Text style={{ margin: '0 16px' }}>
                    {currentPage} / {1}
                  </Text>
                  <Button
                    icon={<RightOutlined />}
                    disabled={currentPage >= 1}
                    onClick={() => setCurrentPage(p => p + 1)}
                  />
                </div>
              </div>
            </Card>
          </Col>

          {/* Main Content */}
          <Col xs={24} lg={16}>
            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'mcq',
                    label: t('submissionDetail.mcqTab'),
                    children: (
                      <div className="questions-container">
                        {mcqAnswers.length === 0 ? (
                          <Empty description={t('submissionDetail.noQuestions')} />
                        ) : (
                          mcqAnswers.map((answer, index) => {
                            const question = answer.question;
                            if (!question) return null;

                            const questionId = question._id || question.id;
                            const selectedAnswer = answer.selectedAnswer;
                            const correctAnswer = question.correctAnswer || question.answer;
                            const isCorrect = answer.isCorrect;
                            const choices = question.choices || [];

                            return (
                              <Card
                                key={questionId || index}
                                className="question-card"
                                style={{ marginBottom: 24 }}
                              >
                                <div className="question-header">
                                  <Space>
                                    <Text strong style={{ fontSize: 16 }}>
                                      {t('submissionDetail.question')} {index + 1}
                                    </Text>
                                    <Text type="secondary">ID: {questionId}</Text>
                                    <Button
                                      type="text"
                                      icon={<EditOutlined />}
                                      size="small"
                                    />
                                  </Space>
                                </div>

                                <Divider />

                                <div className="question-content">
                                  <Paragraph style={{ 
                                    fontSize: 16, 
                                    marginBottom: 16,
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'inherit'
                                  }}>
                                    {renderMathContent(question.text || question.name)}
                                  </Paragraph>

                                  <div className="choices-container">
                                    {choices.map((choice) => {
                                      const isSelected = selectedAnswer === choice.key;
                                      const isCorrectChoice = correctAnswer === choice.key;
                                      
                                      return (
                                        <div
                                          key={choice.key}
                                          className={`choice-item ${
                                            isSelected && !isCorrect ? 'choice-wrong' : ''
                                          } ${isCorrectChoice ? 'choice-correct' : ''}`}
                                        >
                                          <Space>
                                            <Text strong>{choice.key}.</Text>
                                            <div style={{
                                              wordWrap: 'break-word',
                                              overflowWrap: 'break-word',
                                              whiteSpace: 'pre-wrap',
                                              fontFamily: 'inherit'
                                            }}>
                                              {renderMathContent(choice.text)}
                                            </div>
                                            {isSelected && !isCorrect && (
                                              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                            )}
                                            {isCorrectChoice && (
                                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                            )}
                                          </Space>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <Divider />

                                  <div className="answer-feedback">
                                    <Text strong style={{ color: '#52c41a' }}>
                                      {t('submissionDetail.correctAnswer')}: {correctAnswer}
                                    </Text>
                                    <div style={{ marginTop: 8 }}>
                                      <Text>
                                        {t('submissionDetail.studentAnswer')}: {selectedAnswer ?? 'None'}
                                        {selectedAnswer && !isCorrect && (
                                          <CloseCircleOutlined 
                                            style={{ color: '#ff4d4f', marginLeft: 8 }} 
                                          />
                                        )}
                                      </Text>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'activity',
                    label: (
                      <Space>
                        <HistoryOutlined />
                        {t('submissionDetail.activityTab')}
                      </Space>
                    ),
                    children: (
                      <div className="activity-container">
                        {activityLoading ? (
                          <div style={{ textAlign: 'center', padding: '50px' }}>
                            <Spin size="large" />
                          </div>
                        ) : activityLog.length === 0 ? (
                          <Empty description={t('submissionDetail.noActivityLog')} />
                        ) : (
                          <>
                            {/* Activity Summary */}
                            {Object.keys(getActivitySummary()).length > 0 && (
                              <div className="activity-summary" style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                                <Text strong>{t('submissionDetail.activitySummary')}: </Text>
                                <div style={{ marginTop: 8 }}>
                                  {Object.entries(getActivitySummary()).map(([type, count]) => (
                                    <Tag key={type} color={getActivityColor(type)} style={{ marginBottom: 4 }}>
                                      {formatActivityType(type)}: {count}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Timeline mode="left">
                              {activityLog.map((activity, index) => (
                                <Timeline.Item
                                  key={activity._id || index}
                                  dot={getActivityIcon(activity.type || activity.event)}
                                  color={getActivityColor(activity.type || activity.event)}
                                >
                                  <div>
                                    <Text strong>{getActivityDisplayText(activity)}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {activity.timestamp 
                                        ? new Date(activity.timestamp).toLocaleString('vi-VN')
                                        : activity.createdAt
                                        ? new Date(activity.createdAt).toLocaleString('vi-VN')
                                        : '-'
                                      }
                                    </Text>
                                    {activity.meta?.visible !== undefined && (
                                      <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                          {activity.meta.visible 
                                            ? t('submissionDetail.tabVisible') 
                                            : t('submissionDetail.tabHidden')
                                          }
                                        </Text>
                                      </div>
                                    )}
                                    {activity.severity && (
                                      <div style={{ marginTop: 4 }}>
                                        <Tag 
                                          color={
                                            activity.severity === 'high' ? 'red' :
                                            activity.severity === 'medium' ? 'orange' : 'default'
                                          }
                                          size="small"
                                        >
                                          {t(`submissionDetail.severity.${activity.severity}`)}
                                        </Tag>
                                        {activity.isSuspicious && (
                                          <Tag color="red" size="small" style={{ marginLeft: 4 }}>
                                            {t('submissionDetail.suspicious')}
                                          </Tag>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </MathJaxContext>
  );
};

export default StudentExamDetail;
