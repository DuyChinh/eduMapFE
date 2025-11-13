import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Divider,
  Row,
  Col,
  Statistic,
  Table,
  Alert,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { getSubmissionById } from '../../api/submissionService';
import './ExamResultDetail.css';

const { Title, Text, Paragraph } = Typography;

/**
 * Page to view exam results with answers
 * Shows questions, user answers, correct answers, and score
 */
const ExamResultDetail = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      const submissionService = (await import('../../api/submissionService')).default;
      const response = await submissionService.getExamLeaderboard(examId);
      const leaderboardData = response.data || response;
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // If leaderboard is hidden or error, just don't show it
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
              <Button onClick={() => navigate('/student/dashboard')}>
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
  // viewExamAndAnswer: 0 = never, 1 = afterCompletion, 2 = afterAllFinish
  // For now, we show answers if viewExamAndAnswer is not 0 (simplified logic)
  const canViewAnswers = examData?.viewExamAndAnswer !== undefined && examData?.viewExamAndAnswer !== 0;

  // Create answer map for easy lookup
  const answerMap = {};
  answers.forEach(answer => {
    answerMap[answer.questionId] = answer;
  });

  const leaderboardColumns = [
    {
      title: t('takeExam.rank') || 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        if (rank === 1) return <TrophyOutlined style={{ color: '#ffd700', fontSize: '20px' }} />;
        if (rank === 2) return <TrophyOutlined style={{ color: '#c0c0c0', fontSize: '20px' }} />;
        if (rank === 3) return <TrophyOutlined style={{ color: '#cd7f32', fontSize: '20px' }} />;
        return <Text strong>#{rank}</Text>;
      }
    },
    {
      title: t('takeExam.studentName') || 'Student',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: t('takeExam.score') || 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => `${score}/${record.maxScore}`
    },
    {
      title: t('takeExam.percentage') || 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage}%`
    }
  ];

  return (
    <MathJaxContext config={{
      loader: { load: ["[tex]/html"] },
      tex: {
        packages: { "[+]": ["base", "ams", "noerrors", "noundefined", "html"] },
        inlineMath: [["$", "$"], ["\\(", "\\)"], ["\\[", "\\]"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true,
        macros: {
          dfrac: ["\\frac{#1}{#2}", 2]
        }
      }
    }}>
      <div className="exam-result-detail-container">
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/student/dashboard')}
            style={{ marginBottom: '16px' }}
          >
            {t('common.back') || 'Back'}
          </Button>
          <Title level={2}>{examData?.name || 'Exam Results'}</Title>
        </div>

        {/* Score Summary */}
        <Card className="result-summary-card" style={{ marginBottom: '24px' }}>
          <Row gutter={24}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title={t('takeExam.yourScore') || 'Your Score'}
                value={submission.score || 0}
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
                  <Tag color={submission.status === 'graded' ? 'success' : 'warning'}>
                    {submission.status === 'graded' ? t('takeExam.graded') || 'Graded' : 
                     submission.status === 'late' ? t('takeExam.late') || 'Late' : 
                     t('takeExam.submitted') || 'Submitted'}
                  </Tag>
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
            />
          </Card>
        )}

        {/* Questions and Answers */}
        {canViewAnswers && (
          <Card title={t('takeExam.questionsAndAnswers') || 'Questions and Answers'}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {questions.map((q, index) => {
                // q is ExamQuestionSchema: { questionId: ObjectId or populated Question, order, marks, isRequired }
                // questionId can be ObjectId string or populated Question object
                const question = (q.questionId && typeof q.questionId === 'object' && q.questionId.text !== undefined)
                  ? q.questionId 
                  : null;
                
                if (!question) {
                  console.warn('Question not found or not populated:', q);
                  return null;
                }
                
                const questionId = question._id?.toString() || question.id?.toString();
                const answer = answerMap[questionId];
                const isCorrect = answer?.isCorrect;
                const userAnswer = answer?.value;
                const correctAnswer = question.answer;

                return (
                  <Card
                    key={index}
                    className={`question-result-card ${isCorrect ? 'correct' : 'incorrect'}`}
                    style={{
                      borderLeft: `4px solid ${isCorrect ? '#52c41a' : '#ff4d4f'}`
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <Space>
                        <Text strong>Question {index + 1}</Text>
                        <Tag color={isCorrect ? 'success' : 'error'}>
                          {isCorrect ? (
                            <><CheckCircleOutlined /> {t('takeExam.correct') || 'Correct'}</>
                          ) : (
                            <><CloseCircleOutlined /> {t('takeExam.incorrect') || 'Incorrect'}</>
                          )}
                        </Tag>
                        <Text type="secondary">
                          {answer?.points || 0} / {q.marks || 1} {t('takeExam.marks') || 'marks'}
                        </Text>
                      </Space>
                    </div>

                    <Paragraph className="question-text">
                      <MathJax inline dynamic>
                        {question.text || question.name}
                      </MathJax>
                    </Paragraph>

                    <Divider />

                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Text strong style={{ color: '#1890ff' }}>
                          {t('takeExam.yourAnswer') || 'Your Answer'}: 
                        </Text>
                        <div style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                          {question.type === 'mcq' || question.type === 'tf' ? (
                            <Text>
                              {question.type === 'mcq' 
                                ? question.choices?.find(c => c.key === userAnswer)?.text || userAnswer
                                : userAnswer === 'true' ? t('takeExam.true') : t('takeExam.false')
                              }
                            </Text>
                          ) : (
                            <Text>{userAnswer || t('takeExam.noAnswer') || 'No answer'}</Text>
                          )}
                        </div>
                      </div>

                      {!isCorrect && (
                        <div>
                          <Text strong style={{ color: '#52c41a' }}>
                            {t('takeExam.correctAnswer') || 'Correct Answer'}: 
                          </Text>
                          <div style={{ marginTop: '8px', padding: '12px', background: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
                            {question.type === 'mcq' || question.type === 'tf' ? (
                              <Text>
                                {question.type === 'mcq'
                                  ? question.choices?.find(c => c.key === correctAnswer)?.text || correctAnswer
                                  : correctAnswer === 'true' ? t('takeExam.true') : t('takeExam.false')
                                }
                              </Text>
                            ) : (
                              <Text>{correctAnswer}</Text>
                            )}
                          </div>
                        </div>
                      )}
                    </Space>
                  </Card>
                );
              })}
            </Space>
          </Card>
        )}

        {!canViewAnswers && (
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

