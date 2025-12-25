import { Card, Typography, Radio, Space, Tag, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const { Title, Text, Paragraph } = Typography;

const QuestionPreview = ({ questionData, subjects = [] }) => {
  const { t, i18n } = useTranslation();

  // Function to get subject name from ID based on current language
  const getSubjectName = (subjectId) => {
    if (!subjectId || !Array.isArray(subjects)) return subjectId;
    const subject = subjects.find(s => (s._id || s.id) === subjectId);
    if (!subject) return subjectId;

    // Get current language
    const currentLang = i18n.language || 'vi';

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

    // Convert to string if not already
    const contentStr = typeof content === 'string' ? content : String(content);

    // Split by lines and process each line separately
    const lines = contentStr.split('\n');
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
    if (questionData.answer === undefined && questionData.type !== 'tf') return null;

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
    } else if (questionData.type === 'tf') {
      return (
        <div>
          <Text strong>{t('questions.correctAnswer')}: </Text>
          <Paragraph style={{
            marginTop: '8px',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {questionData.answer === true || questionData.answer === 'true'
              ? t('questions.true')
              : t('questions.false')}
          </Paragraph>
        </div>
      );
    } else {
      return (
        <div>
          <Text strong>{t('questions.correctAnswer')}: </Text>
          <Paragraph style={{
            marginTop: '8px',
            padding: '12px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
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
    // Render MCQ choices
    if (questionData.type === 'mcq' && questionData.choices) {
      return (
        <div>
          <Text strong>{t('questions.choices')}:</Text>
          <Radio.Group style={{ marginTop: '8px', width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {questionData.choices.map((choice, index) => {
                // Handle both object format {key, text} and string format
                // Handle both object format {key, text} and string format
                let choiceText = '';
                let choiceKey = String.fromCharCode(65 + index); // Default key A, B, C...

                if (typeof choice === 'string') {
                  choiceText = choice;
                } else if (typeof choice === 'object' && choice !== null) {
                  choiceText = choice.text || '';
                  if (choice.key) {
                    choiceKey = choice.key;
                  }
                }

                if (!choiceText && !(typeof choice === 'object' && choice?.image)) {
                  choiceText = `${t('questions.choice')} ${index + 1}`;
                }

                return (
                  <Radio key={index} value={index} style={{
                    width: '100%',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'center', // Center vertically as per user preference/revert
                    marginBottom: '8px'
                  }}>
                    <span style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px' }}>
                        <Text strong style={{ whiteSpace: 'nowrap' }}>{choiceKey}.</Text>
                        <span style={{ flex: 1 }}>{renderMathContent(choiceText)}</span>
                      </span>

                      {choice.image && (
                        <div style={{ marginTop: '8px', marginLeft: '20px' }}>
                          <img
                            src={choice.image}
                            alt={`Choice ${choiceKey}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '200px',
                              objectFit: 'contain',
                              borderRadius: '4px',
                              border: '1px solid #f0f0f0'
                            }}
                          />
                        </div>
                      )}
                    </span>
                  </Radio>
                );

              })}
            </Space>
          </Radio.Group>
        </div>
      );
    }

    // Render True/False choices
    if (questionData.type === 'tf') {
      return (
        <div>
          <Text strong>{t('questions.choices')}:</Text>
          <Radio.Group style={{ marginTop: '8px', width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value={true} checked={questionData.answer === true || questionData.answer === 'true'} style={{
                width: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px' }}>
                  <Text strong style={{ whiteSpace: 'nowrap' }}>A.</Text>
                  <span>{t('questions.true')}</span>
                </span>
              </Radio>
              <Radio value={false} checked={questionData.answer === false || questionData.answer === 'false'} style={{
                width: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px' }}>
                  <Text strong style={{ whiteSpace: 'nowrap' }}>B.</Text>
                  <span>{t('questions.false')}</span>
                </span>
              </Radio>
            </Space>
          </Radio.Group>
        </div>
      );
    }

    return null;
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

        {/* Question Images */}
        {questionData.images && questionData.images.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {questionData.images.map((imgUrl, index) => (
              <img
                key={index}
                src={imgUrl}
                alt={`Question Illustration ${index + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #f0f0f0'
                }}
              />
            ))}
          </div>
        )}

        {/* Legacy single Image support (fallback if images array is empty) */}
        {questionData.image && (!questionData.images || questionData.images.length === 0) && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={questionData.image}
              alt="Question Illustration"
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}
            />
          </div>
        )}

        {/* Choices */}
        {renderChoices()}

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
