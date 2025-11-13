import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import ExamList from '../../components/teacher/ExamList';

const { Title } = Typography;

const Exams = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('teacherPages.exams.title')}</Title>
      </div>
      
      <ExamList />
    </div>
  );
};

export default Exams;