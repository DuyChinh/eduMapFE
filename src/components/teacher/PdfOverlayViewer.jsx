import { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Input, Tooltip, Tag, message, Empty, Typography } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  EditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const { Paragraph } = Typography;

const PdfOverlayViewer = ({ pageData, onQuestionUpdate }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [editingBox, setEditingBox] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    const initialSelected = {};
    pageData.questions.forEach(q => {
      if (q.answers && q.answers.length > 0) {
        initialSelected[q.questionNumber] = q.correctAnswer || q.answers[0]?.key || 'A';
      }
    });
    setSelectedAnswers(initialSelected);
  }, [pageData.questions]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleBoxClick = (type, questionNumber, answerKey) => {
    if (type === 'answer') {
      // Toggle selected answer
      setSelectedAnswers(prev => ({
        ...prev,
        [questionNumber]: answerKey
      }));
      
      // Update parent component
      if (onQuestionUpdate) {
        onQuestionUpdate(questionNumber, { correctAnswer: answerKey });
      }
      
      message.success(t('exams.answerSelected', { answer: answerKey }));
    }
  };

  const handleEditStart = (type, questionNumber, text, answerKey = null) => {
    setEditingBox({ type, questionNumber, answerKey });
    setEditText(text);
  };

  const handleEditSave = () => {
    if (!editingBox) return;
    
    const { type, questionNumber, answerKey } = editingBox;
    
    if (onQuestionUpdate) {
      const updates = {};
      if (type === 'question') {
        updates.questionText = editText;
      } else if (type === 'answer') {
        updates.answers = { [answerKey]: editText };
      }
      onQuestionUpdate(questionNumber, updates);
    }
    
    setEditingBox(null);
    setEditText('');
    message.success(t('common.saved'));
  };

  const handleEditCancel = () => {
    setEditingBox(null);
    setEditText('');
  };

  const calculatePosition = (coords, pageWidth, pageHeight) => {
    // Handle null/undefined coords
    if (!coords || coords.x === undefined) {
      return {
        left: '0%',
        top: '0%',
        width: '100%',
        minHeight: '20px'
      };
    }
    
    return {
      left: `${(coords.x / pageWidth) * 100}%`,
      top: `${(coords.y / pageHeight) * 100}%`,
      width: `${(coords.width / pageWidth) * 100}%`,
      minHeight: '20px'
    };
  };

  if (!pageData || !pageData.imageUrl) {
    return (
      <Card>
        <Empty description={t('exams.noPageData')} />
      </Card>
    );
  }

  const { imageUrl, pageWidth, pageHeight, questions } = pageData;

  const multipleChoiceCount = questions.filter(q => q.type === 'multiple-choice').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;

  return (
    <div style={{ width: '100%' }}>
      {/* Statistics & Zoom Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>
            {t('common.zoomIn')}
          </Button>
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>
            {t('common.zoomOut')}
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
        </Space>
        <Space>
          <Tag color="blue">
            {questions.length} {t('exams.questions')}
          </Tag>
          {multipleChoiceCount > 0 && (
            <Tag color="green">
              {multipleChoiceCount} {t('exams.multipleChoice')}
            </Tag>
          )}
          {essayCount > 0 && (
            <Tag color="orange">
              {essayCount} {t('exams.essay')}
            </Tag>
          )}
        </Space>
      </div>

      {/* PDF Image with Overlays */}
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          maxHeight: '70vh'
        }}
      >
        {/* Background Image */}
        <img 
          src={imageUrl} 
          alt={`Page ${pageData.pageNumber}`}
          style={{
            width: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            display: 'block'
          }}
        />

        {/* Overlay Container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            pointerEvents: editingBox ? 'none' : 'auto'
          }}
        >
          {questions.map((question) => (
            <div key={question.questionNumber}>
              {/* Question Text Box */}
              <Tooltip title={question.questionText}>
                <div
                  style={{
                    position: 'absolute',
                    ...calculatePosition(question, pageWidth, pageHeight),
                    border: '2px solid #52c41a',
                    backgroundColor: 'rgba(82, 196, 26, 0.1)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '12px',
                    color: '#52c41a',
                    fontWeight: 'bold',
                    pointerEvents: 'auto'
                  }}
                  onClick={() => handleEditStart('question', question.questionNumber, question.questionText)}
                >
                  Q{question.questionNumber}
                  <EditOutlined style={{ marginLeft: 4, fontSize: 10 }} />
                </div>
              </Tooltip>

              {question.answers && question.answers.length > 0 && question.answers.map((answer) => {
                const isSelected = selectedAnswers[question.questionNumber] === answer.key;
                const isCorrectByAI = answer.isCorrect === true;
                
                return (
                  <Tooltip 
                    key={answer.key} 
                    title={
                      <>
                        <div>{answer.text}</div>
                        {isCorrectByAI && <div style={{ color: '#52c41a', marginTop: 4 }}>✓ {t('exams.aiDetectedCorrect')}</div>}
                      </>
                    }
                  >
                    <div
                      style={{
                        position: 'absolute',
                        ...calculatePosition(answer, pageWidth, pageHeight),
                        border: `2px solid ${isSelected ? '#1890ff' : (isCorrectByAI ? '#52c41a' : '#faad14')}`,
                        backgroundColor: isSelected 
                          ? 'rgba(24, 144, 255, 0.2)' 
                          : (isCorrectByAI ? 'rgba(82, 196, 26, 0.15)' : 'rgba(250, 173, 20, 0.1)'),
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontSize: '12px',
                        color: isSelected ? '#1890ff' : (isCorrectByAI ? '#52c41a' : '#faad14'),
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        pointerEvents: 'auto'
                      }}
                      onClick={() => handleBoxClick('answer', question.questionNumber, answer.key)}
                    >
                      {answer.key}
                      {isSelected && <CheckCircleOutlined style={{ fontSize: 10 }} />}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal (Simple Inline) */}
      {editingBox && (
        <Card
          style={{
            marginTop: 16,
            borderColor: '#1890ff'
          }}
          title={
            editingBox.type === 'question' 
              ? `${t('common.edit')} ${t('exams.question')} ${editingBox.questionNumber}`
              : `${t('common.edit')} ${t('exams.answer')} ${editingBox.answerKey}`
          }
          extra={
            <Space>
              <Button size="small" onClick={handleEditCancel}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" size="small" onClick={handleEditSave}>
                {t('common.save')}
              </Button>
            </Space>
          }
        >
          <Input.TextArea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            autoFocus
          />
        </Card>
      )}

      {/* Question List Summary */}
      <Card 
        title={t('exams.detectedQuestions')} 
        style={{ marginTop: 16 }}
        size="small"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {questions.map(q => (
            <div 
              key={q.questionNumber}
              style={{
                padding: '8px',
                border: '1px solid #f0f0f0',
                borderRadius: '4px',
                backgroundColor: '#fafafa'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Câu {q.questionNumber}: {q.questionText.substring(0, 50)}...
              </div>
              <div style={{ fontSize: '12px' }}>
                {q.answers.map(ans => (
                  <Tag 
                    key={ans.key}
                    color={selectedAnswers[q.questionNumber] === ans.key ? 'blue' : 'default'}
                  >
                    {ans.key}. {ans.text.substring(0, 30)}...
                  </Tag>
                ))}
              </div>
              <div style={{ marginTop: 4, fontSize: '12px', color: '#52c41a' }}>
                ✓ {t('exams.correctAnswer')}: {selectedAnswers[q.questionNumber]}
              </div>
              {q.explanation && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e8e8e8' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: 4, color: '#1890ff' }}>
                    {t('questions.explanation')}:
                  </div>
                  <Paragraph 
                    style={{ 
                      fontSize: '12px', 
                      margin: 0,
                      color: '#595959',
                      whiteSpace: 'pre-wrap'
                    }}
                    ellipsis={{ rows: 2, expandable: true, symbol: t('common.more') }}
                  >
                    {q.explanation}
                  </Paragraph>
                </div>
              )}
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
};

PdfOverlayViewer.propTypes = {
  pageData: PropTypes.shape({
    imageUrl: PropTypes.string,
    pageNumber: PropTypes.number,
    pageWidth: PropTypes.number,
    pageHeight: PropTypes.number,
    questions: PropTypes.arrayOf(PropTypes.shape({
      questionNumber: PropTypes.number,
      questionText: PropTypes.string,
      type: PropTypes.string,
      answers: PropTypes.array,
      explanation: PropTypes.string,
      correctAnswer: PropTypes.string,
      x: PropTypes.number,
      y: PropTypes.number,
      width: PropTypes.number
    }))
  }),
  onQuestionUpdate: PropTypes.func
};

export default PdfOverlayViewer;

