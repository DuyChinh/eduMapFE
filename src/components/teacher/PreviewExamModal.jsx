import { Modal, Typography, Descriptions, Card, Space, Tag, Divider, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import QuestionPreview from './QuestionPreview';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const PreviewExamModal = ({ open, onCancel, examData, questions = [], subjects = [] }) => {
  const { t } = useTranslation();

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

  const getSubjectName = (subjectId) => {
    if (!subjectId) return '-';

    // If subjectId is already an object with name properties
    if (typeof subjectId === 'object' && subjectId !== null) {
      const currentLang = localStorage.getItem('language') || 'vi';
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

    const currentLang = localStorage.getItem('language') || 'vi';
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

