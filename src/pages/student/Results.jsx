import { Card, Typography, Empty } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const Results = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('studentPages.results.title')}</Title>
      </div>
      
      <Card>
        <Empty description={t('studentPages.results.emptyDescription')} />
      </Card>
    </div>
  );
};

export default Results;