import { useState } from 'react';
import { Modal, Form, Input, Button, message, Alert, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import classService from '../../api/classService';

const JoinClassModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await classService.joinClassByCode({ code: values.code });
      message.success(t('classes.joinSuccess'));
      form.resetFields();
      onSuccess(response.data);
      onCancel(); // Close modal after successful join
    } catch (error) {
      message.error(t('classes.joinFailed'));
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
      title={t('classes.joinClass')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Alert
        message={t('classes.joinClassInfo')}
        description={t('classes.joinClassDescription')}
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
          label={t('classes.classCode')}
          name="code"
          rules={[
            { required: true, message: t('classes.codeRequired') },
            { len: 6, message: t('classes.codeLength') }
          ]}
        >
          <Input 
            placeholder={t('classes.codePlaceholder')}
            style={{ fontFamily: 'monospace', textAlign: 'center', fontSize: '16px' }}
            maxLength={6}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('classes.join')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JoinClassModal;
