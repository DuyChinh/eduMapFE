import { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  message, 
  Select, 
  InputNumber, 
  Switch, 
  Space, 
  DatePicker,
  Collapse,
  Table,
  Tag,
  Popconfirm
} from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import examService from '../../api/examService';
import questionService from '../../api/questionService';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const CreateExamModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionSearchLoading, setQuestionSearchLoading] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const { t, i18n } = useTranslation();

  // Fetch subjects on mount
  useEffect(() => {
    if (visible) {
      fetchSubjects();
      // Set default values
      const now = dayjs();
      form.setFieldsValue({
        duration: 60,
        totalMarks: 100,
        examPurpose: 'exam',
        isAllowUser: 'everyone',
        maxAttempts: 1,
        viewMark: 1,
        viewExamAndAnswer: 1,
        timezone: 'Asia/Ho_Chi_Minh',
        startTime: now,
        endTime: now.add(3, 'days'),
        autoMonitoring: 'fullMonitoring',
        studentVerification: false,
        eduMapOnly: false,
        hideGroupTitles: true,
        sectionsStartFromQ1: false,
        hideLeaderboard: true,
        addTitleInfo: false,
        preExamNotification: false,
        fee: 0,
        settings: {
          allowReview: true,
          showCorrectAnswer: true,
          shuffleQuestions: true,
          shuffleChoices: true,
          timeLimit: true,
          teacherCanStart: true,
          teacherCanPause: true,
          teacherCanStop: true,
          showProgress: true,
          showTimer: true,
          allowSkip: true,
          allowBack: true,
          autoSubmit: true,
          confirmSubmit: true,
          allowLateSubmission: true,
          preventCopy: true,
          preventRightClick: true,
          fullscreenMode: true,
          notifyOnStart: true,
          notifyOnSubmit: true,
          notifyOnTimeWarning: true,
          questionPerPage: 1,
          saveProgress: true,
          allowReviewAfterSubmit: true,
          showQuestionNumbers: true,
          allowMarkForReview: true,
          showAnswerExplanation: true,
          allowQuestionFeedback: true,
          randomizeQuestionOrder: true,
          randomizeChoiceOrder: true,
          allowPartialCredit: true,
          showScoreImmediately: true,
          allowRetake: true,
          maxRetakeAttempts: 0,
          retakeDelay: 0,
          timeWarningThreshold: 5,
          gracePeriod: 0,
          lateSubmissionPenalty: 0,
          theme: 'default',
          fontSize: 'medium',
          showNavigation: true,
          showQuestionList: true,
          allowFullscreen: true,
          showInstructions: true,
          instructions: ''
        }
      });
    }
  }, [visible, form]);

  const fetchSubjects = async () => {
    try {
      const response = await questionService.getSubjects();
      
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
      message.error('Failed to load subjects');
    }
  };

  const searchQuestions = async (subjectId) => {
    if (!subjectId) {
      message.warning(t('exams.selectSubjectFirst'));
      return;
    }

    setQuestionSearchLoading(true);
    try {
      const response = await questionService.getQuestions({
        subjectId,
        q: questionSearchQuery,
        limit: 100
      });
      
      setQuestions(response.items || []);
    } catch (error) {
      console.error('Error searching questions:', error);
      message.error(t('exams.searchQuestionsFailed'));
    } finally {
      setQuestionSearchLoading(false);
    }
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

  const handleSubmit = async (values) => {
    if (selectedQuestions.length === 0) {
      message.error(t('exams.questionsRequired'));
      return;
    }

    setLoading(true);
    try {
      // Prepare exam data
      const examData = {
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
        subjectId: values.subjectId,
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
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : undefined,
        availableUntil: values.availableUntil ? values.availableUntil.toISOString() : undefined,
        questions: selectedQuestions.map((q, index) => ({
          questionId: q._id || q.id,
          order: index + 1,
          marks: q.marks || 1,
          isRequired: q.isRequired !== false
        })),
        settings: values.settings || {}
      };

      await examService.createExam(examData);
      message.success(t('exams.createSuccess'));
      handleCancel();
      onSuccess();
    } catch (error) {
      console.error('Create exam error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('exams.createFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedQuestions([]);
    setQuestions([]);
    setQuestionSearchQuery('');
    onCancel();
  };

  const questionColumns = [
    {
      title: t('exams.order'),
      dataIndex: 'order',
      key: 'order',
      width: 60,
    },
    {
      title: t('exams.questionName'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: t('exams.marks'),
      key: 'marks',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.marks}
          onChange={(value) => handleUpdateQuestionMarks(record._id || record.id, value)}
          style={{ width: '100%' }}
        />
      ),
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

  return (
    <Modal
      title={t('exams.createNew')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Collapse defaultActiveKey={['basic', 'questions', 'scheduling', 'viewSettings', 'security', 'advanced']} ghost>
          {/* Basic Information */}
          <Panel header={t('exams.basicInfo')} key="basic">
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
                <InputNumber min={0} style={{ width: '100%' }} />
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
              label={t('exams.examPassword')}
              name="examPassword"
              rules={[
                { required: true, message: t('exams.examPasswordRequired') },
                { min: 1, message: t('exams.examPasswordMinLength') }
              ]}
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
            </Space>
          </Panel>

          {/* Questions */}
          <Panel header={t('exams.questions')} key="questions">
            <Form.Item
              label={t('exams.subject')}
              name="subjectId"
              rules={[{ required: true, message: t('exams.subjectRequired') }]}
            >
              <Select
                placeholder={t('exams.selectSubject')}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(subjectId) => {
                  if (subjectId) {
                    setQuestionSearchQuery('');
                    searchQuestions(subjectId);
                  } else {
                    setQuestions([]);
                  }
                }}
              >
                {subjects.map(subject => {
                  const currentLang = i18n.language || 'vi';
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

            <Space style={{ marginBottom: 16, width: '100%' }}>
              <Input
                placeholder={t('exams.searchQuestions')}
                prefix={<SearchOutlined />}
                value={questionSearchQuery}
                onChange={(e) => setQuestionSearchQuery(e.target.value)}
                onPressEnter={() => {
                  const subjectId = form.getFieldValue('subjectId');
                  if (subjectId) searchQuestions(subjectId);
                }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={questionSearchLoading}
                onClick={() => {
                  const subjectId = form.getFieldValue('subjectId');
                  if (subjectId) searchQuestions(subjectId);
                }}
              >
                {t('common.search')}
              </Button>
            </Space>

              {questions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={questions}
                    rowKey={(record) => record._id || record.id}
                    pagination={false}
                    size="small"
                    scroll={{ y: questions.length > 5 ? 200 : undefined }}
                    columns={[
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
                        title: t('common.actions'),
                        key: 'actions',
                        width: 100,
                        render: (_, record) => (
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() => handleAddQuestion(record)}
                            disabled={selectedQuestions.some(q => (q._id || q.id) === (record._id || record.id))}
                          >
                            {t('common.add')}
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              )}

            {selectedQuestions.length > 0 && (
              <div>
                <h4>{t('exams.selectedQuestions')} ({selectedQuestions.length})</h4>
                <Table
                  dataSource={selectedQuestions}
                  rowKey={(record) => record._id || record.id}
                  pagination={false}
                  columns={questionColumns}
                  size="small"
                />
              </div>
            )}
          </Panel>

          {/* Scheduling */}
          <Panel header={t('exams.scheduling')} key="scheduling">
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

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                label={t('exams.availableFrom')}
                name="availableFrom"
                style={{ flex: 1 }}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label={t('exams.availableUntil')}
                name="availableUntil"
                style={{ flex: 1 }}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>
          </Panel>

          {/* View Settings */}
          <Panel header={t('exams.viewSettings')} key="viewSettings">
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
          </Panel>

          {/* Security Settings */}
          <Panel header={t('exams.securitySettings')} key="security">
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
          </Panel>

          {/* Advanced Settings */}
          <Panel header={t('exams.advancedSettings')} key="advanced">
            <Form.Item name="settings" noStyle>
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
            </Form.Item>
          </Panel>
        </Collapse>

        <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('exams.create')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateExamModal;

