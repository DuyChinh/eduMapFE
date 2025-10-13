import { useState } from 'react';
import { Modal, Form, Input, Button, message, Alert, Divider, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import classService from '../../api/classService';

const { TextArea } = Input;

const AddStudentsModal = ({ visible, classData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Parse student emails from textarea
      const emails = values.studentEmails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      const response = await classService.addStudentsBulk(classData._id, {
        studentEmails: emails
      });

      // Show report
      const { report } = response;
      if (report.added.length > 0) {
        message.success(`${t('classes.studentsAdded')}: ${report.added.length}`);
      }
      if (report.already.length > 0) {
        message.warning(`${t('classes.studentsAlreadyInClass')}: ${report.already.length}`);
      }
      if (report.notFoundEmails.length > 0) {
        message.error(`${t('classes.emailsNotFound')}: ${report.notFoundEmails.length}`);
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(t('classes.addStudentsFailed'));
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
      title={t('classes.addStudents')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Alert
        message={t('classes.addStudentsInfo')}
        description={t('classes.addStudentsDescription')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label={t('classes.studentEmails')}
          name="studentEmails"
          rules={[
            { required: true, message: t('classes.emailsRequired') }
          ]}
          extra={t('classes.emailsHelp')}
        >
          <TextArea
            rows={6}
            placeholder={t('classes.emailsPlaceholder')}
          />
        </Form.Item>

        <Divider />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('classes.addStudents')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddStudentsModal;
