import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import classService from '../../api/classService';

const EditClassModal = ({ visible, classData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // Generate current academic year (e.g., 2025-2026)
  const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
  };

  useEffect(() => {
    if (visible && classData) {
      form.setFieldsValue({
        name: classData.name,
        academicYear: classData.metadata?.academicYear || ''
      });
    }
  }, [visible, classData, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await classService.updateClass(classData._id, {
        name: values.name,
        metadata: {
          ...classData.metadata,
          academicYear: values.academicYear
        }
      });
      message.success(t('classes.updateSuccess'));
      onSuccess();
    } catch (error) {
      console.error('Update class error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || t('classes.updateFailed'));
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t('classes.editClass')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label={t('classes.name')}
          name="name"
          rules={[
            { required: true, message: t('classes.nameRequired') },
            { min: 2, message: t('classes.nameMinLength') },
            { max: 100, message: t('classes.nameMaxLength') }
          ]}
        >
          <Input placeholder={t('classes.namePlaceholder')} />
        </Form.Item>

        <Form.Item
          label={t('classes.academicYear')}
          name="academicYear"
          rules={[
            { pattern: /^\d{4}-\d{4}$/, message: t('classes.academicYearFormat') }
          ]}
        >
          <Input placeholder={getCurrentAcademicYear()} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('classes.update')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditClassModal;
