import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Select, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';
import MathJaxEditor from './MathJaxEditor';

const { TextArea } = Input;
const { Option } = Select;

const EditQuestionModal = ({ visible, questionData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [editData, setEditData] = useState({
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
  const { t } = useTranslation();

  // Fetch subjects on component mount
  useEffect(() => {
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
        console.error('❌ Error fetching subjects:', error);
        setSubjects([]);
      }
    };

    if (visible) {
      fetchSubjects();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && questionData) {
      // Process choices data
      let processedChoices = ['', '', '', ''];
      if (questionData.choices && Array.isArray(questionData.choices)) {
        // If choices is array of strings
        if (typeof questionData.choices[0] === 'string') {
          processedChoices = [...questionData.choices];
        } 
        // If choices is array of objects with text property
        else if (questionData.choices[0] && typeof questionData.choices[0] === 'object') {
          processedChoices = questionData.choices.map(choice => choice.text || '');
        }
      }
      
      // Ensure we have at least 4 choices
      while (processedChoices.length < 4) {
        processedChoices.push('');
      }
      
      const data = {
        name: questionData.name || '',
        text: questionData.text || '',
        type: questionData.type || 'mcq',
        level: questionData.level?.toString() || '1',
        subject: questionData.subject || '',
        choices: processedChoices,
        answer: questionData.type === 'mcq' ? 
          (typeof questionData.answer === 'number' ? questionData.answer : 
           typeof questionData.answer === 'string' ? parseInt(questionData.answer) : 0) : 
          questionData.answer || '',
        explanation: questionData.explanation || '',
        isPublic: questionData.isPublic !== undefined ? questionData.isPublic : true
      };
      setEditData(data);
      form.setFieldsValue(data);
    }
  }, [visible, questionData, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const questionId = questionData.id || questionData._id;
      if (!questionId) {
        message.error('Question ID not found');
        return;
      }

      const questionPayload = {
        ...values,
        choices: values.choices || editData.choices,
        // For MCQ, answer should be the index of the correct choice
        answer: values.type === 'mcq' ? values.answer : values.answer,
        isPublic: values.isPublic !== undefined ? values.isPublic : true // Default to public
      };


      await questionService.updateQuestion(questionId, questionPayload);
      message.success(t('questions.updateSuccess'));
      onSuccess();
    } catch (error) {
      console.error('❌ Error updating question:', error);
      message.error(t('questions.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Update edit data when form values change
  const handleFormChange = (changedValues, allValues) => {
    setEditData(prev => ({
      ...prev,
      ...allValues
    }));
  };

  // Handle choice changes
  const handleChoiceChange = (index, value) => {
    const newChoices = [...editData.choices];
    newChoices[index] = value;
    setEditData(prev => ({
      ...prev,
      choices: newChoices
    }));
    form.setFieldsValue({ choices: newChoices });
  };

  // Add new choice
  const addChoice = () => {
    const newChoices = [...editData.choices, ''];
    setEditData(prev => ({
      ...prev,
      choices: newChoices
    }));
    form.setFieldsValue({ choices: newChoices });
  };

  // Remove choice
  const removeChoice = (index) => {
    if (editData.choices.length > 2) {
      const newChoices = editData.choices.filter((_, i) => i !== index);
      setEditData(prev => ({
        ...prev,
        choices: newChoices
      }));
      form.setFieldsValue({ choices: newChoices });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t('questions.editQuestion')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={editData}
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
            value={editData.text}
            onChange={(value) => {
              setEditData(prev => ({ ...prev, text: value }));
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
        {editData.type === 'mcq' && (
          <Form.Item label={t('questions.choices')}>
            {editData.choices.map((choice, index) => (
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
                  {editData.choices.length > 2 && (
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
          {editData.type === 'mcq' ? (
            <Select placeholder={t('questions.selectAnswer')}>
              {editData.choices.map((choice, index) => (
                <Option key={index} value={index}>
                  {t('questions.choice')} {index + 1}
                </Option>
              ))}
            </Select>
          ) : (
            <MathJaxEditor
              value={editData.answer}
              onChange={(value) => {
                setEditData(prev => ({ ...prev, answer: value }));
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
            value={editData.explanation}
            onChange={(value) => {
              setEditData(prev => ({ ...prev, explanation: value }));
              form.setFieldsValue({ explanation: value });
            }}
            placeholder={t('questions.explanationPlaceholder')}
            rows={3}
            showPreview={true}
            showToolbar={true}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('questions.update')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditQuestionModal;
