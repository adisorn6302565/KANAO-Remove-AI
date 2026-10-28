import React from 'react';
import { AlertTriangle, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../locales/i18n';

interface ConfirmModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onConfirm: () => void;
  featureCount: number;
  appCount: number;
  revertMode: boolean;
  backupMode: boolean;
  closesEdge: boolean;
  closesNotepad: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  lang,
  onClose,
  onConfirm,
  featureCount,
  appCount,
  revertMode,
  backupMode,
  closesEdge,
  closesNotepad,
}) => {
  if (!isOpen) return null;
  const t = UI_TEXT[lang];
  const total = featureCount + appCount;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge warning-badge">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="modal-title">{t.confirmTitle}</h2>
              <span className="modal-category-tag">{t.confirmSub}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="confirm-main-text">
            {t.confirmMsgPrefix} <strong>{total} {t.items}</strong>:
          </p>

          <ul className="confirm-list">
            {featureCount > 0 && (
              <li>
                <ShieldCheck size={16} className="text-accent" />
                <span>
                  {t.confirmFeaturesPrefix} <strong>{featureCount}</strong> {t.items}
                </span>
              </li>
            )}
            {appCount > 0 && (
              <li>
                <ShieldCheck size={16} className="text-accent" />
                <span>
                  {t.confirmAppsPrefix} <strong>{appCount}</strong> {t.items}
                </span>
              </li>
            )}
          </ul>

          {revertMode && (
            <div className="notice-box warning-notice">
              <RotateCcw size={18} />
              <div>
                <strong>{t.revertNoticeTitle}</strong>
                <p>{t.revertNoticeMsg}</p>
              </div>
            </div>
          )}

          {backupMode && (
            <div className="notice-box backup-notice">
              <Save size={18} />
              <div>
                <strong>{t.backupNoticeTitle}</strong>
                <p>{t.backupNoticeMsg}</p>
              </div>
            </div>
          )}

          {(closesEdge || closesNotepad) && (
            <div className="notice-box warning-notice">
              <AlertTriangle size={18} />
              <div>
                <strong>{t.closeAppsNoticeTitle}</strong>
                {closesEdge && <p>{t.closeEdgeNoticeMsg}</p>}
                {closesNotepad && <p>{t.closeNotepadNoticeMsg}</p>}
              </div>
            </div>
          )}

          <p className="confirm-subtext">{t.confirmPrompt}</p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t.btnCancel}
          </button>
          <button className="btn btn-primary btn-accent" onClick={onConfirm}>
            {t.btnProceed}
          </button>
        </div>
      </div>
    </div>
  );
};
