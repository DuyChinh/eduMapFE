import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Select, InputNumber, Switch, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';

const { TextArea } = Input;
const { Option } = Select;

const EditQuestionModal = ({ visible, questionData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [questionType, setQuestionType] = useState('mcq');
  const { t } = useTranslation();

  useEffect(() => {
    if (visible && questionData) {
      setQuestionType(questionData.type);
      form.setFieldsValue({
        type: questionData.type,
        text: questionData.text,
        choices: questionData.choices || [],
        answer: questionData.answer,
        tags: questionData.tags?.join(', ') || '',
        level: questionData.level,
        isPublic: questionData.isPublic
      });
    }
  }, [visible, questionData, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Process choices for MCQ questions
      let processedValues = { ...values };
      
      if (values.type === 'mcq' && values.choices) {
        processedValues.choices = values.choices
          .filter(choice => choice.key && choice.text)
          .map(choice => ({
            key: choice.key.toLowerCase(),
            text: choice.text
          }));
      }

      // Process tags
      if (values.tags) {
        processedValues.tags = values.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);
      }

      await questionService.updateQuestion(questionData.id, processedValues);
      message.success(t('questions.updateSuccess'));
      onSuccess();
    } catch (error) {
      message.error(t('questions.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setQuestionType('mcq');
    onCancel();
  };

  const handleTypeChange = (type) => {
    setQuestionType(type);
    form.setFieldsValue({ type });
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
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label={t('questions.type')}
          name="type"
          rules={[{ required: true, message: t('questions.typeRequired') }]}
        >
          <Select onChange={handleTypeChange}>
            <Option value="mcq">{t('questions.types.mcq')}</Option>
            <Option value="tf">{t('questions.types.tf')}</Option>
            <Option value="short">{t('questions.types.short')}</Option>
            <Option value="essay">{t('questions.types.essay')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('questions.text')}
          name="text"
          rules={[
            { required: true, message: t('questions.textRequired') },
            { min: 10, message: t('questions.textMinLength') }
          ]}
        >
          <TextArea rows={3} placeholder={t('questions.textPlaceholder')} />
        </Form.Item>

        {questionType === 'mcq' && (
          <Form.Item
            label={t('questions.choices')}
            name="choices"
            rules={[
              { required: true, message: t('questions.choicesRequired') },
              { type: 'array', min: 2, message: t('questions.choicesMinLength') }
            ]}
          >
            <Form.List name="choices">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: t('questions.choiceKeyRequired') }]}
                        style={{ width: 80 }}
                      >
                        <Input placeholder="A" maxLength={1} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'text']}
                        rules={[{ required: true, message: t('questions.choiceTextRequired') }]}
                        style={{ flex: 1 }}
                      >
                        <Input placeholder={t('questions.choiceTextPlaceholder')} />
                      </Form.Item>
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button 
                      type="dashed" 
                      onClick={() => add()} 
                      block 
                      icon={<PlusOutlined />}
                    >
                      {t('questions.addChoice')}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}

        <Form.Item
          label={t('questions.answer')}
          name="answer"
          rules={[{ required: true, message: t('questions.answerRequired') }]}
        >
          {questionType === 'tf' ? (
            <Select placeholder={t('questions.selectAnswer')}>
              <Option value={true}>{t('questions.true')}</Option>
              <Option value={false}>{t('questions.false')}</Option>
            </Select>
          ) : questionType === 'mcq' ? (
            <Input placeholder={t('questions.answerKeyPlaceholder')} />
          ) : (
            <TextArea rows={2} placeholder={t('questions.answerTextPlaceholder')} />
          )}
        </Form.Item>

        <Form.Item
          label={t('questions.tags')}
          name="tags"
          extra={t('questions.tagsHelp')}
        >
          <Input placeholder={t('questions.tagsPlaceholder')} />
        </Form.Item>

        <Space>
          <Form.Item
            label={t('questions.level')}
            name="level"
            rules={[{ required: true, message: t('questions.levelRequired') }]}
          >
            <InputNumber min={1} max={5} />
          </Form.Item>

          <Form.Item
            label={t('questions.isPublic')}
            name="isPublic"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>

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
