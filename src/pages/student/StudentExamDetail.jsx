import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import {
  Card,
  Typography,
  Space,
  Button,
  Spin,
  message,
  Descriptions,
  Tag,
  Row,
  Col,
  Divider,
  Alert,
  Avatar,
  Input,
  Tabs,
  Popconfirm,
  Empty,
  Timeline,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  HistoryOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import examStatsService from '../../api/examStatsService';
import { App } from 'antd';
import './StudentExamDetail.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const StudentExamDetail = () => {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();

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
    fetchActivityLog();
  }, [examId, studentId]);

  const fetchSubmissionDetail = async () => {
    setLoading(true);
    try {
      const response = await examStatsService.getStudentSubmissionDetail(examId, studentId);
      const data = response.data || response;
      setSubmissionData(data);
      if (data.comment) {
        setComment(data.comment);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      messageApi.error(t('submissionDetail.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    setActivityLoading(true);
    try {
      const response = await examStatsService.getSubmissionActivityLog(examId, studentId);
      setActivityLog(response.data || response || []);
    } catch (error) {
      console.error('Error fetching activity log:', error);
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
      copy_attempt: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      paste_attempt: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
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
    };
    return colors[type] || 'default';
  };

  const handleSaveComment = async () => {
    try {
      // TODO: Implement API call to save comment
      messageApi.success(t('submissionDetail.commentSaved'));
      setEditingComment(false);
    } catch (error) {
      console.error('Error saving comment:', error);
      messageApi.error(t('submissionDetail.commentSaveFailed'));
    }
  };

  const handleDeleteSubmission = async (allowRetake = false) => {
    try {
      // TODO: Implement API call to delete submission
      messageApi.success(t(allowRetake ? 'submissionDetail.deleteAndRetakeSuccess' : 'submissionDetail.deleteAndBanSuccess'));
      navigate(-1);
    } catch (error) {
      console.error('Error deleting submission:', error);
      messageApi.error(t('submissionDetail.deleteFailed'));
    }
  };

  const formatTimeSpent = (seconds) => {
    if (!seconds) return '0 giây';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours} giờ ${minutes} phút ${secs} giây`;
    } else if (minutes > 0) {
      return `${minutes} phút ${secs} giây`;
    } else {
      return `${secs} giây`;
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
      // Handle nested _id structure from API: answer.question._id contains full question data
      // Structure: answer.question._id = { _id: "...", text: "...", type: "mcq", ... }
      const question = answer.question?._id || answer.question;
      if (!question) return false;
      // question itself contains all the question data, including _id, type, text, etc.
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
  const answers = submissionData.answers || [];
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
                    {submissionData.score || 0}/{submissionData.totalMarks || 0}
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
                        <Button size="small" type="primary" onClick={handleSaveComment}>
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
                  
                  <Popconfirm
                    title={t('submissionDetail.deleteAndRetakeConfirm')}
                    onConfirm={() => handleDeleteSubmission(true)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      icon={<DeleteOutlined />}
                      block
                      danger
                    >
                      {t('submissionDetail.deleteAndRetake')}
                    </Button>
                  </Popconfirm>

                  <Popconfirm
                    title={t('submissionDetail.deleteAndBanConfirm')}
                    onConfirm={() => handleDeleteSubmission(false)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      icon={<DeleteOutlined />}
                      block
                      danger
                    >
                      {t('submissionDetail.deleteAndBan')}
                    </Button>
                  </Popconfirm>
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
                            // Handle nested _id structure from API: answer.question._id contains full question data
                            // Structure: answer.question._id = { _id: "...", text: "...", type: "mcq", choices: [...], answer: "D", ... }
                            const question = answer.question?._id || answer.question;
                            if (!question) return null;

                            // question._id is the actual question ID, question itself contains all data
                            const questionId = question._id || question.id;
                            const selectedAnswer = answer.selectedAnswer;
                            const correctAnswer = question.answer;
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
                                    {selectedAnswer && (
                                      <div style={{ marginTop: 8 }}>
                                        <Text>
                                          {t('submissionDetail.studentAnswer')}: {selectedAnswer}
                                          {!isCorrect && (
                                            <CloseCircleOutlined 
                                              style={{ color: '#ff4d4f', marginLeft: 8 }} 
                                            />
                                          )}
                                        </Text>
                                      </div>
                                    )}
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
                          <Timeline mode="left">
                            {activityLog.map((activity, index) => (
                              <Timeline.Item
                                key={index}
                                dot={getActivityIcon(activity.type)}
                                color={getActivityColor(activity.type)}
                              >
                                <div>
                                  <Text strong>{activity.action || activity.type}</Text>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {activity.timestamp 
                                      ? new Date(activity.timestamp).toLocaleString('vi-VN')
                                      : activity.createdAt
                                      ? new Date(activity.createdAt).toLocaleString('vi-VN')
                                      : '-'
                                    }
                                  </Text>
                                  {activity.details && (
                                    <div style={{ marginTop: 4 }}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {activity.details}
                                      </Text>
                                    </div>
                                  )}
                                  {activity.questionId && (
                                    <div style={{ marginTop: 4 }}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {t('submissionDetail.question')}: {activity.questionId}
                                      </Text>
                                    </div>
                                  )}
                                </div>
                              </Timeline.Item>
                            ))}
                          </Timeline>
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
