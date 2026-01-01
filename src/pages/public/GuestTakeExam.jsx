import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Alert,
  Avatar,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import guestService from "../../api/guestService";
import useThemeStore from "../../store/themeStore";
import "../student/TakeExam.css";

const { Title, Text, Paragraph } = Typography;

/**
 * Guest Exam Taking Component - Same UI as TakeExam but for guests
 * Route: /guest/exam/:submissionId/take
 */
const GuestTakeExam = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { theme } = useThemeStore();
  const isDarkMode = theme === "dark";

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentVisibleQuestion, setCurrentVisibleQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [viewMode, setViewMode] = useState("all");

  // Refs
  const timerIntervalRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // MathJax config
  const mathJaxConfig = {
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
    },
    startup: {
      typeset: false,
    },
  };

  // Load exam data from session storage
  useEffect(() => {
    const storedGuestName = sessionStorage.getItem("guestName");
    const storedExamData = sessionStorage.getItem("guestExamData");
    const storedQuestionOrder = sessionStorage.getItem("guestQuestionOrder");

    if (!storedGuestName || !storedExamData || !submissionId) {
      message.error(t("guestExam.sessionExpired"));
      navigate("/");
      return;
    }

    try {
      setGuestName(storedGuestName);
      const examData = JSON.parse(storedExamData);
      
      // Order questions according to questionOrder
      const questionOrder = JSON.parse(storedQuestionOrder || "[]");
      if (questionOrder.length > 0) {
        const orderedQuestions = questionOrder
          .map((qId) => examData.questions.find((q) => q._id === qId))
          .filter(Boolean);
        if (orderedQuestions.length > 0) {
          examData.questions = orderedQuestions;
        }
      }

      setExam(examData);
      setTimeRemaining(examData.duration * 60);
      startTimeRef.current = new Date();
      setLoading(false);
    } catch (error) {
      console.error("Error loading exam data:", error);
      message.error(t("guestExam.failedToLoad"));
      navigate("/");
    }
  }, [submissionId, navigate, t, message]);

  // Timer
  useEffect(() => {
    if (!exam || timeRemaining <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [exam]);

  // Auto-save answers
  useEffect(() => {
    if (!submissionId || !guestName) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        const answersArray = Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        }));
        if (answersArray.length > 0) {
          await guestService.updateAnswers(submissionId, answersArray, guestName);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [submissionId, guestName, answers]);

  // Track visible question
  useEffect(() => {
    if (!exam?.questions?.length) return;

    const questionCards = document.querySelectorAll(".question-item-card");
    if (questionCards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(questionCards).indexOf(entry.target);
            if (index !== -1) {
              setCurrentVisibleQuestion(index);
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: "-100px 0px -100px 0px" }
    );

    questionCards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [exam?.questions?.length]);

  // Handlers
  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 20, 140));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 20, 80));
  const toggleViewMode = () => setViewMode((prev) => (prev === "all" ? "single" : "all"));

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < (exam?.questions?.length || 0)) {
      setCurrentQuestionIndex(index);
      if (viewMode === "all") {
        scrollToQuestion(index);
      }
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < (exam?.questions?.length || 0) - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const scrollToQuestion = (index) => {
    const questionCards = document.querySelectorAll(".question-item-card");
    if (questionCards[index]) {
      questionCards[index].scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentVisibleQuestion(index);
    }
  };

  const toggleFlag = (index, e) => {
    e?.stopPropagation();
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setShowConfirmSubmit(false);

      // Save answers first
      const answersArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      if (answersArray.length > 0) {
        await guestService.updateAnswers(submissionId, answersArray, guestName);
      }

      // Submit exam
      const response = await guestService.submitExam(submissionId, guestName);

      if (response && response.ok) {
        sessionStorage.removeItem("guestSubmissionId");
        sessionStorage.removeItem("guestExamData");
        sessionStorage.removeItem("guestQuestionOrder");
        sessionStorage.removeItem("guestName");

        navigate(`/guest/result/${submissionId}`, {
          replace: true,
          state: { result: response.data, guestName },
        });
      } else {
        throw new Error(response?.message || "Failed to submit exam");
      }
    } catch (error) {
      console.error("Submit failed:", error);
      message.error(t("guestExam.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Render math content
  const renderMathContent = (content) => {
    if (!content) return "";
    const contentStr = typeof content === "string" ? content : String(content);
    return (
      <MathJax>
        <span dangerouslySetInnerHTML={{ __html: contentStr }} />
      </MathJax>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="take-exam-loading">
        <Spin size="large" />
        <br />
        <Text>{t("takeExam.loading")}</Text>
      </div>
    );
  }

  if (!exam || !exam.questions?.length) {
    return (
      <div className="take-exam-loading">
        <Title level={4}>{t("guestExam.noQuestions")}</Title>
        <Button type="primary" onClick={() => navigate("/")}>
          {t("common.goHome")}
        </Button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = exam.questions[currentQuestionIndex];

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="take-exam-container" style={{ "--exam-font-scale": fontSize / 100 }}>
        {/* Header */}
        <div className="take-exam-header-new">
          <div className="header-left">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/")}
              className="back-button"
            >
              {t("common.back")}
            </Button>
          </div>

          <div className="header-center">
            <div className="candidate-info">
              <Avatar size={36} icon={<UserOutlined />} className="candidate-avatar" />
              <div className="candidate-details">
                <span className="candidate-name">{guestName}</span>
                <span className="candidate-label">
                  <Tag color="orange" style={{ margin: 0 }}>{t("guestExam.guestMode")}</Tag>
                </span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <Space size={8} className="header-controls">
              {/* Timer */}
              <div className={`timer-box ${timeRemaining < 300 ? "time-warning" : ""}`}>
                <ClockCircleOutlined className="timer-icon" />
                <span className="timer-text">{formatTime(timeRemaining)}</span>
              </div>

              {/* Zoom Controls */}
              <div className="zoom-controls">
                <Button
                  type="text"
                  icon={<ZoomOutOutlined />}
                  onClick={handleZoomOut}
                  className="header-icon-btn"
                  disabled={fontSize <= 80}
                />
                <span className="zoom-level">{fontSize}%</span>
                <Button
                  type="text"
                  icon={<ZoomInOutlined />}
                  onClick={handleZoomIn}
                  className="header-icon-btn"
                  disabled={fontSize >= 140}
                />
              </div>

              <Divider type="vertical" className="header-divider" />

              {/* View Mode Toggle */}
              <Button
                type="text"
                icon={viewMode === "all" ? <AppstoreOutlined /> : <UnorderedListOutlined />}
                onClick={toggleViewMode}
                className="header-icon-btn view-mode-btn"
                title={viewMode === "all" ? t("takeExam.singleView") : t("takeExam.allView")}
              />

              {/* Submit Button */}
              <Button
                type="primary"
                onClick={() => setShowConfirmSubmit(true)}
                className="submit-button"
                loading={submitting}
              >
                {t("takeExam.submit")}
              </Button>
            </Space>
          </div>
        </div>

        {/* Main Content */}
        <div className="take-exam-wrapper">
          {/* Questions Content - Placed FIRST to appear on LEFT */}
          <div className="take-exam-content-new">
            {viewMode === "all" ? (
              // All Questions View
              exam.questions.map((q, index) => {
                const questionId = q._id;
                const question = q;

                return (
                  <Card key={questionId} className="question-item-card">
                    <div className="question-item-header">
                      <span className="question-number">
                        {t("takeExam.question")} {index + 1}
                      </span>
                      <Button
                        type="text"
                        icon={<FlagOutlined />}
                        onClick={(e) => toggleFlag(index, e)}
                        className={`flag-button ${flaggedQuestions.has(index) ? "flagged" : ""}`}
                      />
                    </div>

                    <div className="question-item-content">
                      <Paragraph className="question-text">
                        {renderMathContent(question.text)}
                      </Paragraph>

                      {/* MCQ */}
                      {question.type === "mcq" && (
                        <Radio.Group
                          value={answers[questionId]}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                          className="question-options"
                        >
                          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                            {question.choices?.map((choice, idx) => {
                              const choiceValue = choice.key || choice._id;
                              const isSelected = answers[questionId] === choiceValue;
                              return (
                                <div
                                  key={choice._id || `choice-${idx}`}
                                  className={`choice-option ${isSelected ? "choice-selected" : ""}`}
                                  onClick={() => handleAnswerChange(questionId, choiceValue)}
                                >
                                  <Radio
                                    value={choiceValue}
                                    className="choice-radio-new"
                                  >
                                    <span className="choice-label">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    {renderMathContent(choice.text)}
                                  </Radio>
                                </div>
                              );
                            })}
                          </Space>
                        </Radio.Group>
                      )}

                      {/* True/False */}
                      {question.type === "tf" && (
                        <Radio.Group
                          value={answers[questionId]}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                          className="question-options"
                        >
                          <Space direction="vertical" size="middle">
                            <div
                              className={`choice-option ${answers[questionId] === "true" ? "choice-selected" : ""}`}
                              onClick={() => handleAnswerChange(questionId, "true")}
                            >
                              <Radio value="true" className="choice-radio-new">
                                <span className="choice-label">A.</span> {t("guestExam.true")}
                              </Radio>
                            </div>
                            <div
                              className={`choice-option ${answers[questionId] === "false" ? "choice-selected" : ""}`}
                              onClick={() => handleAnswerChange(questionId, "false")}
                            >
                              <Radio value="false" className="choice-radio-new">
                                <span className="choice-label">B.</span> {t("guestExam.false")}
                              </Radio>
                            </div>
                          </Space>
                        </Radio.Group>
                      )}

                      {/* Short Answer */}
                      {question.type === "short" && (
                        <Input.TextArea
                          value={answers[questionId] || ""}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                          placeholder={t("guestExam.enterAnswer")}
                          rows={3}
                          className="answer-textarea"
                        />
                      )}

                      {/* Essay */}
                      {question.type === "essay" && (
                        <Input.TextArea
                          value={answers[questionId] || ""}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                          placeholder={t("guestExam.enterAnswer")}
                          rows={6}
                          className="answer-textarea"
                        />
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              // Single Question View
              <Card className="question-item-card">
                <div className="question-item-header">
                  <span className="question-number">
                    {t("takeExam.question")} {currentQuestionIndex + 1}
                  </span>
                  <Button
                    type="text"
                    icon={<FlagOutlined />}
                    onClick={(e) => toggleFlag(currentQuestionIndex, e)}
                    className={`flag-button ${flaggedQuestions.has(currentQuestionIndex) ? "flagged" : ""}`}
                  />
                </div>

                <div className="question-item-content">
                  <Paragraph className="question-text">
                    {renderMathContent(currentQuestion.text)}
                  </Paragraph>

                  {/* MCQ */}
                  {currentQuestion.type === "mcq" && (
                    <Radio.Group
                      value={answers[currentQuestion._id]}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      className="question-options"
                    >
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        {currentQuestion.choices?.map((choice, idx) => {
                          const choiceValue = choice.key || choice._id;
                          const isSelected = answers[currentQuestion._id] === choiceValue;
                          return (
                            <div
                              key={choice._id || `choice-${idx}`}
                              className={`choice-option ${isSelected ? "choice-selected" : ""}`}
                              onClick={() => handleAnswerChange(currentQuestion._id, choiceValue)}
                            >
                              <Radio value={choiceValue} className="choice-radio-new">
                                <span className="choice-label">{String.fromCharCode(65 + idx)}.</span>
                                {renderMathContent(choice.text)}
                              </Radio>
                            </div>
                          );
                        })}
                      </Space>
                    </Radio.Group>
                  )}

                  {/* True/False */}
                  {currentQuestion.type === "tf" && (
                    <Radio.Group
                      value={answers[currentQuestion._id]}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      className="question-options"
                    >
                      <Space direction="vertical" size="middle">
                        <div
                          className={`choice-option ${answers[currentQuestion._id] === "true" ? "choice-selected" : ""}`}
                          onClick={() => handleAnswerChange(currentQuestion._id, "true")}
                        >
                          <Radio value="true" className="choice-radio-new">
                            <span className="choice-label">A.</span> {t("guestExam.true")}
                          </Radio>
                        </div>
                        <div
                          className={`choice-option ${answers[currentQuestion._id] === "false" ? "choice-selected" : ""}`}
                          onClick={() => handleAnswerChange(currentQuestion._id, "false")}
                        >
                          <Radio value="false" className="choice-radio-new">
                            <span className="choice-label">B.</span> {t("guestExam.false")}
                          </Radio>
                        </div>
                      </Space>
                    </Radio.Group>
                  )}

                  {/* Short/Essay */}
                  {(currentQuestion.type === "short" || currentQuestion.type === "essay") && (
                    <Input.TextArea
                      value={answers[currentQuestion._id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      placeholder={t("guestExam.enterAnswer")}
                      rows={currentQuestion.type === "essay" ? 6 : 3}
                      className="answer-textarea"
                    />
                  )}
                </div>

                {/* Navigation */}
                <div className="question-navigation">
                  <Button onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
                    {t("guestExam.previous")}
                  </Button>
                  <Text>
                    {currentQuestionIndex + 1} / {exam.questions.length}
                  </Text>
                  <Button
                    type="primary"
                    onClick={goToNext}
                    disabled={currentQuestionIndex === exam.questions.length - 1}
                  >
                    {t("guestExam.next")}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Question List Sidebar - Placed AFTER content to appear on RIGHT */}
          <div className="question-list-sidebar">
            <div className="question-list-content">
              <div className="question-list-title">{t("takeExam.questionList")}</div>
              <div className="question-list-grid">
                {exam.questions.map((q, index) => {
                  const questionId = q._id;
                  const isAnswered = !!answers[questionId];
                  const isFlagged = flaggedQuestions.has(index);
                  const isCurrent = viewMode === "all" ? currentVisibleQuestion === index : currentQuestionIndex === index;

                  let btnClass = "question-list-btn question-unanswered-white";
                  if (isCurrent) btnClass = "question-list-btn question-current-blue";
                  else if (isFlagged) btnClass = "question-list-btn question-flagged-yellow";
                  else if (isAnswered) btnClass = "question-list-btn question-answered-green";

                  return (
                    <div key={questionId || index} className="question-list-item">
                      {isFlagged && <FlagOutlined className="question-flag-icon" />}
                      <Button className={btnClass} onClick={() => goToQuestion(index)}>
                        {index + 1}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="question-list-count">
                {t("takeExam.answered")}: {answeredCount}/{exam.questions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        <Modal
          title={t("guestExam.confirmSubmit")}
          open={showConfirmSubmit}
          onOk={() => handleSubmit(false)}
          onCancel={() => setShowConfirmSubmit(false)}
          confirmLoading={submitting}
          okText={t("guestExam.submitNow")}
          cancelText={t("common.cancel")}
        >
          <Alert message={t("guestExam.submitWarning")} type="warning" showIcon style={{ marginBottom: 16 }} />
          <div>
            <Text strong>{t("guestExam.answered")}: </Text>
            <Text>{answeredCount} / {exam.questions.length}</Text>
          </div>
          <div>
            <Text strong>{t("guestExam.unanswered")}: </Text>
            <Text type="warning">{exam.questions.length - answeredCount}</Text>
          </div>
          {flaggedQuestions.size > 0 && (
            <div>
              <Text strong>{t("guestExam.flagged")}: </Text>
              <Text type="warning">{flaggedQuestions.size}</Text>
            </div>
          )}
        </Modal>
      </div>
    </MathJaxContext>
  );
};

export default GuestTakeExam;
