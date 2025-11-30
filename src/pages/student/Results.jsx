import { Card, Typography, Empty } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const Results = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <img 
          src="/exam-results.png" 
          alt="Results" 
          style={{ width: 24, height: 24, objectFit: 'contain' }} 
        />
        <Title level={2} style={{ margin: 0, flex: 1 }}>{t('studentPages.results.title')}</Title>
      </div>
      
      <Card>
        <Empty description={t('studentPages.results.emptyDescription')} />
      </Card>
    </div>
  );
};

export default Results;