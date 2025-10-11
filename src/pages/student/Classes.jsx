import { Card, Button, Typography, Empty, Modal, Form, Input, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classService from '../../api/classService';

const { Title } = Typography;

const Classes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleJoinClass = async (values) => {
    setLoading(true);
    try {
      await classService.joinClass(values.code);
      message.success(t('studentPages.classes.modal.joinSuccess'));
      setIsModalOpen(false);
      form.resetFields();
      // TODO: Refresh class list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('studentPages.classes.modal.joinFailed');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>{t('studentPages.classes.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={showModal}>
          {t('studentPages.classes.joinClass')}
        </Button>
      </div>
      
      <Card>
        <Empty description={t('studentPages.classes.emptyDescription')} />
      </Card>

      <Modal
        title={t('studentPages.classes.modal.title')}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleJoinClass}
        >
          <Form.Item
            label={t('studentPages.classes.modal.classCode')}
            name="code"
            rules={[
              { required: true, message: t('studentPages.classes.modal.classCodeRequired') },
            ]}
          >
            <Input 
              placeholder={t('studentPages.classes.modal.classCodePlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              size="large"
            >
              {t('studentPages.classes.modal.joinButton')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Classes;