import { ArrowLeftOutlined, DeleteOutlined, PartitionOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import classService from '../../api/classService';
import examService from '../../api/examService';
import questionService from '../../api/questionService';
import { ROUTES } from '../../constants/config';
import PreviewExamModal from '../../components/teacher/PreviewExamModal';
import SelectQuestionsModal from '../../components/teacher/SelectQuestionsModal';

dayjs.extend(utc);
dayjs.extend(timezone);

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

// Helper function to truncate number to 2 decimal places (not rounding)
const truncateToDecimals = (num, decimals = 2) => {
  if (num == null || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
};

const EditExam = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]); // Store all questions for client-side filtering
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionSearchLoading, setQuestionSearchLoading] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewExamData, setPreviewExamData] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [selectQuestionsModalVisible, setSelectQuestionsModalVisible] = useState(false);
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const classesFetchedRef = useRef(false); // Track if classes have been fetched
  const { examId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    if (examId) {
      // Reset classesFetchedRef when examId changes
      classesFetchedRef.current = false;
      fetchExamData();
      fetchSubjects();
      fetchClasses();
    }
  }, [examId]);

  // Force form update when selectedQuestions changes to update validation
  useEffect(() => {
    form.setFieldsValue({ _trigger: Date.now() });
  }, [selectedQuestions, form]);

  const fetchExamData = async () => {
    setInitialLoading(true);
    try {
      const response = await examService.getExamById(examId);
      const examData = response.data || response;

      // Extract subjectId - handle both object (populated) and string (ID) cases
      const subjectIdValue = examData.subjectId
        ? (typeof examData.subjectId === 'object' && examData.subjectId._id
          ? examData.subjectId._id
          : examData.subjectId)
        : undefined;

      // Extract gradeId - handle both object (populated) and string (ID) cases
      const gradeIdValue = examData.gradeId
        ? (typeof examData.gradeId === 'object' && examData.gradeId._id
          ? examData.gradeId._id
          : examData.gradeId)
        : undefined;

      // Set form values from examData
      form.setFieldsValue({
        name: examData.name,
        description: examData.description || '',
        duration: examData.duration,
        totalMarks: examData.totalMarks,
        examPurpose: examData.examPurpose,
        isAllowUser: examData.isAllowUser,
        examPassword: examData.examPassword,
        maxAttempts: examData.maxAttempts,
        viewMark: examData.viewMark,
        viewExamAndAnswer: examData.viewExamAndAnswer,
        subjectId: subjectIdValue,
        gradeId: gradeIdValue,
        fee: examData.fee || 0,
        timezone: examData.timezone || 'Asia/Ho_Chi_Minh',
        autoMonitoring: examData.autoMonitoring || 'fullMonitoring',
        studentVerification: examData.studentVerification || false,
        eduMapOnly: examData.eduMapOnly || false,
        hideGroupTitles: examData.hideGroupTitles !== undefined ? !examData.hideGroupTitles : true,
        sectionsStartFromQ1: examData.sectionsStartFromQ1 || false,
        hideLeaderboard: examData.hideLeaderboard !== undefined ? !examData.hideLeaderboard : true,
        addTitleInfo: examData.addTitleInfo || false,
        preExamNotification: examData.preExamNotification || false,
        preExamNotificationText: examData.preExamNotificationText || '',
        startTime: examData.startTime ? dayjs(examData.startTime) : undefined,
        endTime: examData.endTime ? dayjs(examData.endTime) : undefined,
        blockLateEntry: examData.lateEntryGracePeriod === undefined || examData.lateEntryGracePeriod === null || examData.lateEntryGracePeriod < 0,
        lateEntryGracePeriod: examData.lateEntryGracePeriod !== undefined && examData.lateEntryGracePeriod >= 0 ? examData.lateEntryGracePeriod : -1,
        status: examData.status || 'draft',
        settings: examData.settings || {},
        allowedClassIds: examData.allowedClassIds || []
      });

      // Load existing questions
      if (examData.questions && examData.questions.length > 0) {
        const formattedQuestions = examData.questions.map((q, index) => {
          const questionId = q.questionId?._id || q.questionId;
          const questionObj = typeof q.questionId === 'object' ? q.questionId : null;

          // If questionId is populated object, preserve full data
          if (questionObj && questionObj.text) {
            return {
              ...questionObj,
              _id: questionObj._id || questionId,
              id: questionObj._id || questionId,
              order: q.order || index + 1,
              marks: q.marks || 1,
              isRequired: q.isRequired !== undefined ? q.isRequired : true
            };
          }

          // Otherwise, just store metadata
          return {
            _id: questionId,
            id: questionId,
            name: questionObj?.name || questionObj?.text || t('exams.unknownQuestion'),
            type: questionObj?.type || 'mcq',
            order: q.order || index + 1,
            marks: q.marks || 1,
            isRequired: q.isRequired !== undefined ? q.isRequired : true
          };
        });
        setSelectedQuestions(formattedQuestions);
      }

      // Load questions of subject if subjectId exists
      if (subjectIdValue) {
        loadQuestionsBySubject(subjectIdValue);
      }
    } catch (error) {
      console.error('Error fetching exam data:', error);
      message.error(t('exams.fetchFailed'));
      navigate(ROUTES.TEACHER_EXAMS);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const currentLang = localStorage.getItem('language') || 'vi';
      const response = await questionService.getSubjects({ lang: currentLang });

      let subjectsData = [];
      if (Array.isArray(response)) {
        subjectsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        subjectsData = response.data;
      } else if (response.items && Array.isArray(response.items)) {
        subjectsData = response.items;
      }

      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    // Prevent multiple calls
    if (loadingClasses || classesFetchedRef.current) {
      return;
    }

    setLoadingClasses(true);
    classesFetchedRef.current = true;
    try {
      const response = await classService.getMyClasses();
      const classesData = response.items || response.data || [];
      // Convert Mongoose documents to plain objects if needed
      const normalizedClasses = classesData.map(cls => {
        // Handle Mongoose document structure
        if (cls._doc) {
          return cls._doc;
        }
        // Handle plain object
        return cls;
      });
      setClasses(normalizedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error(t('classes.fetchFailed'));
      classesFetchedRef.current = false; // Reset on error to allow retry
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadQuestionsBySubject = async (subjectId) => {
    if (!subjectId) {
      setAllQuestions([]);
      setQuestions([]);
      setQuestionSearchQuery('');
      return;
    }

    setQuestionSearchLoading(true);
    try {
      const params = {
        subjectId,
        limit: 1000 // Load more questions for client-side filtering
      };

      const response = await questionService.getQuestions(params);
      const loadedQuestions = response.items || response.data || [];
      setAllQuestions(loadedQuestions);
      // Apply current search filter if any
      filterQuestions(loadedQuestions, questionSearchQuery);
    } catch (error) {
      console.error('Error loading questions:', error);
      message.error(t('exams.searchQuestionsFailed'));
    } finally {
      setQuestionSearchLoading(false);
    }
  };

  const filterQuestions = (questionsToFilter, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setQuestions(questionsToFilter);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = questionsToFilter.filter(q => {
      const name = (q.name || '').toLowerCase();
      const text = (q.text || '').toLowerCase();
      return name.includes(query) || text.includes(query);
    });
    setQuestions(filtered);
  };

  const handleSearchQueryChange = (value) => {
    setQuestionSearchQuery(value);
    filterQuestions(allQuestions, value);
  };

  // Distribute marks evenly among questions
  const distributeMarksEvenly = (questions) => {
    const totalMarks = form.getFieldValue('totalMarks') || 100;
    if (questions.length === 0) return questions;
    
    // Calculate exact marks per question (keep full precision)
    const marksPerQuestion = totalMarks / questions.length;
    
    return questions.map((q) => {
      return {
        ...q,
        marks: marksPerQuestion
      };
    });
  };

  const handleAutoDistributeMarks = () => {
    if (selectedQuestions.length === 0) {
      message.warning(t('exams.noQuestionsSelected'));
      return;
    }
    const totalMarks = form.getFieldValue('totalMarks');
    if (!totalMarks || totalMarks <= 0) {
      message.warning(t('exams.totalMarksRequired'));
      return;
    }
    const questionsWithDistributedMarks = distributeMarksEvenly(selectedQuestions);
    setSelectedQuestions(questionsWithDistributedMarks);
    message.success(t('exams.marksDistributed'));
  };

  const handleOpenSelectQuestionsModal = () => {
    const subjectId = form.getFieldValue('subjectId');
    if (subjectId) {
      setCurrentSubjectId(subjectId);
      setSelectQuestionsModalVisible(true);
    } else {
      message.warning(t('exams.selectSubjectFirst'));
    }
  };

  const handleQuestionsSelected = (newQuestions) => {
    // Add new questions to selected list with order and default marks
    const questionsWithDetails = newQuestions.map((q, index) => ({
      ...q,
      order: selectedQuestions.length + index + 1,
      marks: 1,
      isRequired: true,
    }));
    
    setSelectedQuestions([...selectedQuestions, ...questionsWithDetails]);
    message.success(`${t('common.add')} ${newQuestions.length} ${t('questions.items') || 'questions'}`);
  };

  const handleAddQuestion = (question) => {
    const questionId = question._id || question.id;
    if (selectedQuestions.find(q => (q._id || q.id) === questionId)) {
      message.warning(t('exams.questionAlreadyAdded'));
      return;
    }

    const newQuestion = {
      ...question,
      order: selectedQuestions.length + 1,
      marks: 1,
      isRequired: true
    };

    setSelectedQuestions([...selectedQuestions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId) => {
    const updated = selectedQuestions
      .filter(q => (q._id || q.id) !== questionId)
      .map((q, index) => ({ ...q, order: index + 1 }));

    setSelectedQuestions(updated);
  };

  const handleUpdateQuestionMarks = (questionId, marks) => {
    setSelectedQuestions(selectedQuestions.map(q =>
      (q._id || q.id) === questionId ? { ...q, marks } : q
    ));
  };

  // Calculate total marks of selected questions
  const calculateTotalQuestionMarks = () => {
    return selectedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  };

  // Validate if total question marks equals total marks (allow small difference due to decimal precision)
  const validateMarks = () => {
    const totalMarks = form.getFieldValue('totalMarks');
    const totalQuestionMarks = calculateTotalQuestionMarks();
    if (!totalMarks) return false;
    // Allow small difference (0.01) due to floating point precision
    return Math.abs(totalQuestionMarks - totalMarks) < 0.01;
  };

  const getQuestionTypeText = (type) => {
    const types = {
      mcq: t('questions.types.mcq'),
      tf: t('questions.types.tf'),
      short: t('questions.types.short'),
      essay: t('questions.types.essay')
    };
    return types[type] || type;
  };

  const getQuestionTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
  };

  const questionColumns = [
    {
      title: t('exams.order'),
      dataIndex: 'order',
      key: 'order',
      width: 60,
    },
    {
      title: t('questions.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: t('questions.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => (
        <Tag color={getQuestionTypeColor(type)}>
          {getQuestionTypeText(type)}
        </Tag>
      ),
    },
    {
      title: t('exams.marks'),
      key: 'marks',
      width: 120,
      render: (_, record) => {
        const marksValue = record.marks;
        // Truncate to 2 decimal places for display (not rounding)
        const displayValue = marksValue != null ? Math.floor(marksValue * 100) / 100 : 0;
        
        return (
          <InputNumber
            min={0}
            step={0.01}
            value={displayValue}
            onChange={(value) => handleUpdateQuestionMarks(record._id || record.id, value)}
            style={{ width: '100%' }}
            precision={2}
          />
        );
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title={t('exams.removeQuestionConfirm')}
          onConfirm={() => handleRemoveQuestion(record._id || record.id)}
          okText={t('common.yes')}
          cancelText={t('common.no')}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const handleSubmit = async (values) => {
    // Validate marks
    const totalQuestionMarks = calculateTotalQuestionMarks();
    // Allow small difference (0.01) due to decimal precision
    if (Math.abs(totalQuestionMarks - values.totalMarks) >= 0.01) {
      message.error(t('exams.marksMismatchWithValues', { 
        questionMarks: truncateToDecimals(totalQuestionMarks), 
        totalMarks: values.totalMarks 
      }));
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: values.name,
        description: values.description || '',
        duration: values.duration,
        totalMarks: values.totalMarks,
        examPurpose: values.examPurpose,
        isAllowUser: values.isAllowUser,
        examPassword: values.examPassword,
        maxAttempts: values.maxAttempts,
        viewMark: values.viewMark,
        viewExamAndAnswer: values.viewExamAndAnswer,
        gradeId: values.gradeId,
        fee: values.fee || 0,
        timezone: values.timezone || 'Asia/Ho_Chi_Minh',
        autoMonitoring: values.autoMonitoring || 'fullMonitoring',
        studentVerification: values.studentVerification || false,
        eduMapOnly: values.eduMapOnly || false,
        hideGroupTitles: !values.hideGroupTitles,
        sectionsStartFromQ1: values.sectionsStartFromQ1 || false,
        hideLeaderboard: !values.hideLeaderboard,
        addTitleInfo: values.addTitleInfo || false,
        preExamNotification: values.preExamNotification || false,
        preExamNotificationText: values.preExamNotificationText || '',
        startTime: values.startTime ? values.startTime.toISOString() : undefined,
        endTime: values.endTime ? values.endTime.toISOString() : undefined,
        lateEntryGracePeriod: !values.blockLateEntry ? (values.lateEntryGracePeriod || 0) : -1,
        status: values.status,
        settings: values.settings || {},
        allowedClassIds: values.isAllowUser === 'class' ? (values.allowedClassIds || []) : [],
        questions: selectedQuestions.map((q, index) => ({
          questionId: q._id || q.id,
          order: q.order || index + 1,
          marks: q.marks || 1,
          isRequired: q.isRequired !== undefined ? q.isRequired : true
        }))
      };

      await examService.updateExam(examId, updateData);
      message.success(t('exams.updateSuccess'));
      navigate(ROUTES.TEACHER_EXAMS);
    } catch (error) {
      console.error('Update exam error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.updateFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(ROUTES.TEACHER_EXAMS)}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>{t('exams.editExam')}</Title>
        </Space>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Collapse defaultActiveKey={['basic', 'questions', 'scheduling', 'viewSettings', 'security', 'advanced']} ghost>
            {/* Basic Information */}
            <Collapse.Panel header={t('exams.basicInfo')} key="basic">
              <Form.Item
                label={t('exams.name')}
                name="name"
                rules={[
                  { required: true, message: t('exams.nameRequired') },
                  { min: 2, message: t('exams.nameMinLength') }
                ]}
              >
                <Input placeholder={t('exams.namePlaceholder')} />
              </Form.Item>

              <Form.Item
                label={t('exams.description')}
                name="description"
              >
                <TextArea rows={3} placeholder={t('exams.descriptionPlaceholder')} />
              </Form.Item>

              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label={t('exams.duration')}
                  name="duration"
                  rules={[
                    { required: true, message: t('exams.durationRequired') },
                    { type: 'number', min: 1, message: t('exams.durationMin') }
                  ]}
                  style={{ flex: 1 }}
                >
                  <InputNumber min={1} style={{ width: '100%' }} addonAfter={t('exams.minutes')} />
                </Form.Item>

                <Form.Item
                  label={t('exams.totalMarks')}
                  name="totalMarks"
                  rules={[
                    { required: true, message: t('exams.totalMarksRequired') },
                    { type: 'number', min: 0, message: t('exams.totalMarksMin') }
                  ]}
                  style={{ flex: 1 }}
                >
                  <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
              </Space>

              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label={t('exams.examPurpose')}
                  name="examPurpose"
                  rules={[{ required: true, message: t('exams.examPurposeRequired') }]}
                  style={{ flex: 1 }}
                >
                  <Select>
                    <Option value="exam">{t('exams.purposeExam')}</Option>
                    <Option value="practice">{t('exams.purposePractice')}</Option>
                    <Option value="quiz">{t('exams.purposeQuiz')}</Option>
                    <Option value="assignment">{t('exams.purposeAssignment')}</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label={t('exams.isAllowUser')}
                  name="isAllowUser"
                  rules={[{ required: true, message: t('exams.isAllowUserRequired') }]}
                  style={{ flex: 1 }}
                >
                  <Select>
                    <Option value="everyone">{t('exams.allowEveryone')}</Option>
                    <Option value="class">{t('exams.allowClass')}</Option>
                    <Option value="student">{t('exams.allowStudent')}</Option>
                  </Select>
                </Form.Item>
              </Space>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.isAllowUser !== currentValues.isAllowUser}
              >
                {({ getFieldValue }) => {
                  const isAllowUser = getFieldValue('isAllowUser');
                  if (isAllowUser === 'class') {
                    // fetchClasses is already called in useEffect on mount
                    // No need to call again here to avoid infinite loop

                    return (
                      <Form.Item
                        label={t('exams.allowedClasses')}
                        name="allowedClassIds"
                        rules={[
                          {
                            required: true,
                            message: t('exams.allowedClassesRequired')
                          }
                        ]}
                      >
                        <Select
                          mode="multiple"
                          placeholder={t('exams.selectClasses')}
                          loading={loadingClasses}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          notFoundContent={loadingClasses ? <Spin size="small" /> : t('exams.noClassesFound')}
                        >
                          {classes.map(cls => (
                            <Option key={cls._id || cls.id} value={cls._id || cls.id}>
                              {cls.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>

              <Form.Item
                label={t('exams.examPassword')}
                name="examPassword"
              >
                <Input.Password placeholder={t('exams.examPasswordPlaceholder')} />
              </Form.Item>

              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label={t('exams.maxAttempts')}
                  name="maxAttempts"
                  rules={[
                    { required: true, message: t('exams.maxAttemptsRequired') },
                    { type: 'number', min: 1, message: t('exams.maxAttemptsMin') }
                  ]}
                  style={{ flex: 1 }}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label={t('exams.fee')}
                  name="fee"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="VND" />
                </Form.Item>

                <Form.Item
                  label={t('exams.status')}
                  name="status"
                  style={{ flex: 1 }}
                >
                  <Select>
                    <Option value="draft">{t('exams.statusDraft')}</Option>
                    <Option value="published">{t('exams.statusPublished')}</Option>
                    <Option value="archived">{t('exams.statusArchived')}</Option>
                  </Select>
                </Form.Item>
              </Space>
            </Collapse.Panel>

            {/* Questions */}
            <Collapse.Panel header={t('exams.questions')} key="questions">
              <Form.Item
                label={t('exams.subject')}
                name="subjectId"
              >
                <Select
                  placeholder={t('exams.selectSubject')}
                  showSearch
                  disabled
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {subjects.map(subject => {
                    const currentLang = localStorage.getItem('language') || 'vi';
                    let subjectName = subject.name;

                    switch (currentLang) {
                      case 'en':
                        subjectName = subject.name_en || subject.name;
                        break;
                      case 'jp':
                        subjectName = subject.name_jp || subject.name;
                        break;
                    }

                    return (
                      <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                        {subjectName}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>

              {/* Add Questions Button */}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleOpenSelectQuestionsModal}
                style={{ marginBottom: 16 }}
              >
                {t('exams.addMoreQuestions') || 'Add Questions'}
              </Button>

              {selectedQuestions.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}>{t('exams.selectedQuestions')} ({selectedQuestions.length})</h4>
                    <Button
                      type="primary"
                      icon={<PartitionOutlined />}
                      onClick={handleAutoDistributeMarks}
                    >
                      {t('exams.autoDistributeMarks')}
                    </Button>
                  </div>
                  <Table
                    dataSource={selectedQuestions}
                    rowKey={(record) => record._id || record.id}
                    pagination={false}
                    columns={questionColumns}
                    size="small"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const totalMarks = form.getFieldValue('totalMarks');
                        const totalQuestionMarks = calculateTotalQuestionMarks();
                        // Allow small difference (0.01) due to floating point precision
                        const isValid = totalMarks && Math.abs(totalQuestionMarks - totalMarks) < 0.01;

                        if (totalMarks && !isValid) {
                          return (
                            <Typography.Text type="danger">
                              {t('exams.marksMismatchWithValues', {
                                questionMarks: truncateToDecimals(totalQuestionMarks),
                                totalMarks: totalMarks
                              })}
                            </Typography.Text>
                          );
                        }
                        return null;
                      }}
                    </Form.Item>
                  </div>
                </div>
              )}
            </Collapse.Panel>

            {/* Scheduling */}
            <Collapse.Panel header={t('exams.scheduling')} key="scheduling">
              <Form.Item
                label={t('exams.timezone')}
                name="timezone"
              >
                <Select>
                  <Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (Vietnam)</Option>
                  <Option value="Asia/Tokyo">Asia/Tokyo (Japan)</Option>
                  <Option value="Europe/London">Europe/London (UK)</Option>
                  <Option value="America/New_York">America/New_York (US Eastern)</Option>
                  <Option value="UTC">UTC</Option>
                </Select>
              </Form.Item>

              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label={t('exams.startTime')}
                  name="startTime"
                  style={{ flex: 1 }}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item
                  label={t('exams.endTime')}
                  name="endTime"
                  style={{ flex: 1 }}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Space>

              <Form.Item 
                name="blockLateEntry" 
                valuePropName="checked"
                style={{ marginBottom: '12px' }}
              >
                <Switch 
                  checkedChildren={t('exams.allowLateEntryAnytime')} 
                  unCheckedChildren={t('exams.blockLateEntry')}
                  onChange={(checked) => {
                    if (checked) {
                      // When toggling on (allow late entry), set to -1
                      form.setFieldsValue({ lateEntryGracePeriod: -1 });
                    } else {
                      // When toggling off (block late entry), if value is -1, set to 0
                      const currentValue = form.getFieldValue('lateEntryGracePeriod');
                      if (currentValue === -1 || currentValue === null || currentValue === undefined) {
                        form.setFieldsValue({ lateEntryGracePeriod: 0 });
                      }
                    }
                  }}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.blockLateEntry !== currentValues.blockLateEntry}>
                {({ getFieldValue }) => {
                  const blockLateEntry = getFieldValue('blockLateEntry');
                  return !blockLateEntry ? (
                    <Form.Item 
                      label={t('exams.lateEntryGracePeriod')}
                      name="lateEntryGracePeriod"
                      tooltip={t('exams.lateEntryGracePeriodTooltip')}
                      normalize={(value) => {
                        // If value is -1, null, or undefined, normalize to 0 for display
                        if (value === -1 || value === null || value === undefined) {
                          return 0;
                        }
                        return value;
                      }}
                    >
                      <InputNumber
                        min={0}
                        step={1}
                        addonAfter={t('exams.minutes')}
                        style={{ width: '200px' }}
                        placeholder="0"
                      />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>
            </Collapse.Panel>

            {/* View Settings */}
            <Collapse.Panel header={t('exams.viewSettings')} key="viewSettings">
              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label={t('exams.viewMark')}
                  name="viewMark"
                  rules={[{ required: true, message: t('exams.viewMarkRequired') }]}
                  style={{ flex: 1 }}
                >
                  <Select>
                    <Option value={0}>{t('exams.viewMarkNever')}</Option>
                    <Option value={1}>{t('exams.viewMarkAfterCompletion')}</Option>
                    <Option value={2}>{t('exams.viewMarkAfterAllFinish')}</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label={t('exams.viewExamAndAnswer')}
                  name="viewExamAndAnswer"
                  rules={[{ required: true, message: t('exams.viewExamAndAnswerRequired') }]}
                  style={{ flex: 1 }}
                >
                  <Select>
                    <Option value={0}>{t('exams.viewExamNever')}</Option>
                    <Option value={1}>{t('exams.viewExamAfterCompletion')}</Option>
                    <Option value={2}>{t('exams.viewExamAfterAllFinish')}</Option>
                  </Select>
                </Form.Item>
              </Space>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="hideGroupTitles" valuePropName="checked">
                  <Switch checkedChildren={t('exams.showGroupTitles')} unCheckedChildren={t('exams.hideGroupTitles')} />
                </Form.Item>

                <Form.Item name="sectionsStartFromQ1" valuePropName="checked">
                  <Switch checkedChildren={t('exams.sectionsStartFromQ1')} unCheckedChildren={t('exams.sectionsNotStartFromQ1')} />
                </Form.Item>

                <Form.Item name="hideLeaderboard" valuePropName="checked">
                  <Switch checkedChildren={t('exams.showLeaderboard')} unCheckedChildren={t('exams.hideLeaderboard')} />
                </Form.Item>

                <Form.Item name="addTitleInfo" valuePropName="checked">
                  <Switch checkedChildren={t('exams.addTitleInfo')} unCheckedChildren={t('exams.noTitleInfo')} />
                </Form.Item>

                <Form.Item name="preExamNotification" valuePropName="checked">
                  <Switch checkedChildren={t('exams.preExamNotification')} unCheckedChildren={t('exams.noPreExamNotification')} />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.preExamNotification !== currentValues.preExamNotification}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('preExamNotification') ? (
                      <Form.Item
                        name="preExamNotificationText"
                        rules={[{ required: true, message: t('exams.preExamNotificationTextRequired') }]}
                      >
                        <TextArea rows={2} placeholder={t('exams.preExamNotificationTextPlaceholder')} />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Space>
            </Collapse.Panel>

            {/* Security Settings */}
            <Collapse.Panel header={t('exams.securitySettings')} key="security">
              <Form.Item
                label={t('exams.autoMonitoring')}
                name="autoMonitoring"
              >
                <Select>
                  <Option value="off">{t('exams.monitoringOff')}</Option>
                  <Option value="screenExit">{t('exams.monitoringScreenExit')}</Option>
                  <Option value="fullMonitoring">{t('exams.monitoringFull')}</Option>
                </Select>
              </Form.Item>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="studentVerification" valuePropName="checked">
                  <Switch checkedChildren={t('exams.studentVerification')} unCheckedChildren={t('exams.noStudentVerification')} />
                </Form.Item>

                <Form.Item name="eduMapOnly" valuePropName="checked">
                  <Switch checkedChildren={t('exams.eduMapOnly')} unCheckedChildren={t('exams.notEduMapOnly')} />
                </Form.Item>
              </Space>
            </Collapse.Panel>

            {/* Advanced Settings */}
            <Collapse.Panel header={t('exams.advancedSettings')} key="advanced">
              <div>
                <Form.Item name={['settings', 'allowReview']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.allowReview')} unCheckedChildren={t('exams.noAllowReview')} />
                </Form.Item>

                <Form.Item name={['settings', 'showCorrectAnswer']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.showCorrectAnswer')} unCheckedChildren={t('exams.noShowCorrectAnswer')} />
                </Form.Item>

                <Form.Item name={['settings', 'shuffleQuestions']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.shuffleQuestions')} unCheckedChildren={t('exams.noShuffleQuestions')} />
                </Form.Item>

                <Form.Item name={['settings', 'shuffleChoices']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.shuffleChoices')} unCheckedChildren={t('exams.noShuffleChoices')} />
                </Form.Item>

                <Form.Item name={['settings', 'timeLimit']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.timeLimit')} unCheckedChildren={t('exams.noTimeLimit')} />
                </Form.Item>

                <Form.Item name={['settings', 'autoSubmit']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.autoSubmit')} unCheckedChildren={t('exams.noAutoSubmit')} />
                </Form.Item>

                <Form.Item name={['settings', 'confirmSubmit']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.confirmSubmit')} unCheckedChildren={t('exams.noConfirmSubmit')} />
                </Form.Item>

                <Form.Item name={['settings', 'preventCopy']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.preventCopy')} unCheckedChildren={t('exams.noPreventCopy')} />
                </Form.Item>

                <Form.Item name={['settings', 'preventRightClick']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.preventRightClick')} unCheckedChildren={t('exams.noPreventRightClick')} />
                </Form.Item>

                <Form.Item name={['settings', 'fullscreenMode']} valuePropName="checked">
                  <Switch checkedChildren={t('exams.fullscreenMode')} unCheckedChildren={t('exams.noFullscreenMode')} />
                </Form.Item>
              </div>
            </Collapse.Panel>
          </Collapse>

          <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const totalMarks = form.getFieldValue('totalMarks');
                const totalQuestionMarks = calculateTotalQuestionMarks();
                // Allow small difference (0.01) due to floating point precision
                const isValid = totalMarks && Math.abs(totalQuestionMarks - totalMarks) < 0.01 && selectedQuestions.length > 0;

                const handlePreview = async () => {
                  try {
                    // Validate and get form values
                    const formValues = await form.validateFields();

                    // Prepare questions with full data for preview
                    const loadedQuestions = await Promise.all(
                      selectedQuestions.map(async (q) => {
                        // If question already has full data (text, choices), use it
                        if (q.text || q.choices) {
                          return {
                            ...q,
                            order: q.order || 1,
                            marks: q.marks || 1
                          };
                        }

                        // If we have question ID, try to fetch full question data
                        const questionId = q._id || q.id;
                        if (questionId) {
                          try {
                            const questionResponse = await questionService.getQuestionById(questionId);
                            const fullQuestion = questionResponse.data || questionResponse;
                            return {
                              ...fullQuestion,
                              _id: fullQuestion._id || questionId,
                              id: fullQuestion._id || questionId,
                              order: q.order || 1,
                              marks: q.marks || 1
                            };
                          } catch (err) {
                            console.error('Error loading question:', err);
                            // Return with available data if fetch fails
                            return {
                              ...q,
                              order: q.order || 1,
                              marks: q.marks || 1
                            };
                          }
                        }

                        return {
                          ...q,
                          order: q.order || 1,
                          marks: q.marks || 1
                        };
                      })
                    );

                    setPreviewExamData(formValues);
                    setPreviewQuestions(loadedQuestions);
                    setPreviewModalVisible(true);
                  } catch (error) {
                    // If validation fails, still show preview with current values
                    const formValues = form.getFieldsValue();
                    setPreviewExamData(formValues);
                    // Try to load questions even if validation fails
                    const loadedQuestions = await Promise.all(
                      selectedQuestions.map(async (q) => {
                        const questionId = q._id || q.id;
                        if (questionId && !q.text && !q.choices) {
                          try {
                            const questionResponse = await questionService.getQuestionById(questionId);
                            const fullQuestion = questionResponse.data || questionResponse;
                            return {
                              ...fullQuestion,
                              _id: fullQuestion._id || questionId,
                              id: fullQuestion._id || questionId,
                              order: q.order || 1,
                              marks: q.marks || 1
                            };
                          } catch (err) {
                            return { ...q, order: q.order || 1, marks: q.marks || 1 };
                          }
                        }
                        return { ...q, order: q.order || 1, marks: q.marks || 1 };
                      })
                    );
                    setPreviewQuestions(loadedQuestions);
                    setPreviewModalVisible(true);
                  }
                };

                return (
                  <Space>
                    <Button onClick={() => navigate(ROUTES.TEACHER_EXAMS)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      icon={<EyeOutlined />}
                      onClick={handlePreview}
                      disabled={selectedQuestions.length === 0}
                    >
                      {t('exams.preview') || 'Preview'}
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      disabled={!isValid}
                    >
                      {t('exams.update')}
                    </Button>
                  </Space>
                );
              }}
            </Form.Item>
          </Form.Item>
        </Form>
      </Card>

      {/* Preview Modal */}
      {/* <PreviewExamModal
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewExamData(null);
          setPreviewQuestions([]);
        }}
        examData={previewExamData || form.getFieldsValue()}
        questions={previewQuestions.length > 0 ? previewQuestions : selectedQuestions}
        subjects={subjects}
      /> */}

      {/* Select Questions Modal */}
      <SelectQuestionsModal
        visible={selectQuestionsModalVisible}
        onCancel={() => setSelectQuestionsModalVisible(false)}
        onConfirm={handleQuestionsSelected}
        subjectId={currentSubjectId}
        alreadySelectedIds={selectedQuestions.map(q => q._id || q.id)}
      />
    </div>
  );
};

export default EditExam;

