import { Column } from "@ant-design/charts";
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  QrcodeOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import examService from "../../api/examService";
import examStatsService from "../../api/examStatsService.js";
import { ROUTES } from "../../constants/config";
import PreviewExamModal from "../../components/teacher/PreviewExamModal";
import QRCodeModal from "../../components/common/QRCodeModal";

const { Title, Text } = Typography;

const ExamDetailNew = () => {
  const { message } = App.useApp();
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Add CSS for late submission highlight
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .late-submission-row {
        background-color: #ffe58f !important;
      }
      .late-submission-row:hover {
        background-color: #ffd666 !important;
      }
      body.dark-mode .late-submission-row {
        background-color: rgba(250, 173, 20, 0.3) !important;
      }
      body.dark-mode .late-submission-row:hover {
        background-color: rgba(250, 173, 20, 0.4) !important;
      }
      .late-submission-row td [data-column="submittedAt"] {
        color: #ff4d4f !important;
        font-weight: 600 !important;
      }
      body.dark-mode .late-submission-row td [data-column="submittedAt"] {
        color: #ff7875 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [examData, setExamData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scoreDistribution, setScoreDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [statsLoading, setStatsLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [scoreDistributionLoading, setScoreDistributionLoading] =
    useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [showAllAttempts, setShowAllAttempts] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchName, setSearchName] = useState("");
  // Pagination states
  const [submissionsPagination, setSubmissionsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [leaderboardPagination, setLeaderboardPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchExamDetail();
  }, [examId]);

  const fetchExamDetail = async () => {
    setLoading(true);
    try {
      const response = await examService.getExamById(examId);
      setExamData(response.data || response);
    } catch (error) {
      console.error("Error fetching exam:", error);
      message.error(t("exams.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const response = await examStatsService.getExamStatistics(examId);
      setStatistics(response.data || response);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      message.error(t("exams.stats.fetchFailed"));
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchLeaderboard = async (page = 1, limit = 20) => {
    setLeaderboardLoading(true);
    try {
      const response = await examStatsService.getExamLeaderboard(examId, { page, limit });
      setLeaderboard(response.data || response || []);
      if (response.pagination) {
        setLeaderboardPagination({
          current: response.pagination.page,
          pageSize: response.pagination.limit,
          total: response.pagination.total,
        });
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      message.error(t("exams.leaderboard.fetchFailed"));
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchSubmissions = async (page = 1, limit = 20, filters = {}) => {
    setSubmissionsLoading(true);
    try {
      const params = {
        all: showAllAttempts ? "true" : "false",
        page,
        limit,
        ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
      };
      const response = await examStatsService.getStudentSubmissions(examId, params);
      const data = response.data || response || [];
      setSubmissions(data);
      if (response.pagination) {
        setSubmissionsPagination({
          current: response.pagination.page,
          pageSize: response.pagination.limit,
          total: response.pagination.total,
        });
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      message.error(t("exams.submissions.fetchFailed"));
    } finally {
      setSubmissionsLoading(false);
    }
  };


  const fetchScoreDistribution = async () => {
    setScoreDistributionLoading(true);
    try {
      const response = await examStatsService.getScoreDistribution(examId);
      setScoreDistribution(response.data || response || []);
    } catch (error) {
      console.error("Error fetching score distribution:", error);
      message.error(t("exams.stats.fetchFailed"));
    } finally {
      setScoreDistributionLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "statistics") {
      if (!statistics) {
        fetchStatistics();
      }
      if (scoreDistribution.length === 0) {
        fetchScoreDistribution();
      }
    } else if (key === "leaderboard") {
      fetchLeaderboard(leaderboardPagination.current, leaderboardPagination.pageSize);
    } else if (key === "students") {
      fetchSubmissions(
        submissionsPagination.current,
        submissionsPagination.pageSize,
        { status: statusFilter, search: searchName }
      );
    }
  };

  const handleDelete = async () => {
    try {
      await examService.deleteExam(examId);
      message.success(t("exams.deleteSuccess"));
      navigate(ROUTES.TEACHER_EXAMS);
    } catch (error) {
      console.error("Error deleting exam:", error);
      message.error(t("exams.deleteFailed"));
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

  // Get subject name based on current language
  const getSubjectName = (subject) => {
    if (!subject) return "-";
    if (typeof subject === "string") return subject;
    if (typeof subject === "object" && subject._id) {
      // It's a populated subject object
      const currentLang =
        i18n.language || localStorage.getItem("language") || "vi";
      switch (currentLang) {
        case "en":
          return subject.name_en || subject.name || "-";
        case "jp":
        case "ja":
          return subject.name_jp || subject.name || "-";
        case "vi":
        default:
          return subject.name || "-";
      }
    }
    return "-";
  };

  const leaderboardColumns = [
    {
      title: t("exams.leaderboard.rank"),
      dataIndex: "rank",
      key: "rank",
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
        const colors = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
        return (
          <Tag
            color={colors[rank] || "default"}
            style={{ fontSize: "16px", fontWeight: "bold" }}
          >
            #{rank}
          </Tag>
        );
      },
    },
    {
      title: t("exams.leaderboard.student"),
      key: "student",
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.student?.avatar}
            icon={!record.student?.avatar && <TeamOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.student?.name || record.student?.email}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.student?.studentCode}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t("exams.leaderboard.score"),
      dataIndex: "score",
      key: "score",
      width: 120,
      render: (score, record) => {
        const formattedScore =
          typeof score === "number" ? Number(score.toFixed(1)) : score || 0;
        return (
          <div>
            <Text strong style={{ fontSize: 16, color: "#1890ff" }}>
              {formattedScore}/{record.totalMarks}
            </Text>
            <Progress
              percent={Math.round((score / record.totalMarks) * 100)}
              size="small"
              showInfo={false}
            />
          </div>
        );
      },
    },
    {
      title: t("exams.leaderboard.timeSpent"),
      dataIndex: "timeSpent",
      key: "timeSpent",
      width: 120,
      render: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      },
    },
    {
      title: t("exams.leaderboard.submittedAt"),
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 170,
      render: (date) => (date ? new Date(date).toLocaleString("vi-VN") : "-"),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() =>
            navigate(
              `/teacher/exams/${examId}/submissions/detail/${record._id}`
            )
          }
        >
          {t("exams.viewDetail")}
        </Button>
      ),
    },
  ];

  // Refetch submissions when filters change (with debounce for search)
  useEffect(() => {
    if (activeTab === "students") {
      const timeoutId = setTimeout(() => {
        setSubmissionsPagination((prev) => ({ ...prev, current: 1 }));
        fetchSubmissions(1, submissionsPagination.pageSize, {
          status: statusFilter,
          search: searchName,
        });
      }, searchName ? 500 : 0); // Debounce search by 500ms

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllAttempts, statusFilter, searchName]);

  // Handle pagination changes for submissions
  const handleSubmissionsPaginationChange = (page, pageSize) => {
    setSubmissionsPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize,
    }));
    fetchSubmissions(page, pageSize, {
      status: statusFilter,
      search: searchName,
    });
  };

  // Handle pagination changes for leaderboard
  const handleLeaderboardPaginationChange = (page, pageSize) => {
    setLeaderboardPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize,
    }));
    fetchLeaderboard(page, pageSize);
  };

  const handleShowAllAttemptsToggle = () => {
    setShowAllAttempts(!showAllAttempts);
  };

  const submissionsColumns = [
    {
      title: t("exams.submissions.student"),
      key: "student",
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.student?.avatar}
            icon={!record.student?.avatar && <TeamOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.student?.name || record.student?.email}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.student?.studentCode}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t("exams.submissions.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const statusConfig = {
          in_progress: {
            color: "blue",
            text: t("exams.submissions.inProgress"),
          },
          submitted: { color: "green", text: t("exams.submissions.submitted") },
          graded: { color: "green", text: t("exams.submissions.graded") },
          late: { color: "orange", text: t("exams.submissions.late") },
        };
        const config = statusConfig[status] || {
          color: "default",
          text: status,
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t("exams.submissions.score"),
      dataIndex: "score",
      key: "score",
      width: 150,
      render: (score, record) => {
        // Show score for submitted, graded, and late submissions
        if (
          record.status !== "submitted" &&
          record.status !== "graded" &&
          record.status !== "late"
        )
          return "-";
        const formattedScore =
          typeof score === "number" ? Number(score.toFixed(1)) : score || 0;
        return (
          <div>
            <Text strong style={{ fontSize: 14 }}>
              {formattedScore}/{record.totalMarks}
            </Text>
            <Progress
              percent={Math.round(((score || 0) / record.totalMarks) * 100)}
              size="small"
              showInfo={false}
              status={
                score >= record.totalMarks * 0.8
                  ? "success"
                  : score >= record.totalMarks * 0.5
                  ? "normal"
                  : "exception"
              }
            />
          </div>
        );
      },
    },
    {
      title: t("exams.submissions.timeSpent"),
      dataIndex: "timeSpent",
      key: "timeSpent",
      width: 120,
      render: (minutes) => {
        if (!minutes) return "-";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      },
    },
    {
      title: t("exams.submissions.startedAt"),
      dataIndex: "startedAt",
      key: "startedAt",
      width: 170,
      render: (date) => (date ? new Date(date).toLocaleString("vi-VN") : "-"),
    },
    {
      title: t("exams.submissions.submittedAt"),
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 170,
      render: (date) => (
        <span data-column="submittedAt">
          {date ? new Date(date).toLocaleString("vi-VN") : "-"}
        </span>
      ),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() =>
            navigate(
              `/teacher/exams/${examId}/submissions/detail/${record._id}`
            )
          }
          disabled={record.status === "in_progress"}
        >
          {t("exams.viewDetail")}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!examData) {
    return (
      <Empty
        description={t("exams.examNotFound")}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => navigate(ROUTES.TEACHER_EXAMS)}>
          {t("common.back")}
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(ROUTES.TEACHER_EXAMS)}
          >
            {t("common.back")}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {examData.name}
          </Title>
          {/* <Tag color={getStatusColor(examData.status)}>
            {getStatusText(examData.status)}
          </Tag> */}
        </Space>

        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewModalVisible(true)}
          >
            {t("exams.preview") || "Preview"}
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
          >
            {t("exams.edit")}
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            {t("exams.delete")}
          </Button>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        size="large"
        items={[
          {
            key: "overview",
            label: (
              <span>
                <img src="/overview.png" alt="Overview" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
                {t("exams.tabs.overview")}
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card>
                    <Title level={4} style={{ marginBottom: 16 }}>
                      {t("exams.basicInfo")}
                    </Title>
                    <Table
                      dataSource={[
                        {
                          key: "description",
                          label: t("exams.description"),
                          value: examData.description || "-",
                        },
                        {
                          key: "purpose",
                          label: t("exams.examPurpose"),
                          value: examData.examPurpose,
                          isTag: true,
                        },
                        {
                          key: "subject",
                          label: t("exams.subject") || "Subject",
                          value: examData.subjectId,
                          isSubject: true,
                        },
                        {
                          key: "duration",
                          label: t("exams.duration"),
                          value: `${examData.duration} ${t("exams.minutes")}`,
                        },
                        {
                          key: "totalMarks",
                          label: t("exams.totalMarks"),
                          value: examData.totalMarks,
                        },
                        {
                          key: "maxAttempts",
                          label: t("exams.maxAttempts"),
                          value: examData.maxAttempts,
                        },
                        {
                          key: "startTime",
                          label: t("exams.startTime"),
                          value: examData.startTime
                            ? new Date(examData.startTime).toLocaleString(
                                "vi-VN"
                              )
                            : "-",
                        },
                        {
                          key: "endTime",
                          label: t("exams.endTime"),
                          value: examData.endTime
                            ? new Date(examData.endTime).toLocaleString("vi-VN")
                            : "-",
                        },
                        {
                          key: "shareLink",
                          label: t("exams.shareLink"),
                          value: examData.shareCode,
                          isShareLink: true,
                        },
                      ]}
                      rowKey="key"
                      pagination={false}
                      showHeader={false}
                      columns={[
                        {
                          key: "label",
                          width: 150,
                          render: (_, record) => (
                            <Text strong>{record.label}:</Text>
                          ),
                        },
                        {
                          key: "value",
                          render: (_, record) => {
                            if (record.isShareLink) {
                              return record.value ? (
                                <Space>
                                  <Tooltip
                                    title={
                                      t("exams.clickToCopy") ||
                                      "Click to copy link"
                                    }
                                  >
                                    <Tag
                                      color="blue"
                                      icon={<LinkOutlined />}
                                      style={{ cursor: "pointer" }}
                                      onClick={() => {
                                        const shareLink = `${window.location.origin}/exam/${record.value}`;
                                        navigator.clipboard.writeText(shareLink);
                                        message.success(
                                          t("exams.linkCopied") || "Link copied!"
                                        );
                                      }}
                                    >
                                      {record.value}
                                    </Tag>
                                  </Tooltip>
                                  <Tooltip title={t('exams.showQRCode') || 'Show QR Code'}>
                                    <Button
                                      type="text"
                                      icon={<QrcodeOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                                      onClick={() => setQrCodeModalVisible(true)}
                                      size="small"
                                    />
                                  </Tooltip>
                                </Space>
                              ) : (
                                <Tag color="default">-</Tag>
                              );
                            }
                            if (record.isSubject) {
                              const subjectName = getSubjectName(record.value);
                              return subjectName !== "-" ? (
                                <Tag color="cyan">{subjectName}</Tag>
                              ) : (
                                <span>-</span>
                              );
                            }
                            if (record.isTag) {
                              return <Tag>{record.value}</Tag>;
                            }
                            return record.value;
                          },
                        },
                      ]}
                      scroll={{ x: true }}
                    />

                    {examData.questions && examData.questions.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <Title level={4}>{t("exams.questions")}</Title>
                        <Table
                          dataSource={examData.questions}
                          rowKey={(record) => {
                            const questionId =
                              record.questionId?._id || record.questionId;
                            const order = record.order;
                            return questionId
                              ? `${questionId}-${order || ""}`
                              : `question-${record._id || Math.random()}`;
                          }}
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: t("exams.order"),
                              dataIndex: "order",
                              key: "order",
                              width: 80,
                            },
                            {
                              title: t("questions.name"),
                              key: "name",
                              render: (_, record) =>
                                record.questionId?.name || "-",
                            },
                            {
                              title: t("questions.type"),
                              key: "type",
                              width: 120,
                              render: (_, record) => (
                                <Tag>{record.questionId?.type}</Tag>
                              ),
                            },
                            {
                              title: t("exams.marks"),
                              dataIndex: "marks",
                              key: "marks",
                              width: 80,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size="large"
                  >
                    <Card>
                      <Statistic
                        title={t("exams.stats.totalQuestions")}
                        value={examData.questions?.length || 0}
                        prefix={<img src="/question.png" alt="Questions" style={{ width: 20, height: 20 }} />}
                      />
                    </Card>
                    <Card>
                      <Statistic
                        title={t("exams.stats.totalSubmissions")}
                        value={statistics?.totalSubmissions || 0}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                    <Card>
                      <Statistic
                        title={t("exams.stats.averageScore")}
                        value={
                          statistics?.averageScore
                            ? Number(statistics.averageScore.toFixed(1))
                            : 0
                        }
                        suffix={`/ ${examData.totalMarks}`}
                        prefix={<img src="/leaderboard.png" alt="Trophy" style={{ width: 20, height: 20 }} />}
                      />
                    </Card>
                  </Space>
                </Col>
              </Row>
            ),
          },
          {
            key: "statistics",
            label: (
              <span>
                <img src="/statistic.png" alt="Statistics" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
                {t("exams.tabs.statistics")}
              </span>
            ),
            children: (
              <>
                {statsLoading ? (
                  <div style={{ textAlign: "center", padding: "50px" }}>
                    <Spin />
                  </div>
                ) : statistics ? (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <Statistic
                          title={t("exams.stats.totalSubmissions")}
                          value={statistics.totalSubmissions || 0}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <Statistic
                          title={t("exams.stats.averageScore")}
                          value={
                            statistics.averageScore
                              ? Number(statistics.averageScore.toFixed(1))
                              : 0
                          }
                          suffix={`/ ${examData.totalMarks}`}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <Statistic
                          title={t("exams.stats.highestScore")}
                          value={
                            statistics.highestScore
                              ? Number(statistics.highestScore.toFixed(1))
                              : 0
                          }
                          suffix={`/ ${examData.totalMarks}`}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <Statistic
                          title={t("exams.stats.lowestScore")}
                          value={
                            statistics.lowestScore
                              ? Number(statistics.lowestScore.toFixed(1))
                              : 0
                          }
                          suffix={`/ ${examData.totalMarks}`}
                        />
                      </Card>
                    </Col>
                  </Row>
                ) : (
                  <Empty description={t("exams.stats.noData")} />
                )}
                {/* Score Distribution Chart */}
                {scoreDistributionLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "50px",
                      marginTop: 16,
                    }}
                  >
                    <Spin />
                  </div>
                ) : scoreDistribution.length > 0 ? (
                  <Card
                    title={
                      t("exams.stats.scoreDistribution") || "Phân bố điểm số"
                    }
                    style={{ marginTop: 16 }}
                  >
                    <Column
                      data={scoreDistribution}
                      xField="range"
                      yField="count"
                      label={{
                        position: "top",
                        offset: 5,
                        style: {
                          fill: "#fff",
                          fontSize: 16,
                          fontWeight: "bold",
                        },
                      }}
                      columnStyle={{
                        fill: "#1890ff",
                      }}
                      height={400}
                      meta={{
                        range: {
                          alias: t("exams.stats.scoreRange") || "Khoảng điểm",
                        },
                        count: {
                          alias: t("exams.stats.studentCount") || "Số học sinh",
                        },
                      }}
                    />
                  </Card>
                ) : statistics ? (
                  <Card style={{ marginTop: 16 }}>
                    <Empty
                      description={
                        t("exams.stats.noScoreData") ||
                        "Chưa có dữ liệu điểm số"
                      }
                    />
                  </Card>
                ) : null}
              </>
            ),
          },
          {
            key: "leaderboard",
            label: (
              <span>
                <img src="/leaderboard.png" alt="Leaderboard" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
                {t("exams.tabs.leaderboard")}
              </span>
            ),
            children: (
              <Card>
                {leaderboardLoading ? (
                  <div style={{ textAlign: "center", padding: "50px" }}>
                    <Spin />
                  </div>
                ) : (
                  <Table
                    columns={leaderboardColumns}
                    dataSource={leaderboard}
                    rowKey={(record) => {
                      // Use submission _id first, then combination of student and rank
                      if (record._id) return record._id;
                      const studentId = record.student?._id;
                      const rank = record.rank;
                      return studentId && rank
                        ? `leaderboard-${studentId}-${rank}`
                        : `leaderboard-${Math.random()}`;
                    }}
                    pagination={{
                      current: leaderboardPagination.current,
                      pageSize: leaderboardPagination.pageSize,
                      total: leaderboardPagination.total,
                      showSizeChanger: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} ${t("common.of") || "of"} ${total} ${t("exams.leaderboard.items") || "items"}`,
                      pageSizeOptions: ["10", "20", "50", "100"],
                      defaultPageSize: 20,
                      onChange: handleLeaderboardPaginationChange,
                      onShowSizeChange: handleLeaderboardPaginationChange,
                    }}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: t("exams.leaderboard.noData") }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "students",
            label: (
              <span>
                <img src="/students.png" alt="Students" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
                {t("exams.tabs.students")}
              </span>
            ),
            children: (
              <Card>
                <Space direction="vertical" size="middle" style={{ width: "100%", marginBottom: 16 }}>
                  <Space wrap>
                    <Button
                      type={showAllAttempts ? "default" : "primary"}
                      onClick={handleShowAllAttemptsToggle}
                    >
                      {showAllAttempts
                        ? t("exams.submissions.showLatestOnly")
                        : t("exams.submissions.showAllAttempts")}
                    </Button>
                    <Select
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 200 }}
                      placeholder={t("exams.submissions.filterByStatus")}
                    >
                      <Select.Option value="all">{t("exams.submissions.allStatuses")}</Select.Option>
                      <Select.Option value="graded">{t("exams.submissions.graded")}</Select.Option>
                      <Select.Option value="in_progress">{t("exams.submissions.inProgress")}</Select.Option>
                      <Select.Option value="late">{t("exams.submissions.late")}</Select.Option>
                      <Select.Option value="submitted">{t("exams.submissions.submitted")}</Select.Option>
                    </Select>
                    <Input
                      placeholder={t("exams.submissions.searchPlaceholder")}
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      allowClear
                      style={{ width: 250 }}
                    />
                  </Space>
                </Space>
                {submissionsLoading ? (
                  <div style={{ textAlign: "center", padding: "50px" }}>
                    <Spin />
                  </div>
                ) : (
                  <Table
                    columns={submissionsColumns}
                    dataSource={submissions}
                    rowKey={(record) => {
                      // Always use submission _id as primary key to avoid duplicates
                      if (record._id) return record._id;
                      // Fallback: combine student ID with submission timestamp or random
                      const studentId = record.student?._id;
                      const submittedAt = record.submittedAt;
                      return studentId && submittedAt
                        ? `submission-${studentId}-${submittedAt}`
                        : `submission-${
                            studentId || "unknown"
                          }-${Math.random()}`;
                    }}
                    rowClassName={(record) => {
                      // Highlight if submitted after exam end time
                      if (examData?.endTime && record.submittedAt) {
                        const submittedAt = new Date(record.submittedAt);
                        const examEndTime = new Date(examData.endTime);
                        if (submittedAt > examEndTime) {
                          return "late-submission-row";
                        }
                      }
                      return "";
                    }}
                    pagination={{
                      current: submissionsPagination.current,
                      pageSize: submissionsPagination.pageSize,
                      total: submissionsPagination.total,
                      showSizeChanger: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} ${t("common.of") || "of"} ${total} ${t("exams.submissions.items") || "items"}`,
                      pageSizeOptions: ["10", "20", "50", "100"],
                      defaultPageSize: 20,
                      onChange: handleSubmissionsPaginationChange,
                      onShowSizeChange: handleSubmissionsPaginationChange,
                    }}
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: t("exams.submissions.noData") }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Preview Modal */}
      <PreviewExamModal
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        examData={examData}
        questions={examData?.questions || []}
        subjects={[]}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        value={examData?.shareCode ? `${window.location.origin}/exam/${examData.shareCode}` : ''}
        title={t('exams.shareLinkQR') || 'Exam Share Link QR'}
        description={t('exams.qrDescription') || 'Students can scan this QR code to access the exam'}
        filename={examData?.name ? `qr_exam_${examData.name.replace(/[^a-zA-Z0-9]/g, '_')}` : 'qr_exam'}
      />
    </div>
  );
};

export default ExamDetailNew;
