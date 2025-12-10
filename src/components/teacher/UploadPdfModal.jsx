import React, { useState } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  Steps, 
  message, 
  Form, 
  Input, 
  InputNumber,
  Select,
  Space,
  Progress,
  Alert,
  Pagination
} from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import pdfExamService from '../../api/pdfExamService';
import PdfOverlayViewer from './PdfOverlayViewer';

const { Dragger } = Upload;
const { Step } = Steps;
const { Option } = Select;

const UploadPdfModal = ({ open, onClose, onSuccess, subjects, grades }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionUpdates, setQuestionUpdates] = useState({});

  const handleFileChange = (info) => {
    const { file } = info;
    
    // Since beforeUpload returns false, we handle the file immediately
    if (file.originFileObj) {
      setUploadedFile(file.originFileObj);
      setUploading(false);
      message.success(t('exams.fileUploaded'));
    } else if (file instanceof File) {
      setUploadedFile(file);
      setUploading(false);
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

  const handleQuestionUpdate = (questionNumber, updates) => {
    setQuestionUpdates(prev => ({
      ...prev,
      [questionNumber]: {
        ...(prev[questionNumber] || {}),
        ...updates
      }
    }));
  };

  const handleCreateExam = async (values) => {
    if (!parsedData || !parsedData.pages) {
      message.error(t('exams.noDataToCreate'));
      return;
    }

    setCreating(true);
    try {
      // Collect all questions from all pages
      const allQuestions = [];
      parsedData.pages.forEach(page => {
        page.questions.forEach(q => {
          const updates = questionUpdates[q.questionNumber] || {};
          
          allQuestions.push({
            questionNumber: q.questionNumber,
            questionText: updates.questionText || q.questionText,
            answers: q.answers.map(ans => ({
              key: ans.key,
              text: updates.answers?.[ans.key] || ans.text
            })),
            correctAnswer: updates.correctAnswer || q.answers[0]?.key,
            level: 1,
            tags: []
          });
        });
      });

      // Create exam
      const examData = {
        examName: values.examName,
        examDescription: values.examDescription || '',
        subjectId: values.subjectId,
        gradeId: values.gradeId,
        duration: values.duration,
        totalMarks: values.totalMarks,
        questions: allQuestions
      };

      const result = await pdfExamService.createExamFromPdf(examData);
      
      if (result.ok) {
        message.success(t('exams.examCreatedSuccess'));
        setCurrentStep(2);
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(result.data.exam);
          }
          handleModalClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Creation failed');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      message.error(error.message || t('exams.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleModalClose = () => {
    setCurrentStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setQuestionUpdates({});
    setCurrentPage(1);
    form.resetFields();
    if (onClose) {
      onClose();
    }
  };

  const getCurrentPageData = () => {
    if (!parsedData || !parsedData.pages || parsedData.pages.length === 0) {
      return null;
    }
    return parsedData.pages[currentPage - 1];
  };

  return (
    <Modal
      title={t('exams.uploadPdfExam')}
      open={open}
      onCancel={handleModalClose}
      width={1000}
      footer={null}
      destroyOnClose
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

          {uploadedFile && (
            <Alert
              message={t('exams.fileReady')}
              description={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`}
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalClose}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="primary" 
                onClick={handleParsePdf}
                loading={parsing}
                disabled={!uploadedFile}
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
              totalMarks: parsedData.totalQuestions || 100
            }}
          >
            <Form.Item
              name="examName"
              label={t('exams.examName')}
              rules={[{ required: true, message: t('exams.pleaseEnterExamName') }]}
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
                <Select style={{ width: 200 }} placeholder={t('exams.selectSubject')}>
                  {subjects?.map(subject => (
                    <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                      {subject.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="gradeId"
                label={t('exams.grade')}
              >
                <Select style={{ width: 150 }} placeholder={t('exams.selectGrade')} allowClear>
                  {grades?.map(grade => (
                    <Option key={grade._id || grade.id} value={grade._id || grade.id}>
                      {grade.name}
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
          </Form>

          {/* Page Navigation */}
          {parsedData.totalPages > 1 && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Pagination
                current={currentPage}
                total={parsedData.totalPages}
                pageSize={1}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          )}

          {/* PDF Overlay Viewer */}
          <PdfOverlayViewer 
            pageData={getCurrentPageData()}
            onQuestionUpdate={handleQuestionUpdate}
          />

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

export default UploadPdfModal;

