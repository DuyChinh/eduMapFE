import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import ClassList from '../../components/teacher/ClassList';

const { Title } = Typography;

const Classes = () => {
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
          src="/class.png" 
          alt="Class" 
          style={{ width: 30, height: 30, objectFit: 'contain' }} 
        />
        <Title level={2} style={{ margin: 0, flex: 1 }}>{t('teacherPages.classes.title')}</Title>
      </div>
      
      <ClassList />
    </div>
  );
};

export default Classes;