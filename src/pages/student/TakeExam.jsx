import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  DownOutlined,
  FlagOutlined,
  MenuOutlined,
  SearchOutlined,
  WarningOutlined,
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
  Input,
  Modal,
  Radio,
  Space,
  Typography,
  Tooltip,
  Divider,
} from "antd";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { logProctorEvent } from "../../api/proctorService";
import {
  startSubmission,
  submitExam,
  updateSubmissionAnswers,
} from "../../api/submissionService";
import useAuthStore from "../../store/authStore";
import "./TakeExam.css";

const { Title, Text, Paragraph } = Typography;

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0); // seconds
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // idle, saving, saved, error
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [examPassword, setExamPassword] = useState("");
  const [shareCode, setShareCode] = useState(null);
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);
  const [currentVisibleQuestion, setCurrentVisibleQuestion] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [fontSize, setFontSize] = useState(100); // percentage: 80, 100, 120
  const [viewMode, setViewMode] = useState("all"); // 'all' or 'single'
  const [showQuestionList, setShowQuestionList] = useState(true);

  const autoSaveIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const initExamRef = useRef(false); // Prevent double initialization in StrictMode
  const passwordModalShownRef = useRef(false);
  const examStartedRef = useRef(false);
  const choiceOptionsRefs = useRef({});

  // Store refs for functions that will be defined later
  const handleTimeUpRef = useRef(null);
  const handleAutoSaveRef = useRef(null);

  // Zoom handlers
  const handleZoomIn = () => {
    setFontSize((prev) => Math.min(prev + 20, 140)); // max 140%
  };

  const handleZoomOut = () => {
    setFontSize((prev) => Math.max(prev - 20, 80)); // min 80%
  };

  // Toggle view mode (all questions vs single question)
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "all" ? "single" : "all"));
  };

  // Function to start exam with password (defined early so it can be used in useEffect)
  const startExamWithPassword = useCallback(
    async (passwordToUse) => {
      if (examStartedRef.current || submission) {
        return true;
      }

      try {
        examStartedRef.current = true;
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
          throw new Error("Invalid response format from server");
        }

        const submissionResult = result.submission;
        const examData = result.exam;

        if (!submissionResult || !examData) {
          console.error("Missing submission or exam in response:", result);
          throw new Error("Invalid response format from server");
        }

        setSubmission(submissionResult);
        setExam(examData);

        // Initialize answers
        const initialAnswers = {};
        if (submissionResult.answers) {
          submissionResult.answers.forEach((answer) => {
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

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Start timer
        if (remaining > 0) {
          timerIntervalRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
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

        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
          autoSaveIntervalRef.current = null;
        }

        // Start auto-save
        autoSaveIntervalRef.current = setInterval(() => {
          if (handleAutoSaveRef.current) {
            handleAutoSaveRef.current();
          }
        }, 5000);

        message.success(t("takeExam.examStarted"));

        const storedPassword = sessionStorage.getItem("examPassword");
        if (storedPassword) {
          sessionStorage.removeItem("examPassword");
        }

        return true;
      } catch (error) {
        examStartedRef.current = false;
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [examId]
  );

  // Proctoring: Track visibility and fullscreen
  useEffect(() => {
    if (!submission) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctorEvent(submission._id, "visibility", "medium", {
          visible: false,
          reason: "Tab switched or minimized",
        });
      } else {
        logProctorEvent(submission._id, "visibility", "low", { visible: true });
      }
    };

    const handleFullscreenChange = () => {
      logProctorEvent(
        submission._id,
        "fullscreen",
        document.fullscreenElement ? "low" : "medium",
        { fullscreen: !!document.fullscreenElement }
      );
    };

    const handleBeforeUnload = (e) => {
      logProctorEvent(submission._id, "beforeunload", "high", {
        reason: "Page unload attempt",
      });
      e.preventDefault();
      e.returnValue = "";
    };

    // Prevent copy/paste and right-click
    const handleCopy = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, "copy_paste", "high", { action: "copy" });
      message.warning("Copying is not allowed during the exam");
    };

    const handlePaste = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, "copy_paste", "high", {
        action: "paste",
      });
      message.warning("Pasting is not allowed during the exam");
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      logProctorEvent(submission._id, "right_click", "medium", {});
      message.warning("Right-click is disabled during the exam");
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("contextmenu", handleRightClick);

    // Disable keyboard shortcuts
    const handleKeyDown = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        logProctorEvent(submission._id, "tab_switch", "high", {
          action: "devtools",
        });
        message.warning("Developer tools are disabled during the exam");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("contextmenu", handleRightClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [submission]);

  // Initialize exam
  useEffect(() => {
    if (initExamRef.current || submission || exam) {
      return;
    }
    initExamRef.current = true;

    const initExam = async () => {
      try {
        setLoading(true);

        // Check if came from public link (shareCode)
        const storedShareCode = sessionStorage.getItem("shareCode");
        if (storedShareCode) {
          setShareCode(storedShareCode);
        }

        // Get password from sessionStorage if available (from public link)
        let storedPassword = sessionStorage.getItem("examPassword") || "";

        // Always check if exam requires password before calling API
        // If no password in storage, fetch exam info to check if password is required
        if (!storedPassword) {
          try {
            const examService = (await import("../../api/examService")).default;
            let examResponse;

            // If we have shareCode, use it to get exam info (public endpoint)
            if (storedShareCode) {
              examResponse = await examService.getExamByShareCode(
                storedShareCode
              );
            } else {
              // If no shareCode, try to get exam by ID (may require auth)
              // If this fails, we'll catch the error and let the API handle password check
              try {
                examResponse = await examService.getExamById(examId);
              } catch (authError) {
                // If getExamById requires auth and fails, we can't check password here
                // Proceed to API call, which will return password error if needed
                examResponse = null;
              }
            }

            // If exam requires password and we don't have it, show password modal
            // examPassword is a boolean flag from API (true if password required)
            if (examResponse?.data?.examPassword === true) {
              if (!passwordModalShownRef.current) {
                passwordModalShownRef.current = true;
                setShowPasswordModal(true);
              }
              setLoading(false);
              return; // Wait for user to enter password
            }
          } catch (error) {
            console.error("Error fetching exam info:", error);
            // If we can't fetch exam info, try to proceed anyway
            // The API will return error if password is required
          }
        }

        // Start exam with password
        // Password will be cleared inside startExamWithPassword after successful start
        await startExamWithPassword(storedPassword);
      } catch (error) {
        // Get error message from API like CreateClassModal pattern
        const errorMessage =
          typeof error === "string"
            ? error
            : error?.response?.data?.message ||
              error?.message ||
              t("takeExam.failedToStart");

        // If password error, show password modal
        if (
          errorMessage.includes("password") ||
          errorMessage.includes("Invalid exam password")
        ) {
          const storedShareCode = sessionStorage.getItem("shareCode");
          if (storedShareCode) {
            setShareCode(storedShareCode);
          }
          if (!passwordModalShownRef.current) {
            passwordModalShownRef.current = true;
            setShowPasswordModal(true);
          }
          setLoading(false);
          return; // Don't redirect, show password modal instead
        }

        // For other errors (max attempts, not available, etc.), show error page
        // No toast needed since we have error page
        navigate("/student/exam-error", {
          state: {
            errorMessage,
            errorType:
              errorMessage.includes("maximum") ||
              errorMessage.includes("attempts")
                ? "maxAttempts"
                : "error",
          },
          replace: true,
        });
      } finally {
        setLoading(false);
      }
    };

    initExam();

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      initExamRef.current = false;
    };
  }, [examId, navigate]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!submission || autoSaveStatus === "saving") return;

    try {
      setAutoSaveStatus("saving");
      const answersArray = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          value,
        })
      );

      await updateSubmissionAnswers(submission._id, answersArray);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch (error) {
      setAutoSaveStatus("error");
      console.error("Auto-save failed:", error);
    }
  }, [submission, answers, autoSaveStatus]);

  // Update refs when functions are defined
  useEffect(() => {
    handleAutoSaveRef.current = handleAutoSave;
  }, [handleAutoSave]);

  // Manual save
  const handleSave = async () => {
    await handleAutoSave();
    message.success(t("takeExam.saved"));
  };

  // Handle submit (defined before handleTimeUp)
  const handleSubmit = useCallback(async () => {
    if (!submission) return;

    try {
      setSubmitting(true);

      // Clear intervals ngay từ đầu để tránh tiếp tục auto-save
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Final save before submit
      const answersArray = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          value,
        })
      );
      await updateSubmissionAnswers(submission._id, answersArray);

      // Submit exam
      const response = await submitExam(submission._id);

      // Check if submission is late
      const submissionData = response.data?.data || response.data || response;
      if (submissionData?.status === "late") {
        message.warning(
          t("takeExam.submittedLate") ||
            "Your exam was submitted after the time limit. It has been marked as late."
        );
      } else {
        message.success(t("takeExam.submitSuccess"));
      }

      // Navigate to result detail page to view answers
      const submissionId =
        submissionData?._id ||
        response.data?._id ||
        response.data?.data?._id ||
        response._id;
      navigate(`/student/results/${submissionId}`, { replace: true });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        t("takeExam.submitFailed");

      // If time limit exceeded beyond grace period, show error page
      if (
        errorMessage.includes("Time limit exceeded") &&
        errorMessage.includes("no longer accepted")
      ) {
        navigate("/student/exam-error", {
          state: {
            errorMessage,
            errorType: "timeExceeded",
          },
          replace: true,
        });
      } else {
        message.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [submission, answers, navigate]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    message.warning(t("takeExam.timeUp"));
    await handleSubmit();
  }, [handleSubmit]);

  // Update ref when function is defined
  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
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

  // Format time (format: 00:39:05)
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Track visible question for sidebar highlighting (must be before early returns)
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

    return () => {
      observer.disconnect();
    };
  }, [exam?.questions?.length]);

  // Effect to equalize choice option widths (must be before early returns)
  useEffect(() => {
    const equalizeChoiceWidths = () => {
      if (!exam || !exam.questions) return;

      exam.questions.forEach((q) => {
        if (q.questionId?.type !== "mcq" || !q.questionId?.choices) return;

        const questionId = q.questionId._id || q.questionId;
        const choiceRefs = choiceOptionsRefs.current[questionId];
        if (!choiceRefs || choiceRefs.length === 0) return;

        // First, reset all widths to auto to get natural width
        choiceRefs.forEach((ref) => {
          if (ref) {
            ref.style.width = "auto";
          }
        });

        // Wait for layout to update, then calculate max width
        requestAnimationFrame(() => {
          let maxWidth = 0;
          choiceRefs.forEach((ref) => {
            if (ref) {
              const width = ref.getBoundingClientRect().width;
              maxWidth = Math.max(maxWidth, width);
            }
          });

          // Set all to max width
          if (maxWidth > 0) {
            choiceRefs.forEach((ref) => {
              if (ref) {
                ref.style.width = `${maxWidth}px`;
              }
            });
          }
        });
      });
    };

    // Run after delays to ensure DOM and MathJax are rendered
    const timer1 = setTimeout(equalizeChoiceWidths, 100);
    const timer2 = setTimeout(equalizeChoiceWidths, 500);
    const timer3 = setTimeout(equalizeChoiceWidths, 1000);

    // Also run when window resizes
    window.addEventListener("resize", equalizeChoiceWidths);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", equalizeChoiceWidths);
    };
  }, [exam, answers]);

  if (loading && !showPasswordModal) {
    return <div className="take-exam-loading">{t("takeExam.loading")}</div>;
  }

  if (showPasswordModal) {
    return (
      <div className="take-exam-loading">
        <Modal
          title={t("takeExam.enterPassword")}
          open={showPasswordModal}
          onOk={async () => {
            if (!examPassword) {
              message.error(t("takeExam.pleaseEnterPassword"));
              return;
            }

            try {
              setShowPasswordModal(false);
              await startExamWithPassword(examPassword);
              // Clear password from storage
              sessionStorage.removeItem("examPassword");

              passwordModalShownRef.current = false;
            } catch (error) {
              const errorMessage =
                error.response?.data?.message || t("takeExam.failedToStart");
              if (errorMessage.includes("password")) {
                passwordModalShownRef.current = false;
                setShowPasswordModal(true);
                setExamPassword("");
              } else {
                if (shareCode) {
                  navigate(`/exam/${shareCode}`, { replace: true });
                } else {
                  navigate("/student/dashboard");
                }
              }
            }
          }}
          onCancel={() => {
            if (shareCode) {
              navigate(`/exam/${shareCode}`, { replace: true });
            } else {
              navigate("/student/dashboard");
            }
          }}
          okText={t("takeExam.startExam")}
          cancelText={t("common.cancel")}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <p>{t("takeExam.passwordRequired")}</p>
            <Input.Password
              placeholder={t("takeExam.passwordPlaceholder")}
              value={examPassword}
              onChange={(e) => setExamPassword(e.target.value)}
              onPressEnter={() => {
                if (examPassword) {
                  // Trigger OK button
                  setTimeout(() => {
                    const okButton = document.querySelector(
                      ".ant-modal-footer .ant-btn-primary"
                    );
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
    return <div>{t("takeExam.examNotFound")}</div>;
  }

  const questionOrder = submission.questionOrder || [];
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key] !== undefined && answers[key] !== ""
  ).length;
  const candidateName = user?.name || t("takeExam.candidate");

  // Scroll to question
  const scrollToQuestion = (index) => {
    const questionCards = document.querySelectorAll(".question-item-card");
    if (questionCards[index]) {
      questionCards[index].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setCurrentVisibleQuestion(index);
    }
  };

  // Toggle flag for question
  const toggleFlag = (index, e) => {
    e.stopPropagation(); // Prevent triggering scrollToQuestion
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

  const mathJaxConfig = {
    tex: {
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"],
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"],
      ],
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
    },
  };

  const renderMathContent = (content) => {
    if (!content) return "";

    // Split by lines and process each line separately
    const lines = content.split("\n");
    return (
      <>
        {lines.map((line, index) => {
          // Skip empty lines but preserve them
          if (!line.trim()) {
            return <br key={index} />;
          }

          // Check if line contains LaTeX commands
          const hasLatex =
            line.includes("\\") || line.includes("^") || line.includes("_");
          const hasDollarSigns = line.includes("$") || line.includes("\\(");

          if (hasLatex && !hasDollarSigns) {
            // Mixed content - need to parse and render properly
            // Split by LaTeX patterns and render each part
            const parts = line.split(
              /(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*)/g
            );
            return (
              <span
                key={index}
                style={{
                  fontFamily: "inherit",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  display: "inline",
                }}
              >
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
              </span>
            );
          } else if (hasDollarSigns) {
            // Already has dollar signs, render as is
            return (
              <span
                key={index}
                style={{
                  fontFamily: "inherit",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  display: "inline",
                }}
              >
                <MathJax inline>{line}</MathJax>
              </span>
            );
          } else {
            // Plain text, render as is with preserved formatting
            return (
              <span
                key={index}
                style={{
                  fontFamily: "inherit",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  display: "inline",
                }}
              >
                {line}
              </span>
            );
          }
        })}
      </>
    );
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div
        className="take-exam-container"
        style={{ "--exam-font-scale": fontSize / 100 }}
      >
        {/* Header */}
        <div className="take-exam-header-new">
          <div className="header-left">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="back-button"
            >
              {t("takeExam.goBack")}
            </Button>
          </div>

          <div className="header-center">
            <div className="candidate-info">
              <Avatar
                size={36}
                src={user?.avatar}
                icon={!user?.avatar && <UserOutlined />}
                className="candidate-avatar"
              />
              <div className="candidate-details">
                <span className="candidate-name">{candidateName}</span>
                <span className="candidate-label">
                  {t("takeExam.candidateLabel")}
                </span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <Space size={8} className="header-controls">
              {/* Timer */}
              <div
                className={`timer-box ${
                  timeRemaining < 300 ? "time-warning" : ""
                }`}
              >
                <ClockCircleOutlined className="timer-icon" />
                <span className="timer-text">{formatTime(timeRemaining)}</span>
              </div>

              <Divider type="vertical" className="header-divider" />

              {/* Zoom controls */}
              <div className="zoom-controls">
                <Tooltip title={t("takeExam.zoomOut")}>
                  <Button
                    type="text"
                    icon={<ZoomOutOutlined />}
                    onClick={handleZoomOut}
                    disabled={fontSize <= 80}
                    className="header-icon-btn"
                  />
                </Tooltip>
                <span className="zoom-level">{fontSize}%</span>
                <Tooltip title={t("takeExam.zoomIn")}>
                  <Button
                    type="text"
                    icon={<ZoomInOutlined />}
                    onClick={handleZoomIn}
                    disabled={fontSize >= 140}
                    className="header-icon-btn"
                  />
                </Tooltip>
              </div>

              <Divider type="vertical" className="header-divider" />

              {/* View mode toggle */}
              <Tooltip
                title={
                  viewMode === "all"
                    ? t("takeExam.singleView")
                    : t("takeExam.allView")
                }
              >
                <Button
                  type="text"
                  icon={
                    viewMode === "all" ? (
                      <UnorderedListOutlined />
                    ) : (
                      <AppstoreOutlined />
                    )
                  }
                  onClick={toggleViewMode}
                  className="header-icon-btn view-mode-btn"
                />
              </Tooltip>

              <Button
                type="primary"
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
                loading={submitting}
                className="submit-button"
              >
                {t("takeExam.submit")}
              </Button>
            </Space>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="take-exam-wrapper">
          {/* Main Content - All Questions List */}
          <div className="take-exam-content-new">
            {viewMode === "all"
              ? // Hiển thị tất cả câu hỏi
                exam.questions.map((q, index) => {
                  const questionId = q.questionId._id || q.questionId;
                  const question = q.questionId;
                  const isAnswered =
                    answers[questionId] !== undefined &&
                    answers[questionId] !== "";

                  return (
                    <Card key={index} className="question-item-card">
                      <div className="question-item-header">
                        <Text strong className="question-number">
                          {t("takeExam.questionNumber")} {index + 1}
                        </Text>
                        <Button
                          type="text"
                          icon={<FlagOutlined />}
                          onClick={(e) => toggleFlag(index, e)}
                          className={`flag-button ${
                            flaggedQuestions.has(index) ? "flagged" : ""
                          }`}
                          title={
                            flaggedQuestions.has(index)
                              ? t("takeExam.unflagQuestion")
                              : t("takeExam.flagQuestion")
                          }
                        />
                      </div>

                      <div className="question-item-content">
                        <Paragraph
                          className="question-text"
                          style={{
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "pre-wrap",
                            fontFamily: "inherit",
                          }}
                        >
                          {renderMathContent(question.text || question.name)}
                        </Paragraph>

                        {/* Render question images */}
                        {question.images && question.images.length > 0 ? (
                          <div
                            style={{
                              marginBottom: "16px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              justifyContent: "center",
                            }}
                          >
                            {question.images.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt={`Question Illustration ${idx + 1}`}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "400px",
                                  objectFit: "contain",
                                  borderRadius: "8px",
                                  border: "1px solid #f0f0f0",
                                }}
                              />
                            ))}
                          </div>
                        ) : question.image ? (
                          <div
                            style={{
                              marginBottom: "16px",
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={question.image}
                              alt="Question Illustration"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "400px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #f0f0f0",
                              }}
                            />
                          </div>
                        ) : null}

                        {/* Render question based on type */}
                        {question.type === "mcq" && (
                          <Radio.Group
                            value={answers[questionId]}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            className="question-options"
                          >
                            <Space
                              direction="vertical"
                              size="middle"
                              style={{ width: "100%" }}
                            >
                              {question.choices?.map((choice, idx) => {
                                const isSelected =
                                  answers[questionId] === choice.key;
                                const choiceRefKey = `${questionId}-${idx}`;

                                // Initialize refs array for this question if not exists
                                if (!choiceOptionsRefs.current[questionId]) {
                                  choiceOptionsRefs.current[questionId] = [];
                                }

                                return (
                                  <div
                                    key={idx}
                                    ref={(el) => {
                                      if (el) {
                                        choiceOptionsRefs.current[questionId][
                                          idx
                                        ] = el;
                                      }
                                    }}
                                    className={`choice-option ${
                                      isSelected ? "choice-selected" : ""
                                    }`}
                                  >
                                    <Radio
                                      value={choice.key}
                                      className="choice-radio-new"
                                    >
                                      <span
                                        className="choice-label"
                                        style={{
                                          display: "inline",
                                          marginRight: "4px",
                                        }}
                                      >
                                        {String.fromCharCode(65 + idx)}:
                                      </span>
                                      <span
                                        style={{
                                          display: "inline",
                                          wordWrap: "break-word",
                                          overflowWrap: "break-word",
                                          whiteSpace: "pre-wrap",
                                          fontFamily: "inherit",
                                        }}
                                      >
                                        {renderMathContent(choice.text)}
                                      </span>
                                      {/* Render choice image if exists */}
                                      {choice.image && (
                                        <div
                                          style={{
                                            marginTop: "8px",
                                            marginLeft: "24px",
                                          }}
                                        >
                                          <img
                                            src={choice.image}
                                            alt={`Choice ${String.fromCharCode(
                                              65 + idx
                                            )}`}
                                            style={{
                                              maxWidth: "100%",
                                              maxHeight: "150px",
                                              objectFit: "contain",
                                              borderRadius: "4px",
                                              border: "1px solid #f0f0f0",
                                            }}
                                          />
                                        </div>
                                      )}
                                    </Radio>
                                  </div>
                                );
                              })}
                            </Space>
                          </Radio.Group>
                        )}

                        {question.type === "tf" && (
                          <Radio.Group
                            value={answers[questionId]}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            className="question-options"
                          >
                            <Space direction="vertical" size="middle">
                              <div
                                className={`choice-option ${
                                  answers[questionId] === "true"
                                    ? "choice-selected"
                                    : ""
                                }`}
                              >
                                <Radio
                                  value="true"
                                  className="choice-radio-new"
                                >
                                  <span className="choice-label">A:</span>
                                  {t("takeExam.true")}
                                </Radio>
                              </div>
                              <div
                                className={`choice-option ${
                                  answers[questionId] === "false"
                                    ? "choice-selected"
                                    : ""
                                }`}
                              >
                                <Radio
                                  value="false"
                                  className="choice-radio-new"
                                >
                                  <span className="choice-label">B:</span>
                                  {t("takeExam.false")}
                                </Radio>
                              </div>
                            </Space>
                          </Radio.Group>
                        )}

                        {(question.type === "short" ||
                          question.type === "essay") && (
                          <Input.TextArea
                            rows={question.type === "essay" ? 8 : 4}
                            value={answers[questionId] || ""}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            placeholder={t("takeExam.enterYourAnswer")}
                            className="answer-textarea"
                          />
                        )}

                        {(question.type === "mcq" || question.type === "tf") &&
                          !isAnswered && (
                            <div className="question-placeholder">
                              <Text type="secondary">
                                {t("takeExam.selectCorrectAnswer")}
                              </Text>
                            </div>
                          )}
                      </div>
                    </Card>
                  );
                })
              : // Hiển thị từng câu hỏi một (single view)
                (() => {
                  const q = exam.questions[currentQuestionIndex];
                  const questionId = q.questionId._id || q.questionId;
                  const question = q.questionId;
                  const isAnswered =
                    answers[questionId] !== undefined &&
                    answers[questionId] !== "";

                  return (
                    <Card className="question-item-card">
                      <div className="question-item-header">
                        <Text strong className="question-number">
                          {t("takeExam.questionNumber")}{" "}
                          {currentQuestionIndex + 1}
                        </Text>
                        <Button
                          type="text"
                          icon={<FlagOutlined />}
                          onClick={(e) => toggleFlag(currentQuestionIndex, e)}
                          className={`flag-button ${
                            flaggedQuestions.has(currentQuestionIndex)
                              ? "flagged"
                              : ""
                          }`}
                          title={
                            flaggedQuestions.has(currentQuestionIndex)
                              ? t("takeExam.unflagQuestion")
                              : t("takeExam.flagQuestion")
                          }
                        />
                      </div>

                      <div className="question-item-content">
                        <Paragraph
                          className="question-text"
                          style={{
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "pre-wrap",
                            fontFamily: "inherit",
                          }}
                        >
                          {renderMathContent(question.text || question.name)}
                        </Paragraph>

                        {/* Render question images */}
                        {question.images && question.images.length > 0 ? (
                          <div
                            style={{
                              marginBottom: "16px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              justifyContent: "center",
                            }}
                          >
                            {question.images.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt={`Question Illustration ${idx + 1}`}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "400px",
                                  objectFit: "contain",
                                  borderRadius: "8px",
                                  border: "1px solid #f0f0f0",
                                }}
                              />
                            ))}
                          </div>
                        ) : question.image ? (
                          <div
                            style={{
                              marginBottom: "16px",
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={question.image}
                              alt="Question Illustration"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "400px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #f0f0f0",
                              }}
                            />
                          </div>
                        ) : null}

                        {/* Render question based on type */}
                        {question.type === "mcq" && (
                          <Radio.Group
                            value={answers[questionId]}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            className="question-options"
                          >
                            <Space
                              direction="vertical"
                              size="middle"
                              style={{ width: "100%" }}
                            >
                              {question.choices?.map((choice, idx) => {
                                const isSelected =
                                  answers[questionId] === choice.key;

                                return (
                                  <div
                                    key={idx}
                                    className={`choice-option ${
                                      isSelected ? "choice-selected" : ""
                                    }`}
                                  >
                                    <Radio
                                      value={choice.key}
                                      className="choice-radio-new"
                                    >
                                      <span
                                        className="choice-label"
                                        style={{
                                          display: "inline",
                                          marginRight: "4px",
                                        }}
                                      >
                                        {String.fromCharCode(65 + idx)}:
                                      </span>
                                      <span
                                        style={{
                                          display: "inline",
                                          wordWrap: "break-word",
                                          overflowWrap: "break-word",
                                          whiteSpace: "pre-wrap",
                                          fontFamily: "inherit",
                                        }}
                                      >
                                        {renderMathContent(choice.text)}
                                      </span>
                                      {/* Render choice image if exists */}
                                      {choice.image && (
                                        <div
                                          style={{
                                            marginTop: "8px",
                                            marginLeft: "24px",
                                          }}
                                        >
                                          <img
                                            src={choice.image}
                                            alt={`Choice ${String.fromCharCode(
                                              65 + idx
                                            )}`}
                                            style={{
                                              maxWidth: "100%",
                                              maxHeight: "150px",
                                              objectFit: "contain",
                                              borderRadius: "4px",
                                              border: "1px solid #f0f0f0",
                                            }}
                                          />
                                        </div>
                                      )}
                                    </Radio>
                                  </div>
                                );
                              })}
                            </Space>
                          </Radio.Group>
                        )}

                        {question.type === "tf" && (
                          <Radio.Group
                            value={answers[questionId]}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            className="question-options"
                          >
                            <Space direction="vertical" size="middle">
                              <div
                                className={`choice-option ${
                                  answers[questionId] === "true"
                                    ? "choice-selected"
                                    : ""
                                }`}
                              >
                                <Radio
                                  value="true"
                                  className="choice-radio-new"
                                >
                                  <span className="choice-label">A:</span>
                                  {t("takeExam.true")}
                                </Radio>
                              </div>
                              <div
                                className={`choice-option ${
                                  answers[questionId] === "false"
                                    ? "choice-selected"
                                    : ""
                                }`}
                              >
                                <Radio
                                  value="false"
                                  className="choice-radio-new"
                                >
                                  <span className="choice-label">B:</span>
                                  {t("takeExam.false")}
                                </Radio>
                              </div>
                            </Space>
                          </Radio.Group>
                        )}

                        {(question.type === "short" ||
                          question.type === "essay") && (
                          <Input.TextArea
                            rows={question.type === "essay" ? 8 : 4}
                            value={answers[questionId] || ""}
                            onChange={(e) =>
                              handleAnswerChange(questionId, e.target.value)
                            }
                            placeholder={t("takeExam.enterYourAnswer")}
                            className="answer-textarea"
                          />
                        )}

                        {(question.type === "mcq" || question.type === "tf") &&
                          !isAnswered && (
                            <div className="question-placeholder">
                              <Text type="secondary">
                                {t("takeExam.selectCorrectAnswer")}
                              </Text>
                            </div>
                          )}
                      </div>

                      {/* Navigation buttons for single view */}
                      <div className="question-navigation">
                        <Button
                          onClick={goToPrevious}
                          disabled={currentQuestionIndex === 0}
                        >
                          {t("takeExam.previous")}
                        </Button>
                        <Button
                          type="primary"
                          onClick={goToNext}
                          disabled={
                            currentQuestionIndex === exam.questions.length - 1
                          }
                        >
                          {t("takeExam.next")}
                        </Button>
                      </div>
                    </Card>
                  );
                })()}
          </div>

          {/* Question List Sidebar */}
          <div className="question-list-sidebar">
            <div className="question-list-content">
              <div className="question-list-title">
                {t("takeExam.questionList")}
              </div>
              <div className="question-list-grid">
                {exam.questions.map((q, index) => {
                  const questionId = q.questionId._id || q.questionId;
                  const isAnswered =
                    answers[questionId] !== undefined &&
                    answers[questionId] !== "";
                  const isCurrent =
                    viewMode === "single"
                      ? index === currentQuestionIndex
                      : index === currentVisibleQuestion;
                  const isFlagged = flaggedQuestions.has(index);

                  let buttonClass = "question-list-btn";
                  if (isFlagged) {
                    // Câu được gắn cờ - màu vàng
                    buttonClass += " question-flagged-yellow";
                  } else if (isCurrent) {
                    // Câu đang làm - màu xanh da trời
                    buttonClass += " question-current-blue";
                  } else if (isAnswered) {
                    // Câu đã làm - màu xanh lá
                    buttonClass += " question-answered-green";
                  } else {
                    // Câu chưa làm - màu trắng
                    buttonClass += " question-unanswered-white";
                  }

                  return (
                    <div key={index} className="question-list-item">
                      <Button
                        className={buttonClass}
                        onClick={() => {
                          if (viewMode === "single") {
                            setCurrentQuestionIndex(index);
                          } else {
                            scrollToQuestion(index);
                          }
                        }}
                        shape="round"
                      >
                        {(index + 1).toString().padStart(2, "0")}
                      </Button>
                      {isFlagged && (
                        <FlagOutlined className="question-flag-icon" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="question-list-count">
              {answeredCount}/{totalQuestions} {t("takeExam.answered")}
            </div>
          </div>
        </div>

        {/* Time Warning */}
        {timeRemaining < 300 && timeRemaining > 0 && (
          <Alert
            message={t("takeExam.timeWarning")}
            description={`${t("takeExam.onlyTimeRemaining")} ${formatTime(
              timeRemaining
            )} ${t("takeExam.timeRemaining")}!`}
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            closable
            className="time-warning-alert"
          />
        )}

        {/* Confirm Submit Modal */}
        <Modal
          title={t("takeExam.confirmSubmit")}
          open={showConfirmSubmit}
          onOk={handleSubmit}
          onCancel={() => setShowConfirmSubmit(false)}
          confirmLoading={submitting}
          okText={t("common.yes") + ", " + t("takeExam.submit")}
          cancelText={t("common.cancel")}
        >
          <p>{t("takeExam.confirmSubmitMessage")}</p>
          <p>
            {t("takeExam.answeredQuestions")} {answeredCount}{" "}
            {t("takeExam.outOf")} {totalQuestions} {t("takeExam.questions")}.
          </p>
          <p>
            <strong>{t("takeExam.cannotUndo")}</strong>
          </p>
        </Modal>
      </div>
    </MathJaxContext>
  );
};

export default TakeExam;
