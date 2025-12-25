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

  // Helper to clean TEXT parts (OCR errors, Chemical formulas)
  const cleanTextSegment = (text) => {
    return text
      // Specific phrases where 'đ' likely means 'độ'
      .replace(/\bđ\s+lớn/g, 'độ lớn')
      .replace(/\bđ\s+lệch/g, 'độ lệch')
      .replace(/\bđ\s+cao/g, 'độ cao')
      .replace(/\bđ\s+sâu/g, 'độ sâu')
      .replace(/\bđ\s+cứng/g, 'độ cứng')
      .replace(/biên\s+đ\b/g, 'biên độ')
      .replace(/mật\s+đ\b/g, 'mật độ')
      .replace(/tốc\s+đ\b/g, 'tốc độ')

      // Fix broken words
      .replace(/đi[\ufffd\?]{1,4}n/g, 'điện')
      .replace(/ch[\ufffd\?]{1,5}t/g, 'chất')
      .replace(/đi[^a-zA-Z\s0-9]{1,4}n/g, 'điện')
      .replace(/\bv[\ufffd\?]{1,4}\b/g, 'và')

      .replace(/\bđin\b/g, 'điện')
      .replace(/ngun/g, 'nguồn')
      .replace(/cưng/g, 'cường')
      .replace(/trưng/g, 'trường')
      .replace(/bưc/g, 'bước')
      .replace(/thưng/g, 'thường')
      .replace(/[\ufffd\?]{2,}/g, '')

      // Auto-format Chemical Formulas (e.g., CO2, H2O)
      // Only apply this to TEXT segments, avoiding latex interference
      .replace(/(?<!\\)\b((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*){2,})\b/g, (match) => {
        const formatted = match.replace(/(\d+)/g, '_$1');
        return `$\\mathrm{${formatted}}$`;
      })
      .replace(/(?<!\\)\b([A-Z][a-z]?\d+)\b/g, (match) => {
        const formatted = match.replace(/(\d+)/g, '_$1');
        return `$\\mathrm{${formatted}}$`;
      });
  };

  // Helper to clean MATH parts (fix minor LaTeX errors)
  const cleanMathSegment = (text) => {
    // Fix Latex concatenation errors (e.g. \pit -> \pi t)
    return text.replace(/\\(pi|alpha|beta|gamma|delta|omega|sigma|theta|lambda|mu)([a-zA-Z0-9])/g, '\\$1 $2');
  };

  const renderMathContent = (content) => {
    if (!content) return '';

    const contentStr = typeof content === 'string' ? content : String(content);

    // 1. Split by Math Delimiters to protect Math from Text Cleaning
    // Regex matches $...$ OR \(...\)
    const tokens = contentStr.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

    // 2. Process each token appropriately
    const processedStr = tokens.map(token => {
      const isDollar = token.startsWith('$') && token.endsWith('$');
      const isParen = token.startsWith('\\(') && token.endsWith('\\)');

      if (isDollar || isParen) {
        return cleanMathSegment(token);
      } else {
        return cleanTextSegment(token);
      }
    }).join('');

    // 3. Split by lines to preserve structure
    const lines = processedStr.split('\n');

    return (
      <>
        {lines.map((line, index) => {
          if (!line.trim()) return <br key={index} />;

          // 4. Robust Mixed Content Parsing
          const chunks = line.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

          return (
            <div key={index} style={{
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              marginBottom: 4
            }}>
              {chunks.map((chunk, i) => {
                // Case 1: Existing LaTeX block ($...$) or (\(...\))
                const isDollar = chunk.startsWith('$') && chunk.endsWith('$');
                const isParen = chunk.startsWith('\\(') && chunk.endsWith('\\)');

                if (isDollar || isParen) {
                  let rawMath = chunk;
                  if (isDollar) rawMath = chunk.slice(1, -1);
                  if (isParen) rawMath = chunk.slice(2, -2);

                  return (
                    <MathJax key={i} inline>
                      {`$${rawMath}$`}
                    </MathJax>
                  );
                }

                // Case 2: Mixed Text with loose LaTeX cmd
                const subParts = chunk.split(/(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*)/g);

                return (
                  <span key={i}>
                    {subParts.map((sub, j) => {
                      if (sub.match(/^\\[a-zA-Z]+/)) {
                        return (
                          <MathJax key={j} inline>
                            {`$${sub}$`}
                          </MathJax>
                        );
                      }
                      return <span key={j}>{sub}</span>;
                    })}
                  </span>
                );
              })}
            </div>
          );
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
