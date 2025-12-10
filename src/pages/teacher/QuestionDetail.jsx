import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Space, 
  message, 
  Spin,
  Row,
  Col,
  Typography,
  Tag,
  Divider,
  Radio,
  Breadcrumb
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import questionService from '../../api/questionService';
import { ROUTES } from '../../constants/config';
import QuestionPreview from '../../components/teacher/QuestionPreview';

const { Title, Text, Paragraph } = Typography;

const QuestionDetail = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [questionData, setQuestionData] = useState({});
  const [subjects, setSubjects] = useState([]);

  // Fetch question data on component mount
  useEffect(() => {
    const fetchQuestionData = async () => {
      try {
        setInitialLoading(true);
        
        let response = await questionService.getQuestionById(questionId);
        response = response?.data;
        let processedChoices = ['', '', '', ''];
        let answerIndex = 0;
        
        if (response.choices && Array.isArray(response.choices)) {
          // If choices is array of strings
          if (typeof response.choices[0] === 'string') {
            processedChoices = [...response.choices];
          } 
          // If choices is array of objects with text property
          else if (response.choices[0] && typeof response.choices[0] === 'object') {
            processedChoices = response.choices.map(choice => choice.text || '');
            
            // Find answer index by matching answer key with choice key
            if (response.type === 'mcq' && response.answer) {
              const answerKey = response.answer.toString().toUpperCase();
              const foundIndex = response.choices.findIndex(choice => 
                choice.key && choice.key.toUpperCase() === answerKey
              );
              answerIndex = foundIndex >= 0 ? foundIndex : 0;
            }
          }
        }
        
        // Ensure we have at least 4 choices
        while (processedChoices.length < 4) {
          processedChoices.push('');
        }
        
        const data = {
          name: response.name || '',
          text: response.text || '',
          type: response.type || 'mcq',
          level: response.level?.toString() || '1',
          subject: response.subjectId?._id || response.subject || '',
          choices: processedChoices,
          answer: response.type === 'mcq' ? answerIndex : response.answer || '',
          explanation: response.explanation || '',
          isPublic: response.isPublic !== undefined ? response.isPublic : true,
          // Additional fields for display
          ownerId: response.ownerId,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          usageCount: response.usageCount || 0
        };
        
        setQuestionData(data);
        
      } catch (error) {
        console.error('❌ Error fetching question:', error);
        message.error('Failed to load question data');
        navigate(ROUTES.TEACHER_QUESTIONS);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchQuestionData();
  }, [questionId, navigate]);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const currentLang = localStorage.getItem('language') || 'vi';
        
        const response = await questionService.getSubjects({ lang: currentLang });
        
        // Handle different response structures
        let subjectsData = [];
        if (Array.isArray(response)) {
          subjectsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          subjectsData = response.data;
        } else if (response.items && Array.isArray(response.items)) {
          subjectsData = response.items;
        }
        
        setSubjects(subjectsData);
      } catch (error) {
        console.error('❌ Error fetching subjects:', error);
        message.error('Failed to load subjects');
        setSubjects([]);
      }
    };

    fetchSubjects();
  }, []);

  // Listen for language changes and refetch subjects
  useEffect(() => {
    const handleLanguageChange = () => {
      const currentLang = localStorage.getItem('language') || 'vi';
      
      // Refetch subjects with new language
      const refetchSubjects = async () => {
        try {
          const response = await questionService.getSubjects({ lang: currentLang });
          let subjectsData = [];
          if (Array.isArray(response)) {
            subjectsData = response;
          } else if (response.data && Array.isArray(response.data)) {
            subjectsData = response.data;
          } else if (response.items && Array.isArray(response.items)) {
            subjectsData = response.items;
          }
          
          setSubjects(subjectsData);
        } catch (error) {
          console.error('❌ Error refetching subjects:', error);
          message.error('Failed to reload subjects');
        }
      };
      
      refetchSubjects();
    };

    // Listen for storage changes (language change)
    window.addEventListener('storage', handleLanguageChange);
    
    // Also listen for custom language change events
    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleLanguageChange);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const handleBack = () => {
    navigate(ROUTES.TEACHER_QUESTIONS);
  };

  const handleEdit = () => {
    navigate(`${ROUTES.TEACHER_QUESTIONS_EDIT}/${questionId}`);
  };

  const getTypeLabel = (type) => {
    const labels = {
      mcq: t('questions.mcq'),
      tf: t('questions.tf'),
      short: t('questions.short'),
      essay: t('questions.essay')
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
  };

  const getLevelLabel = (level) => {
    const labels = {
      '1': t('questions.level1'),
      '2': t('questions.level2'),
      '3': t('questions.level3'),
      '4': t('questions.level4'),
      '5': t('questions.level5')
    };
    return labels[level] || level;
  };

  const getLevelColor = (level) => {
    const colors = {
      '1': 'green',
      '2': 'lime',
      '3': 'orange',
      '4': 'red',
      '5': 'purple'
    };
    return colors[level] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (initialLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb */}
      <Breadcrumb 
        style={{ marginBottom: '16px' }}
        items={[
          {
            title: (
              <Button type="link" onClick={handleBack} style={{ padding: 0 }}>
                {t('questions.title')}
              </Button>
            )
          },
          {
            title: questionData.name || t('questions.detail')
          }
        ]}
      />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            {t('common.back')}
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        {/* Left Column - Question Details */}
        <Col xs={24} lg={14}>
          <Card title={t('questions.detail')} style={{ marginBottom: '24px' }}>
            {/* Question Name */}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>{t('questions.name')}:</Text>
              <div style={{ marginTop: '4px' }}>
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                  {questionData.name || t('questions.noName')}
                </Title>
              </div>
            </div>

            {/* Question Info */}
            <div style={{ marginBottom: '16px' }}>
              <Space wrap>
                <Tag color={getTypeColor(questionData.type)}>
                  {getTypeLabel(questionData.type)}
                </Tag>
                <Tag color={getLevelColor(questionData.level)}>
                  {getLevelLabel(questionData.level)}
                </Tag>
                <Tag color={questionData.isPublic ? 'green' : 'red'}>
                  {questionData.isPublic ? t('questions.public') : t('questions.private')}
                </Tag>
              </Space>
            </div>

            {/* Question Text */}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>{t('questions.question')}:</Text>
              <Paragraph style={{ 
                marginTop: '8px',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}>
                {questionData.text || t('questions.noQuestionText')}
              </Paragraph>
            </div>

            {/* Choices for MCQ */}
            {questionData.type === 'mcq' && questionData.choices && questionData.choices.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>{t('questions.choices')}:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Radio.Group value={questionData.answer} disabled>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {questionData.choices.map((choice, index) => (
                        <Radio key={index} value={index}>
                          <Text>
                            <Text strong>{String.fromCharCode(65 + index)}.</Text> {choice}
                          </Text>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </div>
              </div>
            )}

            {/* Answer */}
            {questionData.answer !== undefined && questionData.answer !== '' && (
              <div style={{ marginBottom: '16px' }}>
                <Divider />
                <Text strong>{t('questions.answer')}:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color="green" style={{ fontSize: '14px', padding: '4px 8px' }}>
                    {questionData.type === 'mcq' 
                      ? `${String.fromCharCode(65 + questionData.answer)} - ${questionData.choices[questionData.answer] || ''}`
                      : questionData.answer
                    }
                  </Tag>
                </div>
              </div>
            )}

            {/* Explanation */}
            {questionData.explanation && (
              <div style={{ marginBottom: '16px' }}>
                <Divider />
                <Text strong>{t('questions.explanation')}:</Text>
                <Paragraph style={{ 
                  marginTop: '8px',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit'
                }}>
                  {questionData.explanation}
                </Paragraph>
              </div>
            )}
          </Card>

          {/* Additional Info */}
          <Card title={t('questions.additionalInfo')}>
            <div style={{ marginBottom: '12px' }}>
              <Text strong>{t('questions.createdAt')}:</Text>
              <Text style={{ marginLeft: '8px' }}>
                {formatDate(questionData.createdAt)}
              </Text>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong>{t('questions.updatedAt')}:</Text>
              <Text style={{ marginLeft: '8px' }}>
                {formatDate(questionData.updatedAt)}
              </Text>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong>{t('questions.usageCount')}:</Text>
              <Text style={{ marginLeft: '8px' }}>
                {questionData.usageCount || 0}
              </Text>
            </div>
            {questionData.ownerId && (
              <div>
                <Text strong>{t('questions.owner')}:</Text>
                <Text style={{ marginLeft: '8px' }}>
                  {questionData.ownerId.name || questionData.ownerId.email}
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Right Column - Preview */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <EyeOutlined />
                {t('questions.preview')}
              </Space>
            }
            style={{ position: 'sticky', top: '24px' }}
          >
            <QuestionPreview questionData={questionData} subjects={subjects} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QuestionDetail;
