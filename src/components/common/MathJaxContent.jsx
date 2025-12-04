import React from 'react';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';

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

/**
 * Component to render content with MathJax support
 * Handles both markdown and LaTeX math expressions
 * 
 * @param {string} content - The content to render (can contain markdown and LaTeX)
 * @param {boolean} enableMarkdown - Whether to enable markdown rendering (default: true)
 */
const MathJaxContent = ({ content, enableMarkdown = true }) => {
  if (!content) return null;

  // Convert to string if not already
  const contentStr = typeof content === 'string' ? content : String(content);

  // If markdown is enabled, render markdown with MathJax support
  if (enableMarkdown) {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <div style={{ 
          fontFamily: 'inherit',
          whiteSpace: 'normal',
          wordWrap: 'break-word'
        }}>
          {/* Wrap markdown content in MathJax - it will automatically process LaTeX expressions */}
          <MathJax>
            <ReactMarkdown>
              {contentStr}
            </ReactMarkdown>
          </MathJax>
        </div>
      </MathJaxContext>
    );
  }

  // If markdown is disabled, just render with MathJax
  // Process content to remove consecutive empty lines
  const lines = contentStr.split('\n');
  const processedLines = [];
  let prevWasEmpty = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = !line.trim();
    
    // If this is an empty line and previous was also empty, skip it
    if (isEmpty && prevWasEmpty) {
      continue;
    }
    
    processedLines.push(isEmpty ? '' : line);
    prevWasEmpty = isEmpty;
  }
  
  // Join back with newlines
  const processedContent = processedLines.join('\n');
  
  return (
    <MathJaxContext config={mathJaxConfig}>
      <div style={{ 
        fontFamily: 'inherit',
        whiteSpace: 'pre-line',
        wordWrap: 'break-word',
        margin: 0,
        padding: 0,
        lineHeight: '1.5'
      }}>
        <MathJax>{processedContent}</MathJax>
      </div>
    </MathJaxContext>
  );
};

export default MathJaxContent;

