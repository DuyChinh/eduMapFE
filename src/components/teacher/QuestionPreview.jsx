import { Card, Typography, Radio, Space, Tag, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const { Title, Text, Paragraph } = Typography;

const QuestionPreview = ({ questionData, subjects = [] }) => {
  const { t } = useTranslation();

  // Function to get subject name from ID based on current language
  const getSubjectName = (subjectId) => {
    if (!subjectId || !Array.isArray(subjects)) return subjectId;
    const subject = subjects.find(s => (s._id || s.id) === subjectId);
    if (!subject) return subjectId;
    
    // Get current language
    const currentLang = localStorage.getItem('language') || 'vi';
    
    // Return appropriate name based on language
    switch (currentLang) {
      case 'en':
        return subject.name_en || subject.name || subjectId;
      case 'jp':
        return subject.name_jp || subject.name || subjectId;
      case 'vi':
      default:
        return subject.name || subjectId;
    }
  };

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
    
    // Split by lines and process each line separately
    const lines = content.split('\n');
    return (
      <>
        {lines.map((line, index) => {
          // Skip empty lines but preserve them
          if (!line.trim()) {
            return <br key={index} />;
          }
          
          // Check if line contains LaTeX commands
          const hasLatex = line.includes('\\') || line.includes('^') || line.includes('_');
          const hasDollarSigns = line.includes('$') || line.includes('\\(');
          
          if (hasLatex && !hasDollarSigns) {
            // Mixed content - need to parse and render properly
            // Split by LaTeX patterns and render each part
            const parts = line.split(/(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\{[^}]*\})*)/g);
            return (
              <div key={index} style={{ 
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {parts.map((part, partIndex) => {
                  if (part.match(/^\\[a-zA-Z]+/)) {
                    // This is a LaTeX command, render with MathJax
                    return (
                      <MathJax key={partIndex} inline>
                        {`$${part}$`}
                      </MathJax>
                    );
                  } else {
                    // This is plain text, render as is
                    return <span key={partIndex}>{part}</span>;
                  }
                })}
              </div>
            );
          } else if (hasDollarSigns) {
            // Already has dollar signs, render as is
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
            // Plain text, render as is with preserved formatting
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

  const getTypeColor = (type) => {
    const colors = {
      mcq: 'blue',
      tf: 'green',
      short: 'orange',
      essay: 'purple'
    };
    return colors[type] || 'default';
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

  const getTypeLabel = (type) => {
    const labels = {
      mcq: t('questions.typeMCQ'),
      tf: t('questions.typeTF'),
      short: t('questions.typeShort'),
      essay: t('questions.typeEssay')
    };
    return labels[type] || type;
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

  const renderAnswer = () => {
    if (!questionData.answer) return null;

    if (questionData.type === 'mcq') {
      const answerIndex = parseInt(questionData.answer);
      const answerText = questionData.choices?.[answerIndex] || '';
      return (
        <div style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap'
        }}>
          <Text strong>{t('questions.correctAnswer')}: </Text>
          {renderMathContent(answerText)}
        </div>
      );
    } else {
      return (
        <div>
          <Text strong>{t('questions.correctAnswer')}: </Text>
          <Paragraph style={{ 
            marginTop: '8px',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {renderMathContent(questionData.answer)}
          </Paragraph>
        </div>
      );
    }
  };

  const renderChoices = () => {
    if (questionData.type !== 'mcq' || !questionData.choices) return null;

    return (
      <div>
        <Text strong>{t('questions.choices')}:</Text>
        <Radio.Group style={{ marginTop: '8px', width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {questionData.choices.map((choice, index) => (
              <Radio key={index} value={index} style={{ 
                width: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}>
                {renderMathContent(choice || `${t('questions.choice')} ${index + 1}`)}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </div>
    );
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div>
        {/* Question Name */}
        {questionData.name && (
          <div style={{ marginBottom: '16px' }}>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              {questionData.name}
            </Title>
          </div>
        )}

        {/* Question Header */}
        <div style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Tag color={getTypeColor(questionData.type)}>
              {getTypeLabel(questionData.type)}
            </Tag>
            <Tag color={getLevelColor(questionData.level)}>
              {getLevelLabel(questionData.level)}
            </Tag>
            {questionData.subject && (
              <Tag color="blue">{getSubjectName(questionData.subject)}</Tag>
            )}
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
            {renderMathContent(questionData.text || t('questions.noQuestionText'))}
          </Paragraph>
        </div>

      {/* Choices */}
      {renderChoices()}

      {/* Answer */}
      {questionData.answer && (
        <>
          <Divider />
          {renderAnswer()}
        </>
      )}

      {/* Explanation */}
      {questionData.explanation && (
        <>
          <Divider />
          <div>
            <Text strong>{t('questions.explanation')}:</Text>
            <Paragraph style={{ 
              marginTop: '8px',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit'
            }}>
              {renderMathContent(questionData.explanation)}
            </Paragraph>
          </div>
        </>
      )}

      {/* Empty State */}
      {!questionData.text && !questionData.answer && !questionData.explanation && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <Text type="secondary">{t('questions.previewEmpty')}</Text>
        </div>
      )}
      </div>
    </MathJaxContext>
  );
};

export default QuestionPreview;
