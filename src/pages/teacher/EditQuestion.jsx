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
  Spin
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  FunctionOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';
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
    isPublic: true
  });
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
        const response = await questionService.getQuestionById(questionId);
        console.log('📝 EditQuestion - fetched question data:', response);
        
        // Process choices data
        let processedChoices = ['', '', '', ''];
        let answerIndex = 0;
        
        if (response.choices && Array.isArray(response.choices)) {
          // If choices is array of strings
          if (typeof response.choices[0] === 'string') {
            processedChoices = [...response.choices];
          } 
          // If choices is array of objects with text property
          else if (response.choices[0] && typeof response.choices[0] === 'object') {
            processedChoices = response.choices.map(choice => choice.text || '');
            
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
          type: response.type || 'mcq',
          level: response.level?.toString() || '1',
          subject: response.subject || '',
          choices: processedChoices,
          answer: response.type === 'mcq' ? answerIndex : response.answer || '',
          explanation: response.explanation || '',
          isPublic: response.isPublic !== undefined ? response.isPublic : true
        };
        
        console.log('📝 EditQuestion - processed data:', data);
        setQuestionData(data);
        
        // Reset form first, then set values
        form.resetFields();
        form.setFieldsValue(data);
        
        // Debug: Check form values after setting
        setTimeout(() => {
          console.log('📝 EditQuestion - form values after setFieldsValue:', form.getFieldsValue());
        }, 100);
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
        console.log('🌐 Current language:', currentLang);
        
        const response = await questionService.getSubjects({ lang: currentLang });
        console.log('📚 Subjects response:', response);
        
        // Handle different response structures
        let subjectsData = [];
        if (Array.isArray(response)) {
          subjectsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          subjectsData = response.data;
        } else if (response.items && Array.isArray(response.items)) {
          subjectsData = response.items;
        }
        
        console.log('📚 Processed subjects:', subjectsData);
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
      console.log('🌐 Refetching subjects with language:', currentLang);
      
      const response = await questionService.getSubjects({ lang: currentLang });
      console.log('📚 Refetched subjects response:', response);
      
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

  // Listen for language changes and refetch subjects
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
      isPublic: formValues.isPublic !== undefined ? formValues.isPublic : questionData.isPublic
    };
  };

  // Update question data when form values change
  const handleFormChange = (changedValues, allValues) => {
    console.log('📝 Form changed:', changedValues, allValues);
    setQuestionData(prev => ({
      ...prev,
      ...allValues
    }));
    // Trigger preview re-render
    setPreviewKey(prev => prev + 1);
  };

  // Handle choice changes
  const handleChoiceChange = (index, value) => {
    const newChoices = [...questionData.choices];
    newChoices[index] = value;
    setQuestionData(prev => ({
      ...prev,
      choices: newChoices
    }));
    form.setFieldsValue({ choices: newChoices });
    // Trigger preview re-render
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
      form.setFieldsValue({ choices: newChoices });
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('📤 Submitting question:', values);

      setLoading(true);
      
      // Prepare question data for API
      const questionPayload = {
        ...values,
        isPublic: values.isPublic !== undefined ? values.isPublic : true // Default to public
      };

      // Process choices for MCQ
      if (values.type === 'mcq') {
        const answerKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        questionPayload.choices = (values.choices || questionData.choices).map((text, index) => ({
          key: answerKeys[index],
          text: text
        }));
        
        // Convert answer index to key for MCQ
        if (typeof values.answer === 'number') {
          questionPayload.answer = answerKeys[values.answer] || 'A';
        }
      } else {
        questionPayload.choices = values.choices || questionData.choices;
      }

      await questionService.updateQuestion(questionId, questionPayload);
      console.log('✅ Question updated successfully');
      
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
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
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
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <div style={{ flex: 1 }}>
                          <MathJaxEditor
                            value={choice}
                            onChange={(value) => handleChoiceChange(index, value)}
                            placeholder={`${t('questions.choice')} ${index + 1}`}
                            rows={2}
                            showPreview={false}
                            showToolbar={false}
                          />
                        </div>
                        {questionData.choices.length > 2 && (
                          <Button 
                            icon={<DeleteOutlined />} 
                            onClick={() => removeChoice(index)}
                            danger
                            style={{ marginLeft: '8px' }}
                          />
                        )}
                      </Space.Compact>
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
                  showPreview={true}
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
    </div>
  );
};

export default EditQuestion;
