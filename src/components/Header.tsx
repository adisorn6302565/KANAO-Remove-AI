import React from 'react';
import { ShieldCheck, ShieldAlert, RotateCcw, Save, CheckSquare, Square, FileText, RefreshCw, Languages } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../locales/i18n';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isAdmin: boolean;
  onRestartAsAdmin: () => void;
  revertMode: boolean;
  onToggleRevertMode: () => void;
  backupMode: boolean;
  onToggleBackupMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenLog: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isAdmin,
  onRestartAsAdmin,
  revertMode,
  onToggleRevertMode,
  backupMode,
  onToggleBackupMode,
  onSelectAll,
  onDeselectAll,
  onOpenLog,
  isProcessing,
}) => {
  const t = UI_TEXT[lang];

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="title-section">
          <div className="title-row">
            <span className="logo-badge">⚡</span>
            <h1 className="title-text">{t.appTitle}</h1>
          </div>
          <p className="subtitle-text">{t.appSubtitle}</p>
        </div>

        <div className="header-top-right">
          <button
            type="button"
            className="lang-toggle-btn"
            onClick={onToggleLang}
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Languages size={15} />
            <span>{lang === 'th' ? 'EN' : 'ไทย'}</span>
          </button>

          <div className="admin-status-wrapper">
            {isAdmin ? (
              <div className="admin-badge admin-ok" title={t.adminOk}>
                <ShieldCheck size={16} />
                <span>{t.adminOk}</span>
              </div>
            ) : (
              <div className="admin-badge admin-warn" title={t.adminWarn}>
                <ShieldAlert size={16} />
                <span>{t.adminWarn}</span>
                <button
                  className="btn-elevate"
                  onClick={onRestartAsAdmin}
                  disabled={isProcessing}
                  title={t.relaunchAdmin}
                >
                  <RefreshCw size={12} />
                  <span>{t.relaunchAdmin}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="header-controls">
        <div className="modes-wrapper">
          <button
            type="button"
            className={`mode-pill ${revertMode ? 'active-revert' : ''}`}
            onClick={onToggleRevertMode}
            disabled={isProcessing}
            title={t.revertModeTip}
          >
            <RotateCcw size={15} />
            <span>{t.revertMode}</span>
            <span className="mode-indicator">{revertMode ? 'เปิด' : 'ปิด'}</span>
          </button>

          <button
            type="button"
            className={`mode-pill ${backupMode ? 'active-backup' : ''}`}
            onClick={onToggleBackupMode}
            disabled={isProcessing}
            title={t.backupModeTip}
          >
            <Save size={15} />
            <span>{t.backupMode}</span>
            <span className="mode-indicator">{backupMode ? 'เปิด' : 'ปิด'}</span>
          </button>
        </div>

        <div className="actions-wrapper">
          <button
            type="button"
            className="action-btn"
            onClick={onSelectAll}
            disabled={isProcessing}
            title={t.selectAll}
          >
            <CheckSquare size={14} />
            <span>{t.selectAll}</span>
          </button>

          <button
            type="button"
            className="action-btn"
            onClick={onDeselectAll}
            disabled={isProcessing}
            title={t.deselectAll}
          >
            <Square size={14} />
            <span>{t.deselectAll}</span>
          </button>

          <button
            type="button"
            className="action-btn log-btn"
            onClick={onOpenLog}
            title={t.openLog}
          >
            <FileText size={14} />
            <span>{t.openLog}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
