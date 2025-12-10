import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import {
  Card,
  Typography,
  Button,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Table,
  Alert,
  Spin,
  Tabs,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { getSubmissionById } from '../../api/submissionService';
import examStatsService from '../../api/examStatsService';
import './ExamResultDetail.css';

const { Title, Text, Paragraph } = Typography;

const ExamResultDetail = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'correct', 'incorrect'
  const [activeTab, setActiveTab] = useState('mcq');

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setLoading(true);
        const response = await getSubmissionById(submissionId);
        const submissionData = response.data || response;

        setSubmission(submissionData);

        // Get exam from submission
        let examData = null;
        let examId = null;

        if (submissionData.examId) {
          if (typeof submissionData.examId === 'object') {
            examData = submissionData.examId;
            examId = examData._id || examData.id;
          } else {
            examId = submissionData.examId;
            const examResponse = await (await import('../../api/examService')).default.getExamById(examId);
            examData = examResponse.data || examResponse;
          }

          setExam(examData);

          // Check if leaderboard should be shown (hideLeaderboard === false means show it)
          if (examData && examData.hideLeaderboard === false) {
            setShowLeaderboard(true);
            // Load leaderboard
            await loadLeaderboard(examId);
          }
        }
      } catch (error) {
        console.error('Error loading submission:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [submissionId]);

  const loadLeaderboard = async (examId) => {
    try {
      const response = await examStatsService.getExamLeaderboard(examId);
      const leaderboardData = response.data || response || [];
      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setShowLeaderboard(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submission || !exam) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Alert
            message={t('takeExam.submissionNotFound') || 'Submission not found'}
            type="error"
            action={
              <Button onClick={() => navigate('/student/results')}>
                {t('common.back') || 'Back'}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const examData = exam;
  const questions = examData?.questions || [];
  const answers = submission.answers || [];
  const canViewAnswers = examData?.viewExamAndAnswer !== undefined && examData?.viewExamAndAnswer !== 0;

  // Create answer map for easy lookup
  const answerMap = {};
  answers.forEach(answer => {
    const questionId = answer.questionId || (answer.question?._id?._id || answer.question?._id || answer.question?.id);
    if (questionId) {
      answerMap[questionId] = answer;
    }
  });

  // Get MCQ questions with answers
  const getMCQQuestions = () => {
    return questions
      .map((q, index) => {
        const question = (q.questionId && typeof q.questionId === 'object' && q.questionId.text !== undefined)
          ? q.questionId
          : null;

        if (!question || question.type !== 'mcq') return null;

        const questionId = question._id?.toString() || question.id?.toString();
        const answer = answerMap[questionId];
        const isCorrect = answer?.isCorrect;
        const userAnswer = answer?.value || answer?.selectedAnswer;
        const correctAnswer = question.answer || question.correctAnswer;

        return {
          question,
          questionId,
          answer,
          isCorrect,
          userAnswer,
          correctAnswer,
          index,
          marks: q.marks || 1,
          earnedMarks: answer?.points || answer?.earnedMarks || 0,
        };
      })
      .filter(q => q !== null);
  };

  const mcqQuestions = getMCQQuestions();

  // Filter questions based on filterType
  const filteredQuestions = mcqQuestions.filter(q => {
    if (filterType === 'all') return true;
    if (filterType === 'correct') return q.isCorrect;
    if (filterType === 'incorrect') return !q.isCorrect;
    return true;
  });

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

    const lines = content.split('\n');
    return (
      <>
        {lines.map((line, index) => {
          if (!line.trim()) {
            return <br key={index} />;
          }

          const hasLatex = line.includes('\\') || line.includes('^') || line.includes('_');
          const hasDollarSigns = line.includes('$') || line.includes('\\(');

          if (hasLatex && !hasDollarSigns) {
            const parts = line.split(/(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*)/g);
            return (
              <div key={index} style={{
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {parts.map((part, partIndex) => {
                  if (part.match(/^\\[a-zA-Z]+/)) {
                    return (
                      <MathJax key={partIndex} inline>
                        {`$${part}$`}
                      </MathJax>
                    );
                  } else {
                    return <span key={partIndex}>{part}</span>;
                  }
                })}
              </div>
            );
          } else if (hasDollarSigns) {
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

  const leaderboardColumns = [
    {
      title: t('takeExam.rank') || 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        if (rank === 1) {
          return (
            <img
              src="/1st-medal.png"
              alt="1st Place"
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          );
        }
        if (rank === 2) {
          return (
            <img
              src="/2nd-medal.png"
              alt="2nd Place"
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          );
        }
        if (rank === 3) {
          return (
            <img
              src="/3rd-medal.png"
              alt="3rd Place"
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          );
        }
        return <Text strong>#{rank}</Text>;
      }
    },
    {
      title: t('takeExam.studentName') || 'Student',
      key: 'student',
      render: (_, record) => record.student?.name || '-'
    },
    {
      title: t('takeExam.score') || 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => `${score || 0}/${record.totalMarks || 0}`
    },
    {
      title: t('takeExam.percentage') || 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage}%`
    }
  ];

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="exam-result-detail-container">
        {/* Header */}
        <div className="result-header">
          <div className="header-left">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/student/results')}
              style={{ marginBottom: 16 }}
            >
              {t('common.back') || 'Back'}
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              {examData?.name || 'Exam Results'}
            </Title>
          </div>
          <div className="header-right">
            <Space.Compact>
              <Button
                type={filterType === 'all' ? 'primary' : 'default'}
                onClick={() => setFilterType('all')}
              >
                {t('studentResults.filterAll') || 'Đúng & Sai'}
              </Button>
              <Button
                type={filterType === 'correct' ? 'primary' : 'default'}
                onClick={() => setFilterType('correct')}
              >
                {t('studentResults.filterCorrect') || 'Đúng'}
              </Button>
              <Button
                type={filterType === 'incorrect' ? 'primary' : 'default'}
                onClick={() => setFilterType('incorrect')}
              >
                {t('studentResults.filterIncorrect') || 'Sai'}
              </Button>
            </Space.Compact>
          </div>
        </div>

        {/* Score Summary */}
        <Card className="result-summary-card" style={{ marginBottom: '24px' }}>
          <Row gutter={24}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title={t('takeExam.yourScore') || 'Your Score'}
                value={typeof submission.score === 'number' ? Number(submission.score.toFixed(1)) : (submission.score || 0)}
                suffix={`/ ${submission.maxScore || 0}`}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title={t('takeExam.percentage') || 'Percentage'}
                value={submission.percentage || 0}
                suffix="%"
                valueStyle={{
                  color: submission.percentage >= 80 ? '#52c41a' :
                    submission.percentage >= 50 ? '#faad14' : '#ff4d4f'
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title={t('takeExam.status') || 'Status'}
                value={
                  submission.status || 'Submitted'
                }
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title={t('takeExam.timeSpent') || 'Time Spent'}
                value={Math.floor((submission.timeSpent || 0) / 60)}
                suffix={t('takeExam.minutes') || 'minutes'}
              />
            </Col>
          </Row>
        </Card>

        {/* Leaderboard */}
        {showLeaderboard && leaderboard.length > 0 && (
          <Card
            title={<><TrophyOutlined /> {t('takeExam.leaderboard') || 'Leaderboard'}</>}
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={leaderboardColumns}
              dataSource={leaderboard}
              rowKey="rank"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        )}

        {/* Questions and Answers */}
        {canViewAnswers ? (
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'mcq',
                  label: t('submissionDetail.mcqTab') || 'Trắc nghiệm',
                  children: (
                    <div className="questions-list">
                      {filteredQuestions.length === 0 ? (
                        <Empty description={t('submissionDetail.noQuestions') || 'No questions found'} />
                      ) : (
                        filteredQuestions.map((item) => {
                          const { question, isCorrect, userAnswer, correctAnswer, index, questionId } = item;
                          const choices = question.choices || [];

                          return (
                            <Card
                              key={questionId || index}
                              className="question-card"
                              style={{ marginBottom: 24 }}
                            >
                              <div className="question-card-header">
                                <div className="question-title">
                                  <Text strong style={{ fontSize: 16 }}>
                                    {t('submissionDetail.question') || 'Question'} {index + 1}
                                  </Text>
                                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                    ID: {questionId}
                                  </Text>
                                </div>
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  size="small"
                                />
                              </div>

                              <Divider />

                              <div className="question-content">
                                <div className="question-text-wrapper">
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

                                  {question.images && question.images.length > 0 ? (
                                    <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                      {question.images.map((imgUrl, idx) => (
                                        <img
                                          key={idx}
                                          src={imgUrl}
                                          alt={`Question ${idx + 1}`}
                                          style={{
                                            maxWidth: '100%',
                                            maxHeight: '300px',
                                            objectFit: 'contain',
                                            borderRadius: '8px',
                                            border: '1px solid #f0f0f0'
                                          }}
                                        />
                                      ))}
                                    </div>
                                  ) : question.image ? (
                                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                      <img
                                        src={question.image}
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
                                  ) : null}
                                </div>

                                <div className="choices-list">
                                  {choices.map((choice) => {
                                    const isSelected = userAnswer === choice.key;
                                    const isCorrectChoice = correctAnswer === choice.key;

                                    let choiceClassName = 'choice-item';
                                    if (isCorrectChoice) {
                                      choiceClassName += ' choice-correct';
                                    } else if (isSelected && !isCorrect) {
                                      choiceClassName += ' choice-incorrect';
                                    }

                                    return (
                                      <div key={choice.key} className={choiceClassName}>
                                        <div className="choice-content">
                                          <Text strong style={{ marginRight: 8 }}>{choice.key}.</Text>
                                          <span style={{
                                            wordWrap: 'break-word',
                                            overflowWrap: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'inherit'
                                          }}>
                                            {renderMathContent(choice.text)}
                                          </span>
                                          {/* Render choice image if exists */}
                                          {choice.image && (
                                            <div style={{ marginLeft: '12px' }}>
                                              <img
                                                src={choice.image}
                                                alt={`Choice ${choice.key}`}
                                                style={{
                                                  maxWidth: '100%',
                                                  maxHeight: '150px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px',
                                                  border: '1px solid #f0f0f0'
                                                }}
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {isCorrectChoice && (
                                          <div className="choice-icon correct-icon">
                                            <CheckCircleOutlined />
                                          </div>
                                        )}
                                        {isSelected && !isCorrect && (
                                          <div className="choice-icon incorrect-icon">
                                            <CloseCircleOutlined />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="correct-answer-section">
                                  <Text style={{ fontSize: 14 }}>
                                    {t('submissionDetail.correctAnswer') || 'Đáp án đúng'}: <Text strong>{correctAnswer}</Text>
                                  </Text>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card>
            <Alert
              message={t('takeExam.answersNotAvailable') || 'Answers are not available yet'}
              description={t('takeExam.answersNotAvailableDesc') || 'The exam answers will be available after all students have completed the exam.'}
              type="info"
            />
          </Card>
        )}
      </div>
    </MathJaxContext>
  );
};

export default ExamResultDetail;
