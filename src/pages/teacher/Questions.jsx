import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import QuestionList from '../../components/teacher/QuestionList';

const { Title } = Typography;

const Questions = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img 
          src="/question.png" 
          alt="Question" 
          style={{ width: 24, height: 24, objectFit: 'contain' }} 
        />
        <Title level={2} style={{ margin: 0 }}>{t('teacherPages.questions.title')}</Title>
      </div>
      
      <QuestionList />
    </div>
  );
};

export default Questions;