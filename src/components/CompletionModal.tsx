import React from 'react';
import { EngineRunResult, Language } from '../types';
import { CheckCircle2, AlertOctagon, RotateCw, FileText, X } from 'lucide-react';
import { UI_TEXT } from '../locales/i18n';

interface CompletionModalProps {
  result: EngineRunResult | null;
  lang: Language;
  onClose: () => void;
  onRestartSystem: () => void;
  onOpenLog: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  result,
  lang,
  onClose,
  onRestartSystem,
  onOpenLog,
}) => {
  if (!result) return null;
  const t = UI_TEXT[lang];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card completion-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className={`modal-icon-badge ${result.success ? 'success-badge' : 'error-badge'}`}>
              {result.success ? <CheckCircle2 size={24} /> : <AlertOctagon size={24} />}
            </div>
            <div>
              <h2 className="modal-title">
                {result.cancelled
                  ? t.completeCancelled
                  : result.success
                  ? t.completeSuccess
                  : t.completeErrors}
              </h2>
              <span className="modal-category-tag">
                {result.success ? t.allApplied : `Exit Code: ${result.exit_code}`}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {result.success ? (
            <div className="completion-content">
              <p className="completion-message">{t.successMsg}</p>
              <div className="restart-recommendation">
                <RotateCw size={22} className="spin-slow text-accent" />
                <div>
                  <strong>{t.restartRequiredTitle}</strong>
                  <p>{t.restartRequiredMsg}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="completion-content">
              <p className="completion-message error-message">{t.errorMsg}</p>
              <div className="log-summary-box">
                <span>{t.totalErrors} <strong>{result.error_count}</strong></span>
              </div>
            </div>
          )}

          <div className="log-path-preview">
            <span className="meta-label">{t.sessionLog}</span>
            <code className="meta-code text-truncate" title={result.log_file}>
              {result.log_file}
            </code>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onOpenLog}>
            <FileText size={15} />
            <span>{t.btnViewLog}</span>
          </button>

          {result.success && (
            <button className="btn btn-primary btn-accent" onClick={onRestartSystem}>
              <RotateCw size={15} />
              <span>{t.btnRestartNow}</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={onClose}>
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
