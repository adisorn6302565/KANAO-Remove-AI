import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AI_FEATURES, CLASSIC_APPS } from './data/features';
import { FeatureCategory, FeatureItem, LogEntry, EngineRunResult, Language } from './types';
import { UI_TEXT } from './locales/i18n';
import { Header } from './components/Header';
import { FeatureCard } from './components/FeatureCard';
import { LogViewer } from './components/LogViewer';
import { InfoModal } from './components/InfoModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CompletionModal } from './components/CompletionModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { Zap, Sparkles } from 'lucide-react';
import './App.css';

type TabType = 'all' | FeatureCategory;

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('th');
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [revertMode, setRevertMode] = useState<boolean>(false);
  const [backupMode, setBackupMode] = useState<boolean>(false);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(
    () => new Set(AI_FEATURES.filter((f) => f.defaultSelected).map((f) => f.id))
  );
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>('พร้อมใช้งาน');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [latestLogLine, setLatestLogLine] = useState<string>('');

  const [infoFeature, setInfoFeature] = useState<FeatureItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [completionResult, setCompletionResult] = useState<EngineRunResult | null>(null);

  const t = UI_TEXT[lang];

  // Check admin privileges on startup
  useEffect(() => {
    invoke<boolean>('check_admin')
      .then((res) => setIsAdmin(res))
      .catch((err) => {
        console.error('Failed to check admin status:', err);
      });
  }, []);

  // Listen for backend log and status events
  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenLog = await listen<{ line: string; is_error: boolean; timestamp: string }>(
        'engine-log',
        (event) => {
          const { line, is_error, timestamp } = event.payload;
          setLatestLogLine(line);
          setLogs((prev) => {
            const next = [
              ...prev,
              {
                id: Math.random().toString(36).substring(2, 9),
                line,
                isError: is_error,
                timestamp: timestamp || new Date().toLocaleTimeString(),
              },
            ];
            return next.length > 5000 ? next.slice(-4000) : next;
          });
        }
      );

      unlistenStatus = await listen<{ status: string }>('engine-status', (event) => {
        setStatus(event.payload.status);
      });
    };

    setupListeners();

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenStatus) unlistenStatus();
    };
  }, []);

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'th' ? 'en' : 'th'));
  };

  const handleRestartAsAdmin = async () => {
    try {
      await invoke('restart_as_admin');
    } catch (err) {
      alert(`ไม่สามารถรีสตาร์ตเป็น Administrator ได้: ${err}`);
    }
  };

  const handleToggleRevertMode = () => {
    setRevertMode((prev) => {
      const next = !prev;
      if (next) setBackupMode(false);
      return next;
    });
  };

  const handleToggleBackupMode = () => {
    setBackupMode((prev) => {
      const next = !prev;
      if (next) setRevertMode(false);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFeatureIds(new Set(AI_FEATURES.map((f) => f.id)));
    setSelectedAppIds(new Set(CLASSIC_APPS.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedFeatureIds(new Set());
    setSelectedAppIds(new Set());
  };

  const handleToggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleApp = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenLog = async () => {
    try {
      await invoke('open_log_file');
    } catch (err) {
      alert(`ไม่สามารถเปิดไฟล์ log ได้: ${err}`);
    }
  };

  const handleApplyClick = () => {
    if (selectedFeatureIds.size === 0 && selectedAppIds.size === 0) {
      alert(lang === 'th' ? 'กรุณาเลือกฟีเจอร์อย่างน้อย 1 รายการเพื่อดำเนินการ' : 'Please select at least one feature to proceed.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmApply = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    setStatus(lang === 'th' ? 'กำลังเริ่มต้นเอนจิน...' : 'Initializing engine...');
    setLogs([]);

    const options = AI_FEATURES.filter((f) => selectedFeatureIds.has(f.id)).map(
      (f) => f.functionName
    );
    const classicApps = CLASSIC_APPS.filter((a) => selectedAppIds.has(a.id)).map(
      (a) => a.functionName
    );

    try {
      const result = await invoke<EngineRunResult>('run_engine', {
        options,
        classicApps,
        revertMode,
        backupMode,
      });
      setCompletionResult(result);
    } catch (err) {
      setCompletionResult({
        success: false,
        exit_code: -1,
        error_count: 1,
        cancelled: false,
        log_file: `${err}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    const confirmText = lang === 'th'
      ? 'ต้องการหยุดการทำงานปัจจุบันหรือไม่?\nการเปลี่ยนแปลงที่ทำไปแล้วจะไม่ถูกย้อนกลับ'
      : 'Stop current operation?\nChanges already made will not be rolled back.';
    if (confirm(confirmText)) {
      try {
        await invoke('cancel_engine');
        setStatus(lang === 'th' ? 'ยกเลิกโดยผู้ใช้' : 'Cancelled by user');
      } catch (err) {
        console.error('Cancel failed:', err);
      }
    }
  };

  const handleRestartSystem = async () => {
    try {
      await invoke('restart_system');
    } catch (err) {
      alert(`Restart failed: ${err}`);
    }
  };

  // Filter features based on active tab
  const getVisibleFeatures = () => {
    if (activeTab === 'all') return AI_FEATURES;
    if (activeTab === 'Classic') return [];
    return AI_FEATURES.filter((f) => f.category === activeTab);
  };

  const getVisibleApps = () => {
    if (activeTab === 'all' || activeTab === 'Classic') return CLASSIC_APPS;
    return [];
  };

  const visibleFeatures = getVisibleFeatures();
  const visibleApps = getVisibleApps();
  const totalSelected = selectedFeatureIds.size + selectedAppIds.size;

  const getCategoryTitle = () => {
    switch (activeTab) {
      case 'Core':
        return t.tabCore;
      case 'Package':
        return t.tabPackage;
      case 'Deep':
        return t.tabDeep;
      case 'App':
        return t.tabApp;
      default:
        return t.featuresHeading;
    }
  };

  return (
    <div className="app-container">
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        isAdmin={isAdmin}
        onRestartAsAdmin={handleRestartAsAdmin}
        revertMode={revertMode}
        onToggleRevertMode={handleToggleRevertMode}
        backupMode={backupMode}
        onToggleBackupMode={handleToggleBackupMode}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onOpenLog={handleOpenLog}
        isProcessing={isProcessing}
      />

      <nav className="nav-tabs-wrapper">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>{t.tabAll}</span>
          <span className="tab-badge">{AI_FEATURES.length + CLASSIC_APPS.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'Core' ? 'active' : ''}`}
          onClick={() => setActiveTab('Core')}
        >
          <span>{t.tabCore}</span>
          <span className="tab-badge">{AI_FEATURES.filter((f) => f.category === 'Core').length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'Package' ? 'active' : ''}`}
          onClick={() => setActiveTab('Package')}
        >
          <span>{t.tabPackage}</span>
          <span className="tab-badge">{AI_FEATURES.filter((f) => f.category === 'Package').length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'Deep' ? 'active' : ''}`}
          onClick={() => setActiveTab('Deep')}
        >
          <span>{t.tabDeep}</span>
          <span className="tab-badge">{AI_FEATURES.filter((f) => f.category === 'Deep').length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'App' ? 'active' : ''}`}
          onClick={() => setActiveTab('App')}
        >
          <span>{t.tabApp}</span>
          <span className="tab-badge">{AI_FEATURES.filter((f) => f.category === 'App').length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'Classic' ? 'active' : ''}`}
          onClick={() => setActiveTab('Classic')}
        >
          <span>{t.tabClassic}</span>
          <span className="tab-badge">{CLASSIC_APPS.length}</span>
        </button>
      </nav>

      <main className="main-content">
        {visibleFeatures.length > 0 && (
          <section className="category-section">
            <div className="section-header">
              <div className="section-title-group">
                <Sparkles size={16} className="text-accent" />
                <h2 className="section-title">{getCategoryTitle()}</h2>
              </div>
              <span className="section-subtitle">
                {t.selectedCount} {visibleFeatures.filter((f) => selectedFeatureIds.has(f.id)).length} {t.ofTotal}{' '}
                {visibleFeatures.length} {t.items}
              </span>
            </div>

            <div className="features-grid">
              {visibleFeatures.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  lang={lang}
                  isSelected={selectedFeatureIds.has(feature.id)}
                  onToggle={handleToggleFeature}
                  onShowInfo={setInfoFeature}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </section>
        )}

        {visibleApps.length > 0 && (
          <section className="category-section">
            <div className="section-header">
              <div className="section-title-group">
                <Sparkles size={16} className="text-accent" />
                <h2 className="section-title">{t.classicAppsHeading}</h2>
              </div>
              <span className="section-subtitle">
                {t.selectedCount} {visibleApps.filter((a) => selectedAppIds.has(a.id)).length} {t.ofTotal}{' '}
                {visibleApps.length} {t.items}
              </span>
            </div>

            <div className="features-grid">
              {visibleApps.map((app) => (
                <FeatureCard
                  key={app.id}
                  feature={app}
                  lang={lang}
                  isSelected={selectedAppIds.has(app.id)}
                  onToggle={handleToggleApp}
                  onShowInfo={setInfoFeature}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer-bar">
        <div className="footer-left">
          <div className="selection-summary">
            <span>{t.selectedCount}:</span>
            <span className="selection-badge">{totalSelected} {t.items}</span>
          </div>
          <span className="status-label">• {status}</span>
        </div>

        <div className="footer-right">
          <button
            type="button"
            className="btn btn-primary btn-apply-main"
            onClick={handleApplyClick}
            disabled={isProcessing || totalSelected === 0}
          >
            <Zap size={16} />
            <span>{revertMode ? t.revertChanges : t.applyChanges}</span>
          </button>
        </div>
      </footer>

      <LogViewer logs={logs} lang={lang} onClear={() => setLogs([])} status={status} />

      <InfoModal feature={infoFeature} lang={lang} onClose={() => setInfoFeature(null)} />

      <ConfirmModal
        isOpen={showConfirmModal}
        lang={lang}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmApply}
        featureCount={selectedFeatureIds.size}
        appCount={selectedAppIds.size}
        revertMode={revertMode}
        backupMode={backupMode}
      />

      <CompletionModal
        result={completionResult}
        lang={lang}
        onClose={() => setCompletionResult(null)}
        onRestartSystem={handleRestartSystem}
        onOpenLog={handleOpenLog}
      />

      <ProcessingOverlay
        isProcessing={isProcessing}
        status={status}
        latestLogLine={latestLogLine}
        lang={lang}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default App;
