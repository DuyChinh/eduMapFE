import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Card, 
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
  Typography,
  Spin
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import examService from '../../api/examService';
import { ROUTES } from '../../constants/config';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

const EditExam = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { examId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const fetchExamData = async () => {
    setInitialLoading(true);
    try {
      const response = await examService.getExamById(examId);
      const examData = response.data || response;
      
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
        subjectId: examData.subjectId,
        gradeId: examData.gradeId,
        fee: examData.fee || 0,
        timezone: examData.timezone || 'Asia/Ho_Chi_Minh',
        autoMonitoring: examData.autoMonitoring || 'off',
        studentVerification: examData.studentVerification || false,
        eduMapOnly: examData.eduMapOnly || false,
        hideGroupTitles: examData.hideGroupTitles || false,
        sectionsStartFromQ1: examData.sectionsStartFromQ1 || false,
        hideLeaderboard: examData.hideLeaderboard || false,
        addTitleInfo: examData.addTitleInfo || false,
        preExamNotification: examData.preExamNotification || false,
        preExamNotificationText: examData.preExamNotificationText || '',
        startTime: examData.startTime ? dayjs(examData.startTime) : undefined,
        endTime: examData.endTime ? dayjs(examData.endTime) : undefined,
        availableFrom: examData.availableFrom ? dayjs(examData.availableFrom) : undefined,
        availableUntil: examData.availableUntil ? dayjs(examData.availableUntil) : undefined,
        status: examData.status || 'draft',
        settings: examData.settings || {}
      });
    } catch (error) {
      console.error('Error fetching exam data:', error);
      message.error(t('exams.fetchFailed'));
      navigate(ROUTES.TEACHER_EXAMS);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
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
        autoMonitoring: values.autoMonitoring || 'off',
        studentVerification: values.studentVerification || false,
        eduMapOnly: values.eduMapOnly || false,
        hideGroupTitles: values.hideGroupTitles || false,
        sectionsStartFromQ1: values.sectionsStartFromQ1 || false,
        hideLeaderboard: values.hideLeaderboard || false,
        addTitleInfo: values.addTitleInfo || false,
        preExamNotification: values.preExamNotification || false,
        preExamNotificationText: values.preExamNotificationText || '',
        startTime: values.startTime ? values.startTime.toISOString() : undefined,
        endTime: values.endTime ? values.endTime.toISOString() : undefined,
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : undefined,
        availableUntil: values.availableUntil ? values.availableUntil.toISOString() : undefined,
        status: values.status,
        settings: values.settings || {}
      };

      await examService.updateExam(examId, updateData);
      message.success(t('exams.updateSuccess'));
      navigate(`${ROUTES.TEACHER_EXAMS}/${examId}`);
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
            onClick={() => navigate(`${ROUTES.TEACHER_EXAMS}/${examId}`)}
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
          <Collapse defaultActiveKey={['basic']} ghost>
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

            {/* Scheduling */}
            <Collapse.Panel header={t('exams.scheduling')} key="scheduling">
              <Form.Item
                label={t('exams.timezone')}
                name="timezone"
              >
                <Select>
                  <Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</Option>
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
                  <Switch checkedChildren={t('exams.hideGroupTitles')} unCheckedChildren={t('exams.showGroupTitles')} />
                </Form.Item>

                <Form.Item name="sectionsStartFromQ1" valuePropName="checked">
                  <Switch checkedChildren={t('exams.sectionsStartFromQ1')} unCheckedChildren={t('exams.sectionsNotStartFromQ1')} />
                </Form.Item>

                <Form.Item name="hideLeaderboard" valuePropName="checked">
                  <Switch checkedChildren={t('exams.hideLeaderboard')} unCheckedChildren={t('exams.showLeaderboard')} />
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
            <Space>
              <Button onClick={() => navigate(`${ROUTES.TEACHER_EXAMS}/${examId}`)}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('exams.update')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditExam;

