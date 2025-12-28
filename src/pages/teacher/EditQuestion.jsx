import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Space,
  message,
  Divider,
  Radio,
  InputNumber,
  Spin,
  Upload
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  FunctionOutlined,
  LoadingOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';
import uploadService from '../../api/uploadService';
import { ROUTES } from '../../constants/config';
import QuestionPreview from '../../components/teacher/QuestionPreview';
import MathJaxEditor from '../../components/teacher/MathJaxEditor';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EditQuestion = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [questionData, setQuestionData] = useState({
    name: '',
    text: '',
    type: 'mcq',
    level: '1',
    subject: '',
    choices: ['', '', '', ''],
    answer: '',
    explanation: '',
    isPublic: true,
    images: [] // Changed from single image string to images array
  });
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { questionId } = useParams();

  // Fetch question data by ID
  useEffect(() => {
    const fetchQuestionData = async () => {
      if (!questionId) {
        message.error('Question ID not found');
        navigate(ROUTES.TEACHER_QUESTIONS);
        return;
      }

      try {
        setInitialLoading(true);
        let response = await questionService.getQuestionById(questionId);
        response = response?.data;
        let processedChoices = ['', '', '', ''];
        let answerIndex = 0;

        if (response.choices && Array.isArray(response.choices)) {
          // If choices is array of strings
          if (typeof response.choices[0] === 'string') {
            processedChoices = [...response.choices];
          }
          // If choices is array of objects with text property
          else if (response.choices[0] && typeof response.choices[0] === 'object') {
            // Keep full object structure
            processedChoices = response.choices.map(choice => ({
              text: choice.text || '',
              image: choice.image || ''
            }));

            // Find answer index by matching answer key with choice key
            if (response.type === 'mcq' && response.answer) {
              const answerKey = response.answer.toString().toUpperCase();
              const foundIndex = response.choices.findIndex(choice =>
                choice.key && choice.key.toUpperCase() === answerKey
              );
              answerIndex = foundIndex >= 0 ? foundIndex : 0;
            }
          }
        }

        // Ensure we have at least 4 choices
        while (processedChoices.length < 4) {
          processedChoices.push('');
        }

        const data = {
          name: response.name || '',
          text: response.text || '',
          images: (response.images && response.images.length > 0) ? response.images : (response.image ? [response.image] : []),
          type: response.type || 'mcq',
          level: response.level?.toString() || '1',
          subject: response.subjectId?._id || response.subject || '',
          choices: processedChoices,
          answer: response.type === 'mcq' ? answerIndex : response.answer || '',
          explanation: response.explanation || '',
          isPublic: response.isPublic !== undefined ? response.isPublic : true
        };

        setQuestionData(data);

        // Reset form first, then set values
        form.resetFields();
        form.setFieldsValue(data);

      } catch (error) {
        console.error('❌ Error fetching question:', error);
        message.error('Failed to load question data');
        navigate(ROUTES.TEACHER_QUESTIONS);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchQuestionData();
  }, [questionId, navigate, form]);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const currentLang = localStorage.getItem('language') || 'vi';

        const response = await questionService.getSubjects({ lang: currentLang });

        // Handle different response structures
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
        console.error('❌ Error fetching subjects:', error);
        message.error('Failed to load subjects');
        setSubjects([]); // Set empty array on error
      }
    };

    fetchSubjects();
  }, []); // Keep empty dependency array for initial load only

  // Function to refetch subjects when language changes
  const refetchSubjects = async () => {
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
      console.error('❌ Error refetching subjects:', error);
      message.error('Failed to reload subjects');
    }
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      refetchSubjects();
    };

    // Listen for storage changes (language changes)
    window.addEventListener('storage', handleLanguageChange);

    // Also listen for custom language change events
    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleLanguageChange);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const [previewKey, setPreviewKey] = useState(0);

  // Get current form values for preview
  const getCurrentFormData = () => {
    const formValues = form.getFieldsValue();
    return {
      name: formValues.name || questionData.name,
      text: formValues.text || questionData.text,
      type: formValues.type || questionData.type,
      level: formValues.level || questionData.level,
      subject: formValues.subject || questionData.subject,
      choices: formValues.choices || questionData.choices,
      answer: formValues.answer !== undefined ? formValues.answer : questionData.answer,
      explanation: formValues.explanation || questionData.explanation,
      isPublic: formValues.isPublic !== undefined ? formValues.isPublic : questionData.isPublic,
      images: questionData.images
    };
  };

  const handleFormChange = (changedValues, allValues) => {
    setQuestionData(prev => ({
      ...prev,
      ...allValues
    }));
    // Trigger preview re-render
    setPreviewKey(prev => prev + 1);
  };

  // Handle choice changes
  const handleChoiceTextChange = (index, value) => {
    const newChoices = [...questionData.choices];
    newChoices[index] = { ...newChoices[index], text: value };
    setQuestionData(prev => ({
      ...prev,
      choices: newChoices
    }));
    setPreviewKey(prev => prev + 1);
  };

  const handleChoiceImageUpload = async (index, { file, onSuccess, onError }) => {
    try {
      const response = await uploadService.uploadImage(file);
      if (response && response.data && response.data.url) {
        const imageUrl = response.data.url;
        const newChoices = [...questionData.choices];
        newChoices[index] = { ...newChoices[index], image: imageUrl };
        setQuestionData(prev => ({
          ...prev,
          choices: newChoices
        }));
        onSuccess(null, file);
        message.success('Choice image uploaded');
        setPreviewKey(prev => prev + 1);
      } else {
        onError(new Error('Upload failed'));
      }
    } catch (error) {
      onError(error);
      message.error('Upload failed');
    }
  };

  const removeChoiceImage = (index) => {
    const newChoices = [...questionData.choices];
    newChoices[index] = { ...newChoices[index], image: '' };
    setQuestionData(prev => ({
      ...prev,
      choices: newChoices
    }));
    setPreviewKey(prev => prev + 1);
  };

  // Add new choice
  const addChoice = () => {
    const newChoices = [...questionData.choices, ''];
    setQuestionData(prev => ({
      ...prev,
      choices: newChoices
    }));
    form.setFieldsValue({ choices: newChoices });
  };

  // Remove choice
  const removeChoice = (index) => {
    if (questionData.choices.length > 2) {
      const newChoices = questionData.choices.filter((_, i) => i !== index);
      setQuestionData(prev => ({
        ...prev,
        choices: newChoices
      }));
    }
  };

  // Handle question images upload
  const handleQuestionImagesUpload = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);
      const response = await uploadService.uploadImage(file);
      if (response && response.data && response.data.url) {
        const imageUrl = response.data.url;
        setQuestionData(prev => ({
          ...prev,
          images: [...(prev.images || []), imageUrl]
        }));
        onSuccess(null, file);
        message.success('Image uploaded successfully');
        setPreviewKey(prev => prev + 1);
      } else {
        onError(new Error('Upload failed'));
        message.error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError(error);
      message.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeQuestionImage = (indexToRemove) => {
    setQuestionData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
    setPreviewKey(prev => prev + 1);
  };

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('You can only upload JPG/PNG file!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Image must be smaller than 2MB!');
    }
    return isJpgOrPng && isLt2M;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setLoading(true);

      // Prepare question data for API
      const questionPayload = {
        ...values,
        isPublic: values.isPublic !== undefined ? values.isPublic : true // Default to public
      };

      // Process choices for MCQ
      if (values.type === 'mcq') {
        const answerKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        questionPayload.choices = questionData.choices.map((choice, index) => ({
          key: answerKeys[index],
          text: choice.text,
          image: choice.image
        }));

        // Convert answer index to key for MCQ
        if (typeof values.answer === 'number') {
          questionPayload.answer = answerKeys[values.answer] || 'A';
        }
      } else {
        // For other types, currently storing text only or same structure if needed
        questionPayload.choices = questionData.choices.map(c => c.text);
      }

      // Add images
      questionPayload.images = questionData.images;
      // Remove legacy single image
      delete questionPayload.image;

      await questionService.updateQuestion(questionId, questionPayload);

      message.success(t('questions.updateSuccess'));
      navigate(ROUTES.TEACHER_QUESTIONS);
    } catch (error) {
      console.error('❌ Error updating question:', error);
      if (error.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        const errorMessage = typeof error === 'string' ? error : (error?.message || t('questions.updateFailed'));
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(ROUTES.TEACHER_QUESTIONS)}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {t('questions.editQuestion')}
          </Title>
        </Space>
      </Card>

      <Row gutter={24}>
        {/* Left Column - Form */}
        <Col xs={24} lg={14}>
          <Card title={t('questions.questionForm')} style={{ marginBottom: '24px' }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
            >
              {/* Question Name */}
              <Form.Item
                label={t('questions.name')}
                name="name"
                rules={[
                  { required: true, message: t('questions.nameRequired') },
                  { min: 3, message: t('questions.nameMinLength') },
                  { max: 100, message: t('questions.nameMaxLength') }
                ]}
              >
                <Input
                  placeholder={t('questions.namePlaceholder')}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              {/* Question Text */}
              <Form.Item
                label={t('questions.text')}
                name="text"
                rules={[
                  { required: true, message: t('questions.textRequired') },
                  { min: 10, message: t('questions.textMinLength') }
                ]}
              >
                <MathJaxEditor
                  value={form.getFieldValue('text') || questionData.text}
                  onChange={(value) => {
                    setQuestionData(prev => ({ ...prev, text: value }));
                    form.setFieldsValue({ text: value });
                  }}
                  placeholder={t('questions.textPlaceholder')}
                  rows={4}
                  showPreview={true}
                  showToolbar={true}
                />
              </Form.Item>



              {/* Question Images */}
              <Form.Item label={t('questions.images') || "Images"}>
                <div style={{ marginBottom: 16 }}>
                  <Upload
                    name="image"
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    customRequest={handleQuestionImagesUpload}
                    beforeUpload={beforeUpload}
                  >
                    <div>
                      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </div>

                {/* Image Gallery */}
                {questionData.images && questionData.images.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {questionData.images.map((imgUrl, index) => (
                      <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid #d9d9d9', padding: '4px', borderRadius: '4px' }}>
                        <img
                          src={imgUrl}
                          alt={`Question ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            background: 'var(--component-background)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            zIndex: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onClick={() => removeQuestionImage(index)}
                        >
                          <DeleteOutlined style={{ color: 'red', fontSize: '16px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>

              {/* Question Type */}
              <Form.Item
                label={t('questions.type')}
                name="type"
                rules={[{ required: true, message: t('questions.typeRequired') }]}
              >
                <Select placeholder={t('questions.selectType')}>
                  <Option value="mcq">{t('questions.typeMCQ')}</Option>
                  <Option value="tf">{t('questions.typeTF')}</Option>
                  <Option value="short">{t('questions.typeShort')}</Option>
                  <Option value="essay">{t('questions.typeEssay')}</Option>
                </Select>
              </Form.Item>

              {/* Subject */}
              <Form.Item
                label={t('questions.subject')}
                name="subject"
                rules={[{ required: true, message: t('questions.subjectRequired') }]}
              >
                <Select
                  placeholder={t('questions.selectSubject')}
                  loading={subjects.length === 0}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="children"
                  notFoundContent={t('questions.noSubjectsFound')}
                  style={{ width: '100%' }}
                >
                  {Array.isArray(subjects) && subjects.map(subject => (
                    <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                      {subject.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Difficulty Level */}
              <Form.Item
                label={t('questions.level')}
                name="level"
                rules={[{ required: true, message: t('questions.levelRequired') }]}
              >
                <Select placeholder={t('questions.selectLevel')}>
                  <Option value="1">1 - {t('questions.level1')}</Option>
                  <Option value="2">2 - {t('questions.level2')}</Option>
                  <Option value="3">3 - {t('questions.level3')}</Option>
                  <Option value="4">4 - {t('questions.level4')}</Option>
                  <Option value="5">5 - {t('questions.level5')}</Option>
                </Select>
              </Form.Item>

              {/* Status */}
              <Form.Item
                label={t('questions.status')}
                name="isPublic"
                rules={[{ required: true, message: t('questions.statusRequired') }]}
              >
                <Select placeholder={t('questions.selectStatus')}>
                  <Option value={true}>{t('common.public')}</Option>
                  <Option value={false}>{t('common.private')}</Option>
                </Select>
              </Form.Item>

              {/* Choices (for MCQ) */}
              {questionData.type === 'mcq' && (
                <Form.Item label={t('questions.choices')}>
                  {questionData.choices.map((choice, index) => (
                    <div key={index} style={{ marginBottom: '16px', border: '1px solid #f0f0f0', padding: '12px', borderRadius: '8px' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>{t('questions.choice')} {index + 1}</Text>
                          {questionData.choices.length > 2 && (
                            <Button
                              icon={<DeleteOutlined />}
                              onClick={() => removeChoice(index)}
                              danger
                              size="small"
                            />
                          )}
                        </div>

                        <div style={{ display: 'flex', width: '100%', gap: '16px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <MathJaxEditor
                              value={choice.text}
                              onChange={(value) => handleChoiceTextChange(index, value)}
                              placeholder={`${t('questions.choice')} ${index + 1}`}
                              rows={2}
                              showPreview={false}
                              showToolbar={false}
                            />
                          </div>

                          <div style={{ flexShrink: 0, marginTop: '2px' }}>
                            <Upload
                              name="choiceImage"
                              listType="picture-card"
                              showUploadList={false}
                              customRequest={(options) => handleChoiceImageUpload(index, options)}
                              beforeUpload={beforeUpload}
                              style={{ width: '40px', height: '40px', margin: 0 }}
                              className="compact-uploader"
                            >
                              {choice.image ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                  <img
                                    src={choice.image}
                                    alt="choice"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: -4,
                                      right: -4,
                                      background: 'var(--component-background)',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      zIndex: 1,
                                      padding: '2px',
                                      lineHeight: 0,
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeChoiceImage(index);
                                    }}
                                  >
                                    <DeleteOutlined style={{ color: 'red', fontSize: '10px' }} />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  {uploading && false ? <LoadingOutlined /> : <PlusOutlined style={{ fontSize: '16px', color: '#999' }} />}
                                </div>
                              )}
                            </Upload>
                          </div>
                        </div>
                      </Space>
                    </div>
                  ))}
                  <Button
                    icon={<PlusOutlined />}
                    onClick={addChoice}
                    type="dashed"
                    style={{ width: '100%' }}
                  >
                    {t('questions.addChoice')}
                  </Button>
                </Form.Item>
              )}

              {/* Answer */}
              <Form.Item
                label={t('questions.answer')}
                name="answer"
                rules={[{ required: true, message: t('questions.answerRequired') }]}
              >
                {questionData.type === 'mcq' ? (
                  <Select placeholder={t('questions.selectAnswer')}>
                    {questionData.choices.map((choice, index) => (
                      <Option key={index} value={index}>
                        {t('questions.choice')} {index + 1}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <MathJaxEditor
                    value={form.getFieldValue('answer') || questionData.answer}
                    onChange={(value) => {
                      setQuestionData(prev => ({ ...prev, answer: value }));
                      form.setFieldsValue({ answer: value });
                    }}
                    placeholder={t('questions.answerPlaceholder')}
                    rows={3}
                    showPreview={true}
                    showToolbar={true}
                  />
                )}
              </Form.Item>

              {/* Explanation */}
              <Form.Item
                label={t('questions.explanation')}
                name="explanation"
              >
                <MathJaxEditor
                  value={form.getFieldValue('explanation') || questionData.explanation}
                  onChange={(value) => {
                    setQuestionData(prev => ({ ...prev, explanation: value }));
                    form.setFieldsValue({ explanation: value });
                  }}
                  placeholder={t('questions.explanationPlaceholder')}
                  rows={3}
                  showPreview={false}
                  showToolbar={true}
                />
              </Form.Item>

              {/* Action Buttons */}
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSubmit}
                    loading={loading}
                    size="large"
                  >
                    {t('questions.update')}
                  </Button>
                  <Button
                    onClick={() => navigate(ROUTES.TEACHER_QUESTIONS)}
                    size="large"
                  >
                    {t('common.cancel')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right Column - Preview */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <EyeOutlined />
                {t('questions.preview')}
              </Space>
            }
            style={{ position: 'sticky', top: '24px' }}
          >
            <QuestionPreview key={previewKey} questionData={getCurrentFormData()} subjects={subjects} />
          </Card>
        </Col>
      </Row>
    </div >
  );
};

export default EditQuestion;
