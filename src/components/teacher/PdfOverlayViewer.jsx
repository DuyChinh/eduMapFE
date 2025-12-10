import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Input, Tooltip, Tag, Checkbox, message, Empty } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  DeleteOutlined, 
  EditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const PdfOverlayViewer = ({ pageData, onQuestionUpdate }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [editingBox, setEditingBox] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    // Initialize selected answers (default to first answer)
    const initialSelected = {};
    pageData.questions.forEach(q => {
      initialSelected[q.questionNumber] = q.answers[0]?.key || 'A';
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

  return (
    <div style={{ width: '100%' }}>
      {/* Zoom Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>
            {t('common.zoomIn')}
          </Button>
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>
            {t('common.zoomOut')}
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
        </Space>
        <Tag color="blue">
          {questions.length} {t('exams.questions')} {t('common.found')}
        </Tag>
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

              {/* Answer Boxes */}
              {question.answers.map((answer) => {
                const isSelected = selectedAnswers[question.questionNumber] === answer.key;
                
                return (
                  <Tooltip key={answer.key} title={answer.text}>
                    <div
                      style={{
                        position: 'absolute',
                        ...calculatePosition(answer, pageWidth, pageHeight),
                        border: `2px solid ${isSelected ? '#1890ff' : '#faad14'}`,
                        backgroundColor: isSelected 
                          ? 'rgba(24, 144, 255, 0.2)' 
                          : 'rgba(250, 173, 20, 0.1)',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontSize: '12px',
                        color: isSelected ? '#1890ff' : '#faad14',
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
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
};

export default PdfOverlayViewer;

