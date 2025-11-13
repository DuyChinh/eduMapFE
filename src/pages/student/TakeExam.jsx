import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { 
  Card, 
  Button, 
  Radio, 
  Checkbox, 
  Input, 
  Space, 
  Progress, 
  Modal, 
  message,
  Typography,
  Divider,
  Alert
} from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  SaveOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { 
  startSubmission, 
  updateSubmissionAnswers, 
  submitExam 
} from '../../api/submissionService';
import { logProctorEvent } from '../../api/proctorService';
import './TakeExam.css';

const { Title, Text, Paragraph } = Typography;

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0); // seconds
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [examPassword, setExamPassword] = useState('');
  const [shareCode, setShareCode] = useState(null);
  
  const autoSaveIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Store refs for functions that will be defined later
  const handleTimeUpRef = useRef(null);
  const handleAutoSaveRef = useRef(null);

  // Function to start exam with password (defined early so it can be used in useEffect)
  const startExamWithPassword = useCallback(async (passwordToUse) => {
    try {
      setLoading(true);
      
      const response = await startSubmission(examId, passwordToUse);
      let result;
      if (response.ok && response.data) {
        result = response.data;
      } else if (response.data && response.data.submission) {
        result = response.data;
      } else if (response.submission) {
        result = response;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      const submissionResult = result.submission;
      const examData = result.exam;
      
      if (!submissionResult || !examData) {
        console.error('Missing submission or exam in response:', result);
        throw new Error('Invalid response format from server');
      }
      
      setSubmission(submissionResult);
      setExam(examData);
      
      // Initialize answers
      const initialAnswers = {};
      if (submissionResult.answers) {
        submissionResult.answers.forEach(answer => {
          initialAnswers[answer.questionId] = answer.value;
        });
      }
      setAnswers(initialAnswers);

      // Calculate time remaining
      const durationSeconds = examData.duration * 60;
      const startedAt = new Date(submissionResult.startedAt);
      const now = new Date();
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setTimeRemaining(remaining);
      startTimeRef.current = startedAt;

      // Start timer
      if (remaining > 0) {
        timerIntervalRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              if (handleTimeUpRef.current) {
                handleTimeUpRef.current();
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      // Start auto-save
      autoSaveIntervalRef.current = setInterval(() => {
        if (handleAutoSaveRef.current) {
          handleAutoSaveRef.current();
        }
      }, 15000);

      message.success(t('takeExam.examStarted'));
      return true;
    } catch (error) {
      // Don't show toast here, error will be handled by error page
      throw error;
    } finally {
      setLoading(false);
    }
  }, [examId]);

  // Proctoring: Track visibility and fullscreen
  useEffect(() => {
    if (!submission) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctorEvent(
          submission._id,
          'visibility',
          'medium',
          { visible: false, reason: 'Tab switched or minimized' }
        );
      } else {
        logProctorEvent(
          submission._id,
          'visibility',
          'low',
          { visible: true }
        );
      }
    };

    const handleFullscreenChange = () => {
      logProctorEvent(
        submission._id,
        'fullscreen',
        document.fullscreenElement ? 'low' : 'medium',
        { fullscreen: !!document.fullscreenElement }
      );
    };

    const handleBeforeUnload = (e) => {
      logProctorEvent(
        submission._id,
        'beforeunload',
        'high',
        { reason: 'Page unload attempt' }
      );
      e.preventDefault();
      e.returnValue = '';
    };

    // Prevent copy/paste and right-click
    const handleCopy = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, 'copy_paste', 'high', { action: 'copy' });
      message.warning('Copying is not allowed during the exam');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, 'copy_paste', 'high', { action: 'paste' });
      message.warning('Pasting is not allowed during the exam');
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, 'right_click', 'medium', {});
      message.warning('Right-click is disabled during the exam');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('contextmenu', handleRightClick);

    // Disable keyboard shortcuts
    const handleKeyDown = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        logProctorEvent(submission._id, 'tab_switch', 'high', { action: 'devtools' });
        message.warning('Developer tools are disabled during the exam');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [submission]);

  // Initialize exam
  useEffect(() => {
    const initExam = async () => {
      try {
        setLoading(true);
        
        // Check if came from public link (shareCode)
        const storedShareCode = sessionStorage.getItem('shareCode');
        if (storedShareCode) {
          setShareCode(storedShareCode);
        }
        
        // Get password from sessionStorage if available (from public link)
        let storedPassword = sessionStorage.getItem('examPassword') || '';
        
        // Always check if exam requires password before calling API
        // If no password in storage, fetch exam info to check if password is required
        if (!storedPassword) {
          try {
            const examService = (await import('../../api/examService')).default;
            let examResponse;
            
            // If we have shareCode, use it to get exam info (public endpoint)
            if (storedShareCode) {
              examResponse = await examService.getExamByShareCode(storedShareCode);
            } else {
              // If no shareCode, try to get exam by ID (may require auth)
              // If this fails, we'll catch the error and let the API handle password check
              try {
                examResponse = await examService.getExamById(examId);
              } catch (authError) {
                // If getExamById requires auth and fails, we can't check password here
                // Proceed to API call, which will return password error if needed
                console.log('Cannot check password preemptively, will check via API');
                examResponse = null;
              }
            }
            
            // If exam requires password and we don't have it, show password modal
            // examPassword is a boolean flag from API (true if password required)
            if (examResponse?.data?.examPassword === true) {
              setShowPasswordModal(true);
              setLoading(false);
              return; // Wait for user to enter password
            }
          } catch (error) {
            console.error('Error fetching exam info:', error);
            // If we can't fetch exam info, try to proceed anyway
            // The API will return error if password is required
          }
        }
        
        // Clear password from sessionStorage after reading (for security)
        if (storedPassword) {
          sessionStorage.removeItem('examPassword');
        }
        
        // Start exam with password
        await startExamWithPassword(storedPassword);
      } catch (error) {
        // Get error message from API like CreateClassModal pattern
        const errorMessage = typeof error === 'string' 
          ? error 
          : (error?.response?.data?.message || error?.message || t('takeExam.failedToStart'));
        
        // If password error, show password modal
        if (errorMessage.includes('password') || errorMessage.includes('Invalid exam password')) {
          const storedShareCode = sessionStorage.getItem('shareCode');
          if (storedShareCode) {
            setShareCode(storedShareCode);
          }
          setShowPasswordModal(true);
          setLoading(false);
          return; // Don't redirect, show password modal instead
        }
        
        // For other errors (max attempts, not available, etc.), show error page
        // No toast needed since we have error page
        navigate('/student/exam-error', {
          state: {
            errorMessage,
            errorType: errorMessage.includes('maximum') || errorMessage.includes('attempts') 
              ? 'maxAttempts' 
              : 'error'
          },
          replace: true
        });
      } finally {
        setLoading(false);
      }
    };

    initExam();

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [examId, navigate]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!submission || autoSaveStatus === 'saving') return;

    try {
      setAutoSaveStatus('saving');
      const answersArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }));

      await updateSubmissionAnswers(submission._id, answersArray);
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
      console.error('Auto-save failed:', error);
    }
  }, [submission, answers, autoSaveStatus]);

  // Update refs when functions are defined
  useEffect(() => {
    handleAutoSaveRef.current = handleAutoSave;
  }, [handleAutoSave]);

  // Manual save
  const handleSave = async () => {
    await handleAutoSave();
    message.success(t('takeExam.saved'));
  };

  // Handle submit (defined before handleTimeUp)
  const handleSubmit = useCallback(async () => {
    if (!submission) return;
    
    try {
      setSubmitting(true);
      
      // Final save before submit
      const answersArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }));
      await updateSubmissionAnswers(submission._id, answersArray);

      // Submit exam
      const response = await submitExam(submission._id);
      
      // Clear intervals
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      message.success(t('takeExam.submitSuccess'));
      
      // Navigate to result detail page to view answers
      const submissionId = response.data?._id || response.data?.data?._id || response._id;
      navigate(`/student/results/${submissionId}`, { replace: true });
    } catch (error) {
      message.error(error.response?.data?.message || t('takeExam.submitFailed'));
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [submission, answers, navigate]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    message.warning(t('takeExam.timeUp'));
    await handleSubmit();
  }, [handleSubmit]);

  // Update ref when function is defined
  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);


  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Navigation
  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < (exam?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !showPasswordModal) {
    return <div className="take-exam-loading">{t('takeExam.loading')}</div>;
  }

  if (showPasswordModal) {
    return (
      <div className="take-exam-loading">
        <Modal
          title={t('takeExam.enterPassword')}
          open={showPasswordModal}
          onOk={async () => {
            if (!examPassword) {
              message.error(t('takeExam.pleaseEnterPassword'));
              return;
            }
            
            try {
              setShowPasswordModal(false);
              await startExamWithPassword(examPassword);
              // Clear password from storage
              sessionStorage.removeItem('examPassword');
            } catch (error) {
              const errorMessage = error.response?.data?.message || t('takeExam.failedToStart');
              if (errorMessage.includes('password')) {
                setShowPasswordModal(true);
                setExamPassword('');
              } else {
                if (shareCode) {
                  navigate(`/exam/${shareCode}`, { replace: true });
                } else {
                  navigate('/student/dashboard');
                }
              }
            }
          }}
          onCancel={() => {
            if (shareCode) {
              navigate(`/exam/${shareCode}`, { replace: true });
            } else {
              navigate('/student/dashboard');
            }
          }}
          okText={t('takeExam.startExam')}
          cancelText={t('common.cancel')}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <p>{t('takeExam.passwordRequired')}</p>
            <Input.Password
              placeholder={t('takeExam.passwordPlaceholder')}
              value={examPassword}
              onChange={(e) => setExamPassword(e.target.value)}
              onPressEnter={() => {
                if (examPassword) {
                  // Trigger OK button
                  setTimeout(() => {
                    const okButton = document.querySelector('.ant-modal-footer .ant-btn-primary');
                    if (okButton) {
                      okButton.click();
                    }
                  }, 100);
                }
              }}
              size="large"
              autoFocus
            />
          </Space>
        </Modal>
      </div>
    );
  }

  if (!exam || !submission) {
    return <div>{t('takeExam.examNotFound')}</div>;
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const questionOrder = submission.questionOrder || [];
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '').length;
  const progress = (answeredCount / totalQuestions) * 100;

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
    <div className="take-exam-container">
      {/* Header */}
      <Card className="take-exam-header">
        <div className="header-content">
          <div>
            <Title level={4}>{exam.name}</Title>
            <Text type="secondary">{exam.description}</Text>
          </div>
          <div className="header-actions">
            <Space>
              <div className="timer">
                <ClockCircleOutlined /> 
                <Text strong className={timeRemaining < 300 ? 'time-warning' : ''}>
                  {formatTime(timeRemaining)}
                </Text>
              </div>
              <Button 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                loading={autoSaveStatus === 'saving'}
              >
                {autoSaveStatus === 'saved' ? t('takeExam.saved') : t('takeExam.save')}
              </Button>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
              >
                {t('takeExam.submit')}
              </Button>
            </Space>
          </div>
        </div>
        <Divider />
        <div className="progress-section">
          <Progress 
            percent={progress} 
            status={progress === 100 ? 'success' : 'active'}
            format={() => `${answeredCount}/${totalQuestions} ${t('takeExam.questions')}`}
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="take-exam-content">
        {/* Question Navigation Sidebar */}
        <Card className="question-nav-card" title={t('takeExam.questions')}>
          <div className="question-nav-grid">
            {exam.questions.map((q, index) => {
              const questionId = q.questionId._id || q.questionId;
              const isAnswered = answers[questionId] !== undefined && answers[questionId] !== '';
              const isCurrent = index === currentQuestionIndex;
              
              let buttonClass = 'question-nav-btn';
              if (isCurrent) {
                buttonClass += ' question-current';
              } else if (isAnswered) {
                buttonClass += ' question-answered';
              } else {
                buttonClass += ' question-unanswered';
              }
              
              return (
                <Button
                  key={index}
                  shape="circle"
                  onClick={() => goToQuestion(index)}
                  className={buttonClass}
                  size="large"
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Question Card */}
        <Card className="question-card">
          <div className="question-header">
            <Text strong>{t('takeExam.question')} {currentQuestionIndex + 1} {t('takeExam.of')} {totalQuestions}</Text>
            <Text type="secondary">
              {currentQuestion.marks || 1} {currentQuestion.marks === 1 ? t('takeExam.mark') : t('takeExam.marks')}
            </Text>
          </div>
          
          <Divider />
          
          <div className="question-content">
            <Paragraph className="question-text">
              <MathJax inline dynamic>
                {currentQuestion.questionId.text || currentQuestion.questionId.name}
              </MathJax>
            </Paragraph>

            {/* Render question based on type */}
            {currentQuestion.questionId.type === 'mcq' && (
              <Radio.Group
                value={answers[currentQuestion.questionId._id || currentQuestion.questionId]}
                onChange={(e) => handleAnswerChange(
                  currentQuestion.questionId._id || currentQuestion.questionId,
                  e.target.value
                )}
              >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {currentQuestion.questionId.choices?.map((choice, idx) => (
                    <Radio key={idx} value={choice.key} className="choice-radio">
                      <MathJax inline dynamic>
                        {choice.text}
                      </MathJax>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            )}

            {currentQuestion.questionId.type === 'tf' && (
              <Radio.Group
                value={answers[currentQuestion.questionId._id || currentQuestion.questionId]}
                onChange={(e) => handleAnswerChange(
                  currentQuestion.questionId._id || currentQuestion.questionId,
                  e.target.value
                )}
              >
                <Space direction="vertical" size="large">
                  <Radio value="true">{t('takeExam.true')}</Radio>
                  <Radio value="false">{t('takeExam.false')}</Radio>
                </Space>
              </Radio.Group>
            )}

            {(currentQuestion.questionId.type === 'short' || currentQuestion.questionId.type === 'essay') && (
              <Input.TextArea
                rows={currentQuestion.questionId.type === 'essay' ? 8 : 4}
                value={answers[currentQuestion.questionId._id || currentQuestion.questionId] || ''}
                onChange={(e) => handleAnswerChange(
                  currentQuestion.questionId._id || currentQuestion.questionId,
                  e.target.value
                )}
                placeholder={t('takeExam.typeAnswer')}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <Divider />
          <div className="question-navigation">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
            >
              {t('takeExam.previous')}
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={goToNext}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              {t('takeExam.next')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Time Warning */}
      {timeRemaining < 300 && timeRemaining > 0 && (
        <Alert
          message={t('takeExam.timeWarning')}
          description={`${t('takeExam.onlyTimeRemaining')} ${formatTime(timeRemaining)} ${t('takeExam.timeRemaining')}!`}
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          closable
          className="time-warning-alert"
        />
      )}

      {/* Confirm Submit Modal */}
      <Modal
        title={t('takeExam.confirmSubmit')}
        open={showConfirmSubmit}
        onOk={handleSubmit}
        onCancel={() => setShowConfirmSubmit(false)}
        confirmLoading={submitting}
        okText={t('common.yes') + ', ' + t('takeExam.submit')}
        cancelText={t('common.cancel')}
      >
        <p>{t('takeExam.confirmSubmitMessage')}</p>
        <p>{t('takeExam.answeredQuestions')} {answeredCount} {t('takeExam.outOf')} {totalQuestions} {t('takeExam.questions')}.</p>
        <p><strong>{t('takeExam.cannotUndo')}</strong></p>
      </Modal>

    </div>
    </MathJaxContext>
  );
};

export default TakeExam;

