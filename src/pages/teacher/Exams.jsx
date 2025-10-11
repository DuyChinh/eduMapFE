import { Card, Button, Typography, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const Exams = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>{t('teacherPages.exams.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          {t('teacherPages.exams.createNew')}
        </Button>
      </div>
      
      <Card>
        <Empty description={t('teacherPages.exams.emptyDescription')} />
      </Card>
    </div>
  );
};

export default Exams;