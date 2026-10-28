import React, { useState, useRef, useEffect } from 'react';
import { LogEntry, Language } from '../types';
import { UI_TEXT } from '../locales/i18n';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check } from 'lucide-react';

interface LogViewerProps {
  logs: LogEntry[];
  lang: Language;
  onClear: () => void;
  status: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, lang, onClear, status }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = UI_TEXT[lang];

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.isError ? 'ERROR: ' : ''}${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`log-viewer-container ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="log-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="log-header-left">
          <Terminal size={16} className="terminal-icon" />
          <span className="log-title">{t.consoleTitle}</span>
          <span className="log-status-pill">{status}</span>
          <span className="log-count">({logs.length} {t.entries})</span>
        </div>

        <div className="log-header-right">
          {isOpen && (
            <>
              <button
                type="button"
                className="log-btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                title={lang === 'th' ? 'คัดลอกข้อความทั้งหมดลง Clipboard' : 'Copy all logs'}
              >
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                <span>{copied ? t.copied : t.copy}</span>
              </button>
              <button
                type="button"
                className="log-btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                title={lang === 'th' ? 'ล้างหน้าต่างคอนโซล' : 'Clear console'}
              >
                <Trash2 size={13} />
                <span>{t.clear}</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="log-toggle-btn"
            title={isOpen ? 'Collapse console' : 'Expand console'}
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="log-body" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="log-empty">{t.noConsoleActivity}</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`log-line ${log.isError ? 'log-error' : ''} ${
                  log.line.startsWith('>') ? 'log-command' : ''
                } ${log.line.startsWith('✅') ? 'log-success' : ''}`}
              >
                <span className="log-time">[{log.timestamp}]</span>
                <span className="log-prefix">{log.isError ? '❌ ' : log.line.startsWith('>') ? '$ ' : '▸ '}</span>
                <span className="log-content">{log.line}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
