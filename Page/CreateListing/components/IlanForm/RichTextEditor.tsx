'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import './RichTextEditor.css';

// react-quill SSR'da çalışmaz, dynamic import gerekli
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="rte-loading">
      <div className="rte-loading-inner">Editör yükleniyor...</div>
    </div>
  ),
});

// Quill styles - only on client
if (typeof window !== 'undefined') {
  // CSS import in useEffect to avoid SSR issues
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  id?: string;
  maxLength?: number;
}

interface FormatState {
  font: string;
  size: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  background: boolean | string;
}

const DEFAULT_FORMATS: FormatState = {
  font: 'arial',
  size: '12',
  bold: false,
  italic: false,
  underline: false,
  color: '#000000',
  background: false,
};

const FONT_LIST = [
  'system-ui', 'segoe-ui', 'roboto', 'helvetica-neue',
  'arial', 'times-new-roman', 'courier-new', 'verdana', 'georgia',
  'helvetica', 'tahoma', 'trebuchet-ms', 'arial-black',
  'times', 'book-antiqua', 'palatino', 'garamond', 'baskerville',
  'calibri', 'arial-narrow', 'franklin-gothic', 'century-gothic',
  'consolas', 'monaco', 'lucida-console',
  'papyrus', 'brush-script', 'comic-sans-ms', 'impact', 'chiller',
];

const SIZE_LIST = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72', '96'];

const getTextLength = (html: string): number => {
  if (!html || typeof window === 'undefined') return 0;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').length;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Ürününüzü detaylı olarak açıklayın...',
  className = '',
  error = false,
  id = 'description-editor',
  maxLength = 800,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const [quillLoaded, setQuillLoaded] = useState(false);

  const [currentFormats, setCurrentFormats] = useState<FormatState>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORMATS;
    try {
      const saved = localStorage.getItem('richTextEditorFormats');
      return saved ? JSON.parse(saved) : DEFAULT_FORMATS;
    } catch {
      return DEFAULT_FORMATS;
    }
  });

  // Import quill.css on client
  useEffect(() => {
    import('react-quill/dist/quill.snow.css').catch(() => {});
  }, []);

  // Register Quill fonts/sizes after it loads
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Quill = require('quill');
        const Font = Quill.import('formats/font');
        Font.whitelist = FONT_LIST;
        Quill.register(Font, true);

        const Size = Quill.import('formats/size');
        Size.whitelist = SIZE_LIST;
        Quill.register(Size, true);

        setQuillLoaded(true);
      } catch { /* ignore */ }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [[
        { font: FONT_LIST },
        { size: SIZE_LIST },
        'bold', 'italic', 'underline',
        { color: [] },
        { background: [] },
      ]],
    },
    clipboard: { matchVisual: false },
  }), []);

  const formats = ['font', 'size', 'bold', 'italic', 'underline', 'color', 'background'];

  const handleChange = (content: string) => {
    if (getTextLength(content) > maxLength) return;
    onChange?.(content);
  };

  const saveFormats = (f: FormatState) => {
    setCurrentFormats(f);
    try { localStorage.setItem('richTextEditorFormats', JSON.stringify(f)); } catch { /* ignore */ }
  };

  const currentLength = getTextLength(value);
  const isOver = currentLength > maxLength;

  return (
    <div className={`rte-container ${className} ${error ? 'rte-error' : ''}`}>
      <ReactQuill
        ref={quillRef}
        id={id}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="rte-editor custom-toolbar"
      />
      <div className="rte-character-counter-inline">
        <span className={`rte-counter-text ${isOver ? 'rte-counter-over' : ''}`}>
          {currentLength}/{maxLength}
        </span>
      </div>
    </div>
  );
};

export default RichTextEditor;
