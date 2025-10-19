import { useState, useEffect, useRef } from 'react';
import { Input, Button, Space, Card, Typography, Tooltip } from 'antd';
import { 
  FunctionOutlined, 
  UpOutlined, 
  DownOutlined,
  PlusOutlined,
  MinusOutlined,
  CloseOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const { TextArea } = Input;
const { Text } = Typography;

const MathJaxEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text with LaTeX...',
  rows = 4,
  showPreview = true,
  showToolbar = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const insertMathSymbol = (symbol) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = inputValue.substring(0, start);
    const after = inputValue.substring(end);
    const newValue = before + symbol + after;
    
    setInputValue(newValue);
    onChange?.(newValue);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const mathSymbols = [
    // Basic operations - Priority at top
    { symbol: '+', label: 'Plus', icon: <PlusOutlined /> },
    { symbol: '-', label: 'Minus', icon: <MinusOutlined /> },
    { symbol: '\\times', label: 'Times', icon: <CloseOutlined /> },
    { symbol: '\\div', label: 'Divide', icon: <FunctionOutlined /> },
    { symbol: '\\frac{a}{b}', label: 'Fraction', icon: <FunctionOutlined /> },
    { symbol: '\\sqrt{}', label: 'Square Root', icon: <FunctionOutlined /> },
    
    // Powers and subscripts
    { symbol: '^{}', label: 'Superscript', icon: <UpOutlined /> },
    { symbol: '_{}', label: 'Subscript', icon: <DownOutlined /> },
    
    // Greek letters
    { symbol: '\\pi', label: 'Pi', icon: <FunctionOutlined /> },
    { symbol: '\\alpha', label: 'Alpha', icon: <FunctionOutlined /> },
    { symbol: '\\beta', label: 'Beta', icon: <FunctionOutlined /> },
    { symbol: '\\gamma', label: 'Gamma', icon: <FunctionOutlined /> },
    { symbol: '\\theta', label: 'Theta', icon: <FunctionOutlined /> },
    
    // Advanced symbols
    { symbol: '\\sum', label: 'Sum', icon: <PlusOutlined /> },
    { symbol: '\\int', label: 'Integral', icon: <FunctionOutlined /> },
    { symbol: '\\infty', label: 'Infinity', icon: <FunctionOutlined /> },
    { symbol: '\\pm', label: 'Plus Minus', icon: <PlusOutlined /> },
    
    // Comparison operators
    { symbol: '\\leq', label: 'Less Equal', icon: <CheckOutlined /> },
    { symbol: '\\geq', label: 'Greater Equal', icon: <CheckOutlined /> },
    { symbol: '\\neq', label: 'Not Equal', icon: <CloseOutlined /> },
    { symbol: '\\approx', label: 'Approximately', icon: <CheckOutlined /> },
    { symbol: '\\in', label: 'Element Of', icon: <CheckOutlined /> },
  ];

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

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div>
        {/* Toolbar */}
        {showToolbar && (
          <Card 
            size="small" 
            style={{ marginBottom: '8px' }}
            title={
              <Space>
                <FunctionOutlined />
                <Text strong>Math Symbols</Text>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {mathSymbols.map((item, index) => (
                <Tooltip key={index} title={item.label}>
                  <Button
                    size="small"
                    icon={item.icon}
                    onClick={() => insertMathSymbol(item.symbol)}
                    style={{ marginBottom: '4px' }}
                  >
                    {item.symbol}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </Card>
        )}

        {/* Input Area */}
        <div style={{ marginBottom: showPreview ? '8px' : '0' }}>
          <TextArea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            rows={rows}
            style={{ 
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Preview */}
        {showPreview && inputValue && (
          <Card 
            size="small" 
            title={
              <Space>
                <FunctionOutlined />
                <Text strong>Preview</Text>
              </Space>
            }
            style={{ marginTop: '8px' }}
          >
            <div style={{ 
              minHeight: '60px', 
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#fafafa',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              <MathJax>
                {(() => {
                  if (!inputValue) return '';
                  
                  // Split by lines and process each line separately
                  const lines = inputValue.split('\n');
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
                          // Wrap LaTeX content in display math
                          return (
                            <div key={index}>
                              <MathJax>{`$$${line}$$`}</MathJax>
                            </div>
                          );
                        } else if (hasDollarSigns) {
                          // Already has dollar signs, render as is
                          return (
                            <div key={index}>
                              <MathJax>{line}</MathJax>
                            </div>
                          );
                        } else {
                          // Plain text, render as is
                          return (
                            <div key={index}>
                              {line}
                            </div>
                          );
                        }
                      })}
                    </>
                  );
                })()}
              </MathJax>
            </div>
          </Card>
        )}
      </div>
    </MathJaxContext>
  );
};

export default MathJaxEditor;
