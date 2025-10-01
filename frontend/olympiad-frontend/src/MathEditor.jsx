import React, { useState, useRef, useEffect } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const MathEditor = ({ isOpen, onClose, onInsert, initialValue = "" }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [mathInput, setMathInput] = useState(initialValue);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  const symbolCategories = {
    basic: {
      name: 'Basic',
      symbols: [
        { symbol: '+', latex: '+' },
        { symbol: '-', latex: '-' },
        { symbol: '×', latex: '\\times' },
        { symbol: '÷', latex: '\\div' },
        { symbol: '=', latex: '=' },
        { symbol: '≠', latex: '\\neq' },
        { symbol: '<', latex: '<' },
        { symbol: '>', latex: '>' },
        { symbol: '≤', latex: '\\leq' },
        { symbol: '≥', latex: '\\geq' },
        { symbol: '±', latex: '\\pm' },
        { symbol: '∓', latex: '\\mp' },
        { symbol: '∞', latex: '\\infty' },
        { symbol: '∅', latex: '\\emptyset' }
      ]
    },
    fractions: {
      name: 'Fractions',
      symbols: [
        { symbol: '½', latex: '\\frac{1}{2}' },
        { symbol: '⅓', latex: '\\frac{1}{3}' },
        { symbol: '¼', latex: '\\frac{1}{4}' },
        { symbol: '⅔', latex: '\\frac{2}{3}' },
        { symbol: '¾', latex: '\\frac{3}{4}' },
        { symbol: 'Fraction', latex: '\\frac{}{}', template: true },
        { symbol: 'Mixed', latex: '\\frac{}{} \\frac{}{}', template: true }
      ]
    },
    powers: {
      name: 'Powers',
      symbols: [
        { symbol: 'x²', latex: 'x^2' },
        { symbol: 'x³', latex: 'x^3' },
        { symbol: 'xⁿ', latex: 'x^n' },
        { symbol: '√', latex: '\\sqrt{}', template: true },
        { symbol: '∛', latex: '\\sqrt[3]{}', template: true },
        { symbol: '∜', latex: '\\sqrt[4]{}', template: true },
        { symbol: 'x₁', latex: 'x_1' },
        { symbol: 'x₂', latex: 'x_2' }
      ]
    },
    integrals: {
      name: 'Integrals',
      symbols: [
        { symbol: '∫', latex: '\\int' },
        { symbol: '∬', latex: '\\iint' },
        { symbol: '∭', latex: '\\iiint' },
        { symbol: '∮', latex: '\\oint' },
        { symbol: '∫₀^∞', latex: '\\int_0^{\\infty}', template: true },
        { symbol: '∫_a^b', latex: '\\int_a^b', template: true }
      ]
    },
    derivatives: {
      name: 'Derivatives',
      symbols: [
        { symbol: '∂', latex: '\\partial' },
        { symbol: 'd/dx', latex: '\\frac{d}{dx}', template: true },
        { symbol: 'd²/dx²', latex: '\\frac{d^2}{dx^2}', template: true },
        { symbol: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}', template: true },
        { symbol: '∇', latex: '\\nabla' },
        { symbol: 'Δ', latex: '\\Delta' }
      ]
    },
    greek: {
      name: 'Greek',
      symbols: [
        { symbol: 'α', latex: '\\alpha' },
        { symbol: 'β', latex: '\\beta' },
        { symbol: 'γ', latex: '\\gamma' },
        { symbol: 'δ', latex: '\\delta' },
        { symbol: 'ε', latex: '\\varepsilon' },
        { symbol: 'ζ', latex: '\\zeta' },
        { symbol: 'η', latex: '\\eta' },
        { symbol: 'θ', latex: '\\theta' },
        { symbol: 'λ', latex: '\\lambda' },
        { symbol: 'μ', latex: '\\mu' },
        { symbol: 'π', latex: '\\pi' },
        { symbol: 'σ', latex: '\\sigma' },
        { symbol: 'τ', latex: '\\tau' },
        { symbol: 'φ', latex: '\\phi' },
        { symbol: 'ψ', latex: '\\psi' },
        { symbol: 'ω', latex: '\\omega' }
      ]
    },
    sets: {
      name: 'Sets',
      symbols: [
        { symbol: '∈', latex: '\\in' },
        { symbol: '∉', latex: '\\notin' },
        { symbol: '⊂', latex: '\\subset' },
        { symbol: '⊃', latex: '\\supset' },
        { symbol: '∪', latex: '\\cup' },
        { symbol: '∩', latex: '\\cap' },
        { symbol: 'ℝ', latex: '\\mathbb{R}' },
        { symbol: 'ℕ', latex: '\\mathbb{N}' },
        { symbol: 'ℤ', latex: '\\mathbb{Z}' },
        { symbol: 'ℚ', latex: '\\mathbb{Q}' },
        { symbol: 'ℂ', latex: '\\mathbb{C}' }
      ]
    },
    arrows: {
      name: 'Arrows',
      symbols: [
        { symbol: '→', latex: '\\rightarrow' },
        { symbol: '←', latex: '\\leftarrow' },
        { symbol: '↔', latex: '\\leftrightarrow' },
        { symbol: '⇒', latex: '\\Rightarrow' },
        { symbol: '⇐', latex: '\\Leftarrow' },
        { symbol: '⇔', latex: '\\Leftrightarrow' },
        { symbol: '↑', latex: '\\uparrow' },
        { symbol: '↓', latex: '\\downarrow' },
        { symbol: '↗', latex: '\\nearrow' },
        { symbol: '↘', latex: '\\searrow' }
      ]
    },
    functions: {
      name: 'Functions',
      symbols: [
        { symbol: 'sin', latex: '\\sin' },
        { symbol: 'cos', latex: '\\cos' },
        { symbol: 'tan', latex: '\\tan' },
        { symbol: 'log', latex: '\\log' },
        { symbol: 'ln', latex: '\\ln' },
        { symbol: 'exp', latex: '\\exp' },
        { symbol: 'lim', latex: '\\lim', template: true },
        { symbol: 'max', latex: '\\max' },
        { symbol: 'min', latex: '\\min' },
        { symbol: 'sup', latex: '\\sup' },
        { symbol: 'inf', latex: '\\inf' },
        { symbol: '∑', latex: '\\sum', template: true },
        { symbol: '∏', latex: '\\prod', template: true }
      ]
    }
  };

  const insertSymbol = (symbolData) => {
    const { latex, template } = symbolData;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = mathInput;
    
    let newText;
    if (template) {
      // For templates, insert and position cursor
      newText = text.substring(0, start) + latex + text.substring(end);
      setMathInput(newText);
      
      // Position cursor inside the first {} if it exists
      setTimeout(() => {
        const newPosition = start + latex.indexOf('{}') + 1;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    } else {
      newText = text.substring(0, start) + latex + text.substring(end);
      setMathInput(newText);
      
      // Position cursor after the inserted symbol
      setTimeout(() => {
        const newPosition = start + latex.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  const handleInsert = () => {
    onInsert(mathInput);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Insert spaces for indentation
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const text = mathInput;
      const newText = text.substring(0, start) + '  ' + text.substring(end);
      setMathInput(newText);
      
      setTimeout(() => {
        const newPosition = start + 2;
        e.target.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="math-editor-overlay">
      <div className="math-editor">
        <div className="math-editor-header">
          <h3>Math Editor</h3>
          <button onClick={handleCancel} className="close-btn">×</button>
        </div>
        
        <div className="math-toolbar">
          <div className="toolbar-tabs">
            {Object.entries(symbolCategories).map(([key, category]) => (
              <button
                key={key}
                className={activeTab === key ? 'active' : ''}
                onClick={() => setActiveTab(key)}
              >
                {category.name}
              </button>
            ))}
          </div>
          
          <div className="symbol-grid">
            {symbolCategories[activeTab].symbols.map((symbolData, index) => (
              <button
                key={index}
                className="symbol-btn"
                onClick={() => insertSymbol(symbolData)}
                title={symbolData.latex}
              >
                {symbolData.symbol}
              </button>
            ))}
          </div>
        </div>
        
        <div className="math-input-area">
          <div className="input-section">
            <label>LaTeX Input:</label>
            <textarea
              ref={textareaRef}
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type LaTeX or click symbols above..."
              className="math-textarea"
            />
          </div>
          
          <div className="preview-section">
            <label>Preview:</label>
            <div className="math-preview">
              {mathInput ? (
                <BlockMath math={mathInput} />
              ) : (
                <div className="preview-placeholder">Math preview will appear here...</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="math-actions">
          <button onClick={handleCancel} className="cancel-btn">Cancel</button>
          <button onClick={handleInsert} className="insert-btn">Insert Math</button>
        </div>
      </div>
    </div>
  );
};

export default MathEditor;
