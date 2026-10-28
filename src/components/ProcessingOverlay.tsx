import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../locales/i18n';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  status: string;
  latestLogLine: string;
  lang: Language;
  onCancel: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isProcessing,
  status,
  latestLogLine,
  lang,
  onCancel,
}) => {
  if (!isProcessing) return null;
  const t = UI_TEXT[lang];

  return (
    <div className="processing-overlay">
      <div className="processing-card">
        <div className="spinner-wrapper">
          <Loader2 size={46} className="processing-spinner" />
        </div>

        <h3 className="processing-title">{t.processingTitle}</h3>
        <p className="processing-status">{status || 'Processing engine commands...'}</p>

        {latestLogLine && (
          <div className="processing-log-snippet">
            <span className="snippet-prefix">▸</span>
            <span className="snippet-text">{latestLogLine}</span>
          </div>
        )}

        <div className="processing-actions">
          <button type="button" className="btn btn-danger-outline" onClick={onCancel}>
            <XCircle size={16} />
            <span>{t.btnCancelOp}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
