import { useState } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  Steps, 
  App,
  Form, 
  Input, 
  InputNumber,
  Select,
  Space,
  Progress,
  Alert,
  Card,
  Radio,
  Divider,
  Tag,
  DatePicker
} from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import pdfExamService from '../../api/pdfExamService';

const { Dragger } = Upload;
const { Step } = Steps;
const { Option } = Select;

const UploadPdfModal = ({ open, onClose, onSuccess, subjects }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const handleFileChange = (info) => {
    const { file } = info;
    
    if (file.originFileObj) {
      setUploadedFile(file.originFileObj);
      message.success(t('exams.fileUploaded'));
    } else if (file instanceof File) {
      setUploadedFile(file);
      message.success(t('exams.fileUploaded'));
    }
  };

  const beforeUpload = (file) => {
    const isPdf = file.type === 'application/pdf';
    if (!isPdf) {
      message.error(t('exams.onlyPdfAllowed'));
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('exams.fileTooLarge'));
      return false;
    }
    
    return false; // Prevent auto upload, we'll handle it manually
  };

  const handleParsePdf = async () => {
    if (!uploadedFile) {
      message.error(t('exams.pleaseUploadFile'));
      return;
    }

    setParsing(true);
    try {
      console.log('Uploading PDF to backend...', uploadedFile.name);
      const result = await pdfExamService.uploadPdfForParsing(uploadedFile);
      
      console.log('Backend response:', result);
      
      if (result.ok && result.data) {
        setParsedData(result.data);
        
        // Collect all questions from all pages
        const questions = [];
        result.data.pages?.forEach(page => {
          page.questions?.forEach(q => {
            questions.push({
              ...q,
              pageNumber: page.pageNumber
            });
          });
        });
        
        setAllQuestions(questions);
        
        const initialAnswers = {};
        questions.forEach(q => {
          if (q.answers && q.answers.length > 0) {
            initialAnswers[q.questionNumber] = q.correctAnswer || q.answers[0].key || 'A';
          }
        });
        setSelectedAnswers(initialAnswers);
        
        setCurrentStep(1);
        message.success(t('exams.pdfParsedSuccess', { count: result.data.totalQuestions }));
      } else {
        const errorMsg = result.message || 'Parsing failed';
        console.error('Parsing failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      
      // Display detailed error message
      const errorMessage = error.response?.data?.message 
        || error.message 
        || t('exams.parsingFailed');
      
      message.error({
        content: errorMessage,
        duration: 5
      });
      
      // Log to console for debugging
      console.error('Detailed error:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
    } finally {
      setParsing(false);
    }
  };

  const handleAnswerChange = (questionNumber, answerKey) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionNumber]: answerKey
    }));
  };

  const handleCreateExam = async (values) => {
    if (!allQuestions || allQuestions.length === 0) {
      message.error(t('exams.noDataToCreate'));
      return;
    }

    setCreating(true);
    try {
      // Prepare questions with selected correct answers
      const questionsToSubmit = allQuestions.map(q => {
        const answerKey = selectedAnswers[q.questionNumber] || q.answers[0]?.key || q.answers[0]?.letter || 'A';
        
        return {
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          answers: q.answers.map(ans => ({
            key: ans.key || ans.letter,
            text: ans.text
          })),
          correctAnswer: answerKey,
          explanation: q.explanation || '',
          level: q.level || 1,
          tags: q.tags || []
        };
      });

      // Create exam with all required fields
      const examData = {
        examName: values.examName,
        examDescription: values.examDescription || '',
        subjectId: values.subjectId,
        duration: values.duration,
        totalMarks: values.totalMarks,
        questions: questionsToSubmit,
        examPurpose: values.examPurpose || 'exam',
        isAllowUser: values.isAllowUser || 'everyone',
        maxAttempts: values.maxAttempts || 1,
        viewMark: values.viewMark !== undefined ? values.viewMark : 1,
        viewExamAndAnswer: values.viewExamAndAnswer !== undefined ? values.viewExamAndAnswer : 1,
        startTime: values.startTime ? values.startTime.toISOString() : undefined,
        endTime: values.endTime ? values.endTime.toISOString() : undefined
      };

      const result = await pdfExamService.createExamFromPdf(examData);
      
      console.log('Create exam result:', result);
      
      // Handle different response formats
      // Format 1: { ok: true, data: { exam: ... } }
      // Format 2: { exam: ... } (direct data)
      if (result && (result.ok === true || result.exam || result._id)) {
        const examData = result.data?.exam || result.exam || result;
        message.success(t('exams.examCreatedSuccess'));
        setCurrentStep(2);
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(examData);
          }
          handleModalClose();
        }, 2000);
      } else {
        const errorMsg = result?.message || result?.error?.message || result?.error || 'Creation failed';
        console.error('Create exam failed:', result);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || t('exams.createFailed');
      message.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleModalClose = () => {
    setCurrentStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setAllQuestions([]);
    setSelectedAnswers({});
    form.resetFields();
    if (onClose) {
      onClose();
    }
  };

  // Watch totalMarks from form to calculate marks per question
  const totalMarks = Form.useWatch('totalMarks', form);
  const marksPerQuestion = totalMarks && allQuestions.length > 0
    ? parseFloat((totalMarks / allQuestions.length).toFixed(2))
    : 0;

  return (
    <Modal
      title={t('exams.uploadPdfExam')}
      open={open}
      onCancel={handleModalClose}
      width={1000}
      footer={null}
      destroyOnHidden
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title={t('exams.uploadFile')} icon={<FileOutlined />} />
        <Step title={t('exams.reviewQuestions')} icon={<CheckCircleOutlined />} />
        <Step title={t('exams.complete')} icon={<CheckCircleOutlined />} />
      </Steps>

      {/* Step 1: Upload PDF */}
      {currentStep === 0 && (
        <div>
          <Dragger
            name="file"
            multiple={false}
            accept=".pdf"
            beforeUpload={beforeUpload}
            onChange={handleFileChange}
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('exams.clickOrDragPdf')}</p>
            <p className="ant-upload-hint">
              {t('exams.pdfUploadHint')}
            </p>
          </Dragger>

          {uploadedFile && !parsing && (
            <Alert
              message={t('exams.fileReady')}
              description={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`}
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {parsing && (
            <Alert
              message={t('exams.parsingInProgress') || 'Đang xử lý PDF...'}
              description={t('exams.parsingHint') || 'AI đang trích xuất câu hỏi từ PDF. Quá trình này có thể mất 1-2 phút đối với file lớn. Vui lòng đợi...'}
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalClose} disabled={parsing}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="primary" 
                onClick={handleParsePdf}
                loading={parsing}
                disabled={!uploadedFile || parsing}
              >
                {parsing ? t('exams.parsing') : t('exams.parsePdf')}
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* Step 2: Review & Confirm */}
      {currentStep === 1 && parsedData && (
        <div>
          <Alert
            message={t('exams.reviewInstructions')}
            description={t('exams.reviewInstructionsDesc')}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateExam}
            initialValues={{
              duration: 60,
              totalMarks: parsedData.totalQuestions || 100,
              examPurpose: 'exam',
              isAllowUser: 'everyone',
              maxAttempts: 1,
              viewMark: 1,
              viewExamAndAnswer: 1,
              startTime: null,
              endTime: null
            }}
          >
            <Form.Item
              name="examName"
              label={t('exams.name')}
              rules={[{ required: true, message: t('exams.nameRequired') }]}
            >
              <Input placeholder={parsedData.filename?.replace('.pdf', '')} />
            </Form.Item>

            <Form.Item
              name="examDescription"
              label={t('exams.description')}
            >
              <Input.TextArea rows={2} />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                name="subjectId"
                label={t('exams.subject')}
                rules={[{ required: true, message: t('exams.pleaseSelectSubject') }]}
              >
                <Select 
                  style={{ width: 200 }} 
                  placeholder={t('exams.selectSubject')}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {subjects?.map(subject => (
                    <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                      {subject.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="duration"
                label={t('exams.duration')}
                rules={[{ required: true, message: t('exams.pleaseEnterDuration') }]}
              >
                <InputNumber min={1} style={{ width: 120 }} addonAfter={t('exams.minutes')} />
              </Form.Item>

              <Form.Item
                name="totalMarks"
                label={t('exams.totalMarks')}
                rules={[{ required: true, message: t('exams.pleaseEnterTotalMarks') }]}
              >
                <InputNumber min={1} style={{ width: 120 }} />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%', marginTop: 16 }} size="large">
              <Form.Item
                name="examPurpose"
                label={t('exams.examPurpose')}
                rules={[{ required: true, message: t('exams.examPurposeRequired') }]}
              >
                <Select style={{ width: 150 }}>
                  <Option value="exam">{t('exams.purposeExam')}</Option>
                  <Option value="practice">{t('exams.purposePractice')}</Option>
                  <Option value="quiz">{t('exams.purposeQuiz')}</Option>
                  <Option value="assignment">{t('exams.purposeAssignment')}</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="isAllowUser"
                label={t('exams.isAllowUser')}
                rules={[{ required: true, message: t('exams.isAllowUserRequired') }]}
              >
                <Select style={{ width: 150 }}>
                  <Option value="everyone">{t('exams.allowEveryone')}</Option>
                  <Option value="class">{t('exams.allowClass')}</Option>
                  <Option value="student">{t('exams.allowStudent')}</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="maxAttempts"
                label={t('exams.maxAttempts')}
                rules={[
                  { required: true, message: t('exams.maxAttemptsRequired') },
                  { type: 'number', min: 1, message: t('exams.maxAttemptsMin') }
                ]}
              >
                <InputNumber min={1} style={{ width: 120 }} />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%', marginTop: 16 }} size="large">
              <Form.Item
                name="viewMark"
                label={t('exams.viewMark')}
                rules={[{ required: true, message: t('exams.viewMarkRequired') }]}
              >
                <Select style={{ width: 200 }}>
                  <Option value={0}>{t('exams.viewMarkNever')}</Option>
                  <Option value={1}>{t('exams.viewMarkAfterCompletion')}</Option>
                  <Option value={2}>{t('exams.viewMarkAfterAllFinish')}</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="viewExamAndAnswer"
                label={t('exams.viewExamAndAnswer')}
                rules={[{ required: true, message: t('exams.viewExamAndAnswerRequired') }]}
              >
                <Select style={{ width: 200 }}>
                  <Option value={0}>{t('exams.viewExamNever')}</Option>
                  <Option value={1}>{t('exams.viewExamAfterCompletion')}</Option>
                  <Option value={2}>{t('exams.viewExamAfterAllFinish')}</Option>
                </Select>
              </Form.Item>
            </Space>

            <Space style={{ width: '100%', marginTop: 16 }} size="large">
              <Form.Item
                name="startTime"
                label={t('exams.startTime')}
                rules={[{ required: true, message: t('exams.startTimeRequired') }]}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: 200 }}
                  placeholder={t('exams.selectStartTime')}
                />
              </Form.Item>

              <Form.Item
                name="endTime"
                label={t('exams.endTime')}
                rules={[
                  { required: true, message: t('exams.endTimeRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || !getFieldValue('startTime')) {
                        return Promise.resolve();
                      }
                      if (value.isBefore(getFieldValue('startTime'))) {
                        return Promise.reject(new Error(t('exams.endTimeMustBeAfterStartTime')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: 200 }}
                  placeholder={t('exams.selectEndTime')}
                />
              </Form.Item>
            </Space>
          </Form>

          <Card 
            title={
              <Space>
                <span>{t('exams.questions')} ({allQuestions.length})</span>
              </Space>
            }
            style={{ marginTop: 16, maxHeight: '60vh', overflowY: 'auto' }}
          >
            {allQuestions.length === 0 ? (
              <Alert message={t('exams.noDataToCreate')} type="warning" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {allQuestions.map((question, index) => (
                  <Card
                    key={question.questionNumber || index}
                    size="small"
                    style={{
                      border: '1px solid #d9d9d9',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space>
                          <strong>
                            {t('exams.question')} {question.questionNumber}:
                          </strong>
                          <Tag color={question.type === 'multiple-choice' ? 'blue' : 'orange'}>
                            {question.type === 'multiple-choice' ? t('exams.multipleChoice') : t('exams.essay')}
                          </Tag>
                        </Space>
                        {marksPerQuestion > 0 && (
                          <Tag color="purple">
                            {marksPerQuestion} {t('exams.marks')}
                          </Tag>
                        )}
                      </div>
                      <div style={{ marginTop: 8, marginBottom: 12 }}>
                        {question.questionText}
                      </div>
                    </div>
                    
                    {question.answers && question.answers.length > 0 && (
                      <>
                        <Divider style={{ margin: '12px 0' }} />
                        
                        <div>
                          <Radio.Group
                            value={selectedAnswers[question.questionNumber]}
                            onChange={(e) => handleAnswerChange(question.questionNumber, e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              {question.answers.map((answer) => {
                                const answerKey = answer.key || answer.letter;
                                const isSelected = selectedAnswers[question.questionNumber] === answerKey;
                                const isAICorrect = answer.isCorrect === true;
                                
                                return (
                                  <Radio key={answerKey} value={answerKey}>
                                    <Space>
                                      <Tag color={isSelected ? 'blue' : (isAICorrect ? 'green' : 'default')}>
                                        {answerKey}
                                      </Tag>
                                      <span>{answer.text}</span>
                                      {isAICorrect && !isSelected && (
                                        <Tag color="green" style={{ fontSize: 11 }}>
                                          AI ✓
                                        </Tag>
                                      )}
                                    </Space>
                                  </Radio>
                                );
                              })}
                            </Space>
                          </Radio.Group>
                        </div>
                      </>
                    )}

                    {question.explanation && (
                      <>
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{ 
                          backgroundColor: '#e6f7ff', 
                          padding: '12px', 
                          borderRadius: '4px',
                          borderLeft: '3px solid #1890ff'
                        }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            marginBottom: 8, 
                            color: '#1890ff',
                            fontSize: '13px'
                          }}>
                            {t('questions.explanation')}:
                          </div>
                          <div style={{ 
                            fontSize: '13px',
                            color: '#595959',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            lineHeight: '1.6'
                          }}>
                            {question.explanation}
                          </div>
                        </div>
                      </>
                    )}
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCurrentStep(0)}>
                {t('common.back')}
              </Button>
              <Button 
                type="primary" 
                onClick={() => form.submit()}
                loading={creating}
              >
                {creating ? t('exams.creating') : t('exams.createExam')}
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 2 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
          <h2 style={{ marginTop: 24 }}>{t('exams.examCreatedSuccessfully')}</h2>
          <p>{t('exams.redirectingMessage')}</p>
          <Progress percent={100} status="success" style={{ marginTop: 24 }} />
        </div>
      )}
    </Modal>
  );
};

UploadPdfModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  subjects: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string
  }))
};

export default UploadPdfModal;

