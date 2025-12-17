import { Modal, Typography, Descriptions, Card, Space, Tag, Divider, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import QuestionPreview from './QuestionPreview';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const PreviewExamModal = ({ open, onCancel, examData, questions = [], subjects = [] }) => {
  const { t, i18n } = useTranslation();

  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    },
  };

  const renderMathContent = (content) => {
    if (!content) return '';
    
    // Convert to string if not already
    const contentStr = typeof content === 'string' ? content : String(content);
    
    const lines = contentStr.split('\n');
    return (
      <>
        {lines.map((line, index) => {
          if (!line.trim()) {
            return <br key={index} />;
          }
          
          const hasLatex = line.includes('\\') || line.includes('^') || line.includes('_');
          const hasDollarSigns = line.includes('$') || line.includes('\\(');
          
          if (hasLatex && !hasDollarSigns) {
            const parts = line.split(/(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*)/g);
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {parts.map((part, partIndex) => {
                  if (part.match(/^\\[a-zA-Z]+/)) {
                    return (
                      <MathJax key={partIndex} inline>
                        {`$${part}$`}
                      </MathJax>
                    );
                  } else {
                    return <span key={partIndex}>{part}</span>;
                  }
                })}
              </div>
            );
          } else if (hasDollarSigns) {
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                <MathJax>{line}</MathJax>
              </div>
            );
          } else {
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {line}
              </div>
            );
          }
        })}
      </>
    );
  };

  const getSubjectName = (subjectId) => {
    if (!subjectId) return '-';
    
    // If subjectId is already an object with name properties
    if (typeof subjectId === 'object' && subjectId !== null) {
      const currentLang = i18n.language || 'vi';
      switch (currentLang) {
        case 'en':
          return subjectId.name_en || subjectId.name || '-';
        case 'jp':
          return subjectId.name_jp || subjectId.name || '-';
        case 'vi':
        default:
          return subjectId.name || '-';
      }
    }
    
    // If subjectId is a string/ID, try to find in subjects array
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return String(subjectId);
    }
    
    const subject = subjects.find(s => (s._id || s.id) === subjectId);
    if (!subject) return String(subjectId);
    
    const currentLang = i18n.language || 'vi';
    switch (currentLang) {
      case 'en':
        return subject.name_en || subject.name || String(subjectId);
      case 'jp':
        return subject.name_jp || subject.name || String(subjectId);
      case 'vi':
      default:
        return subject.name || String(subjectId);
    }
  };

  if (!examData) return null;

  // Prepare questions for preview
  const previewQuestions = questions.map((q, index) => {
    const question = q.questionId || q;
    // Ensure question is an object
    if (!question || typeof question !== 'object') {
      return null;
    }
    
    // Ensure choices have text as string
    const processedQuestion = {
      ...question,
      order: q.order || index + 1,
      marks: q.marks || 1,
    };
    
    // Process choices if they exist
    if (processedQuestion.choices && Array.isArray(processedQuestion.choices)) {
      processedQuestion.choices = processedQuestion.choices.map(choice => ({
        ...choice,
        text: typeof choice.text === 'string' ? choice.text : (choice.text ? String(choice.text) : '')
      }));
    }
    
    return processedQuestion;
  }).filter(q => q !== null);

  const totalMarks = previewQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Modal
        title={t('exams.previewExam') || 'Preview Exam'}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Exam Information */}
          <Card style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {examData.name || t('exams.examName')}
            </Title>
            
            {examData.description && (
              <Paragraph style={{ marginBottom: 16 }}>
                {renderMathContent(examData.description)}
              </Paragraph>
            )}

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('exams.duration')}>
                {examData.duration} {t('exams.minutes')}
              </Descriptions.Item>
              <Descriptions.Item label={t('exams.totalMarks')}>
                {typeof (examData.totalMarks || totalMarks) === 'number' 
                  ? Number((examData.totalMarks || totalMarks).toFixed(1))
                  : (examData.totalMarks || totalMarks)}
              </Descriptions.Item>
              {examData.subjectId && (
                <Descriptions.Item label={t('exams.subject')}>
                  {getSubjectName(examData.subjectId)}
                </Descriptions.Item>
              )}
              {examData.examPurpose && (
                <Descriptions.Item label={t('exams.examPurpose')}>
                  <Tag>{examData.examPurpose}</Tag>
                </Descriptions.Item>
              )}
              {examData.maxAttempts && (
                <Descriptions.Item label={t('exams.maxAttempts')}>
                  {examData.maxAttempts}
                </Descriptions.Item>
              )}
              {examData.startTime && (
                <Descriptions.Item label={t('exams.startTime')}>
                  {typeof examData.startTime === 'object' && examData.startTime?.format
                    ? examData.startTime.format('DD/MM/YYYY HH:mm')
                    : dayjs(examData.startTime).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
              {examData.endTime && (
                <Descriptions.Item label={t('exams.endTime')}>
                  {typeof examData.endTime === 'object' && examData.endTime?.format
                    ? examData.endTime.format('DD/MM/YYYY HH:mm')
                    : dayjs(examData.endTime).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Questions */}
          <Card>
            <Title level={4} style={{ marginBottom: 16 }}>
              {t('exams.questions')} ({previewQuestions.length})
            </Title>

            {previewQuestions.length === 0 ? (
              <Empty description={t('exams.noQuestions') || 'No questions'} />
            ) : (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {previewQuestions.map((question, index) => (
                  <Card
                    key={question._id || question.id || index}
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>
                          {t('exams.question')} {question.order || index + 1}
                        </Text>
                        <Tag color="blue">
                          {t('exams.marks')}: {typeof (question.marks || 1) === 'number' 
                            ? Number((question.marks || 1).toFixed(1))
                            : (question.marks || 1)}
                        </Tag>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <QuestionPreview questionData={question} subjects={subjects} />
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </div>
      </Modal>
    </MathJaxContext>
  );
};

export default PreviewExamModal;

