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

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const mathSymbols = [
    { symbol: '+', label: 'Plus', icon: <PlusOutlined /> },
    { symbol: '-', label: 'Minus', icon: <MinusOutlined /> },
    { symbol: '\\times', label: 'Times', icon: <CloseOutlined /> },
    { symbol: '\\div', label: 'Divide', icon: <FunctionOutlined /> },
    { symbol: '\\frac{a}{b}', label: 'Fraction', icon: <FunctionOutlined /> },
    { symbol: '\\sqrt{}', label: 'Square Root', icon: <FunctionOutlined /> },

    { symbol: '^{}', label: 'Superscript', icon: <UpOutlined /> },
    { symbol: '_{}', label: 'Subscript', icon: <DownOutlined /> },

    { symbol: '\\pi', label: 'Pi', icon: <FunctionOutlined /> },
    { symbol: '\\alpha', label: 'Alpha', icon: <FunctionOutlined /> },
    { symbol: '\\beta', label: 'Beta', icon: <FunctionOutlined /> },
    { symbol: '\\gamma', label: 'Gamma', icon: <FunctionOutlined /> },
    { symbol: '\\theta', label: 'Theta', icon: <FunctionOutlined /> },

    { symbol: '\\sum', label: 'Sum', icon: <PlusOutlined /> },
    { symbol: '\\int', label: 'Integral', icon: <FunctionOutlined /> },
    { symbol: '\\infty', label: 'Infinity', icon: <FunctionOutlined /> },
    { symbol: '\\pm', label: 'Plus Minus', icon: <PlusOutlined /> },

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
    svg: {
      font: 'inherit',
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
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--component-background)',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              <MathJax>
                {(() => {
                  if (!inputValue) return '';

                  const cleanTextSegment = (text) => {
                    return text
                      .replace(/\bđ\s+lớn/g, 'độ lớn')
                      .replace(/\bđ\s+lệch/g, 'độ lệch')
                      .replace(/\bđ\s+cao/g, 'độ cao')
                      .replace(/\bđ\s+sâu/g, 'độ sâu')
                      .replace(/\bđ\s+cứng/g, 'độ cứng')
                      .replace(/biên\s+đ\b/g, 'biên độ')
                      .replace(/mật\s+đ\b/g, 'mật độ')
                      .replace(/tốc\s+đ\b/g, 'tốc độ')

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

                      .replace(/(?<!\\)\b((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*){2,})\b/g, (match) => {
                        const formatted = match.replace(/(\d+)/g, '_$1');
                        return `$\\mathrm{${formatted}}$`;
                      })
                      .replace(/(?<!\\)\b([A-Z][a-z]?\d+)\b/g, (match) => {
                        const formatted = match.replace(/(\d+)/g, '_$1');
                        return `$\\mathrm{${formatted}}$`;
                      });
                  };

                  const cleanMathSegment = (text) => {
                    return text.replace(/\\(pi|alpha|beta|gamma|delta|omega|sigma|theta|lambda|mu)([a-zA-Z0-9])/g, '\\$1 $2');
                  };

                  const contentStr = String(inputValue);

                  const tokens = contentStr.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

                  const processedStr = tokens.map(token => {
                    const isDollar = token.startsWith('$') && token.endsWith('$');
                    const isParen = token.startsWith('\\(') && token.endsWith('\\)');

                    if (isDollar || isParen) {
                      return cleanMathSegment(token);
                    } else {
                      return cleanTextSegment(token);
                    }
                  }).join('');

                  const lines = processedStr.split('\n');

                  return (
                    <>
                      {lines.map((line, index) => {
                        if (!line.trim()) return <br key={index} />;

                        const chunks = line.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

                        return (
                          <div key={index} style={{
                            fontFamily: 'inherit',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            display: 'block',
                            marginBottom: '4px'
                          }}>
                            {chunks.map((chunk, i) => {
                              const isDollar = chunk.startsWith('$') && chunk.endsWith('$');
                              const isParen = chunk.startsWith('\\(') && chunk.endsWith('\\)');

                              if (isDollar || isParen) {
                                const rawMath = isDollar ? chunk.slice(1, -1) : chunk.slice(2, -2);
                                return <MathJax key={i} inline>{`$${rawMath}$`}</MathJax>;
                              }

                              const subParts = chunk.split(/(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*)/g);
                              return (
                                <span key={i}>
                                  {subParts.map((sub, j) => {
                                    if (sub.match(/^\\[a-zA-Z]+/)) {
                                      return <MathJax key={j} inline>{`$${sub}$`}</MathJax>;
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
