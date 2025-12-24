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

  // Update activeTab if the current tab has no questions
  useEffect(() => {
    if (!exam) return;
    
    const examData = exam;
    const questions = examData?.questions || [];
    
    const mcqCount = questions.filter(q => q.questionId?.type === 'mcq').length;
    const tfCount = questions.filter(q => q.questionId?.type === 'tf').length;
    const shortCount = questions.filter(q => q.questionId?.type === 'short').length;
    const essayCount = questions.filter(q => q.questionId?.type === 'essay').length;
    
    const availableTabs = [];
    if (mcqCount > 0) availableTabs.push('mcq');
    if (tfCount > 0) availableTabs.push('tf');
    if (shortCount > 0) availableTabs.push('short');
    if (essayCount > 0) availableTabs.push('essay');
    
    // If current activeTab doesn't have questions, switch to first available tab
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [exam, activeTab]);

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

  // Get questions by type with answers
  const getQuestionsByType = (type) => {
    return questions
      .map((q, index) => {
        const question = (q.questionId && typeof q.questionId === 'object' && q.questionId.text !== undefined)
          ? q.questionId
          : null;

        if (!question || question.type !== type) return null;

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

  const mcqQuestions = getQuestionsByType('mcq');
  const tfQuestions = getQuestionsByType('tf');
  const shortQuestions = getQuestionsByType('short');
  const essayQuestions = getQuestionsByType('essay');

  // Filter questions based on filterType
  const filterQuestions = (questionList) => {
    return questionList.filter(q => {
      if (filterType === 'all') return true;
      if (filterType === 'correct') return q.isCorrect;
      if (filterType === 'incorrect') return !q.isCorrect;
      return true;
    });
  };

  // Format number - remove decimal if it's a whole number
  const formatNumber = (num) => {
    if (typeof num !== 'number') return num || 0;
    const rounded = Number(num.toFixed(2));
    return rounded % 1 === 0 ? Math.round(rounded) : rounded;
  };

  const filteredMcqQuestions = filterQuestions(mcqQuestions);
  const filteredTfQuestions = filterQuestions(tfQuestions);
  const filteredShortQuestions = filterQuestions(shortQuestions);
  const filteredEssayQuestions = filterQuestions(essayQuestions);

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
        // Color palette for ranks 4+
        const colors = [
          { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' }, // blue
          { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' }, // green
          { bg: '#fff7e6', border: '#ffd591', text: '#fa8c16' }, // orange
          { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' }, // purple
          { bg: '#fff0f6', border: '#ffadd2', text: '#eb2f96' }, // pink
          { bg: '#e6fffb', border: '#87e8de', text: '#13c2c2' }, // cyan
          { bg: '#fcffe6', border: '#eaff8f', text: '#a0d911' }, // lime
          { bg: '#fff1f0', border: '#ffa39e', text: '#f5222d' }, // red
        ];
        const colorIndex = (rank - 4) % colors.length;
        const color = colors[colorIndex];
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: color.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 14,
              color: color.text,
              border: `2px solid ${color.border}`,
            }}
          >
            {rank}
          </div>
        );
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
      render: (score, record) => {
        const formattedScore = formatNumber(score);
        const formattedTotal = formatNumber(record.totalMarks);
        return `${formattedScore}/${formattedTotal}`;
      }
    },
    {
      title: t('takeExam.percentage') || 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage}%`
    }
  ];

  // Render MCQ question
  const renderMCQQuestion = (item) => {
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
  };

  // Render True/False question
  const renderTFQuestion = (item) => {
    const { question, isCorrect, userAnswer, correctAnswer, index, questionId } = item;

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

          {question.images && question.images.length > 0 && (
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
          )}

          <div className="choices-list" style={{ marginTop: 16, marginBottom: 16 }}>
            {[
              { key: 'true', text: t('questions.true') || 'True', value: true },
              { key: 'false', text: t('questions.false') || 'False', value: false }
            ].map((choice) => {
              const userAnswerBool = userAnswer === 'true' || userAnswer === true;
              const correctAnswerBool = correctAnswer === 'true' || correctAnswer === true;
              const isSelected = userAnswerBool === choice.value;
              const isCorrectChoice = correctAnswerBool === choice.value;

              let choiceClassName = 'choice-item';
              if (isCorrectChoice) {
                choiceClassName += ' choice-correct';
              } else if (isSelected && !isCorrect) {
                choiceClassName += ' choice-incorrect';
              }

              return (
                <div key={choice.key} className={choiceClassName}>
                  <div className="choice-content">
                    <Text strong style={{ marginRight: 8 }}>{choice.key.toUpperCase()[0]}.</Text>
                    <span>{choice.text}</span>
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
              {t('submissionDetail.correctAnswer') || 'Đáp án đúng'}: <Text strong>{correctAnswer === true || correctAnswer === 'true' ? (t('questions.true') || 'True') : (t('questions.false') || 'False')}</Text>
            </Text>
          </div>
        </div>
      </Card>
    );
  };

  // Render Short Answer question
  const renderShortQuestion = (item) => {
    const { question, isCorrect, userAnswer, correctAnswer, index, questionId } = item;

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
          {isCorrect ? (
            <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
          )}
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

          {question.images && question.images.length > 0 && (
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
          )}

          <div style={{ marginTop: 16 }}>
            <Text strong>{t('submissionDetail.yourAnswer') || 'Your Answer'}: </Text>
            <div style={{
              padding: '12px',
              backgroundColor: isCorrect ? '#f6ffed' : '#fff2e8',
              border: `1px solid ${isCorrect ? '#b7eb8f' : '#ffbb96'}`,
              borderRadius: '4px',
              marginTop: 8
            }}>
              <Text>{userAnswer || t('submissionDetail.noAnswer') || 'No answer'}</Text>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Text strong>{t('submissionDetail.correctAnswer') || 'Correct Answer'}: </Text>
            <div style={{
              padding: '12px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              marginTop: 8
            }}>
              <Text>{correctAnswer}</Text>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Render Essay question
  const renderEssayQuestion = (item) => {
    const { question, isCorrect, userAnswer, correctAnswer, index, questionId, earnedMarks, marks } = item;

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
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {t('submissionDetail.score') || 'Score'}: {formatNumber(earnedMarks)}/{formatNumber(marks)}
            </Text>
          </div>
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

          {question.images && question.images.length > 0 && (
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
          )}

          <div style={{ marginTop: 16 }}>
            <Text strong>{t('submissionDetail.yourAnswer') || 'Your Answer'}: </Text>
            <div style={{
              padding: '12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              marginTop: 8,
              minHeight: '100px'
            }}>
              <Paragraph style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {userAnswer || t('submissionDetail.noAnswer') || 'No answer'}
              </Paragraph>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Text strong>{t('submissionDetail.sampleAnswer') || 'Sample Answer'}: </Text>
            <div style={{
              padding: '12px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              marginTop: 8,
              minHeight: '100px'
            }}>
              <Paragraph style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {correctAnswer}
              </Paragraph>
            </div>
          </div>
        </div>
      </Card>
    );
  };

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
                value={formatNumber(submission.score)}
                suffix={`/ ${formatNumber(submission.maxScore)}`}
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
                mcqQuestions.length > 0 && {
                  key: 'mcq',
                  label: `${t('questions.mcq') || 'Multiple Choice'} (${filteredMcqQuestions.length})`,
                  children: (
                    <div className="questions-list">
                      {filteredMcqQuestions.length === 0 ? (
                        <Empty description={t('submissionDetail.noQuestions') || 'No questions found'} />
                      ) : (
                        filteredMcqQuestions.map(renderMCQQuestion)
                      )}
                    </div>
                  ),
                },
                tfQuestions.length > 0 && {
                  key: 'tf',
                  label: `${t('questions.tf') || 'True/False'} (${filteredTfQuestions.length})`,
                  children: (
                    <div className="questions-list">
                      {filteredTfQuestions.length === 0 ? (
                        <Empty description={t('submissionDetail.noQuestions') || 'No questions found'} />
                      ) : (
                        filteredTfQuestions.map(renderTFQuestion)
                      )}
                    </div>
                  ),
                },
                shortQuestions.length > 0 && {
                  key: 'short',
                  label: `${t('questions.short') || 'Short Answer'} (${filteredShortQuestions.length})`,
                  children: (
                    <div className="questions-list">
                      {filteredShortQuestions.length === 0 ? (
                        <Empty description={t('submissionDetail.noQuestions') || 'No questions found'} />
                      ) : (
                        filteredShortQuestions.map(renderShortQuestion)
                      )}
                    </div>
                  ),
                },
                essayQuestions.length > 0 && {
                  key: 'essay',
                  label: `${t('questions.essay') || 'Essay'} (${filteredEssayQuestions.length})`,
                  children: (
                    <div className="questions-list">
                      {filteredEssayQuestions.length === 0 ? (
                        <Empty description={t('submissionDetail.noQuestions') || 'No questions found'} />
                      ) : (
                        filteredEssayQuestions.map(renderEssayQuestion)
                      )}
                    </div>
                  ),
                },
              ].filter(Boolean)}
            />
          </Card>
        ) : (
          <Card className="congratulations-card" style={{ border: 'none', overflow: 'hidden' }}>
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: '#fff',
              position: 'relative'
            }}>
              {/* Decorative elements */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                fontSize: '48px',
                opacity: 0.3
              }}>🎉</div>
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '48px',
                opacity: 0.3
              }}>🎊</div>
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '40px',
                fontSize: '36px',
                opacity: 0.3
              }}>⭐</div>
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '40px',
                fontSize: '36px',
                opacity: 0.3
              }}>✨</div>

              {/* Main content */}
              <div style={{ fontSize: '72px', marginBottom: '24px' }}>
                🎉
              </div>
              <Title level={2} style={{ color: '#fff', marginBottom: '16px', fontSize: '32px' }}>
                {t('takeExam.congratulations') || 'Chúc mừng bạn đã hoàn thành bài thi!'}
              </Title>
              <Text style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.95)', display: 'block', marginBottom: '32px' }}>
                {t('takeExam.examSubmitted') || 'Bài thi của bạn đã được nộp thành công'}
              </Text>

              {/* Score highlight */}
              <div style={{
                marginTop: '40px',
                padding: '32px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <Row gutter={32} justify="center">
                  <Col xs={12} sm={8}>
                    <div>
                      <Text strong style={{ fontSize: '40px', color: '#fff', display: 'block', marginBottom: '8px' }}>
                        {formatNumber(submission.score)}
                      </Text>
                      <Text style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {t('takeExam.totalScore') || 'Tổng điểm'}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div>
                      <Text strong style={{ fontSize: '40px', color: '#fff', display: 'block', marginBottom: '8px' }}>
                        {submission.percentage || 0}%
                      </Text>
                      <Text style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {t('takeExam.percentage') || 'Phần trăm'}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Success icon */}
              <div style={{ marginTop: '32px' }}>
                <CheckCircleOutlined style={{ fontSize: '56px', color: '#52c41a' }} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </MathJaxContext>
  );
};

export default ExamResultDetail;
