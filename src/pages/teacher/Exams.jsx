import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import ExamList from '../../components/teacher/ExamList';

const { Title } = Typography;

const Exams = () => {
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
          src="/exam.png" 
          alt="Exam" 
          style={{ width: 28, height: 28, objectFit: 'contain' }} 
        />
        <Title level={2} style={{ margin: 0, flex: 1 }}>{t('teacherPages.exams.title')}</Title>
      </div>
      
      <ExamList />
    </div>
  );
};

export default Exams;