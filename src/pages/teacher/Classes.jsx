import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import ClassList from '../../components/teacher/ClassList';

const { Title } = Typography;

const Classes = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('teacherPages.classes.title')}</Title>
      </div>
      
      <ClassList />
    </div>
  );
};

export default Classes;