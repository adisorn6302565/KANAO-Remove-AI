import React from 'react';
import { FeatureItem, Language } from '../types';
import { FeatureIcon } from './FeatureIcon';
import { UI_TEXT } from '../locales/i18n';
import { X, Info } from 'lucide-react';

interface InfoModalProps {
  feature: FeatureItem | null;
  lang: Language;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ feature, lang, onClose }) => {
  if (!feature) return null;
  const t = UI_TEXT[lang];

  const title = lang === 'th' ? feature.nameTh : feature.name;
  const description = lang === 'th' ? feature.descriptionTh : feature.description;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card info-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <FeatureIcon name={feature.iconName} size={20} />
            </div>
            <div>
              <h2 className="modal-title">{title}</h2>
              <span className="modal-category-tag">{feature.category} Module</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-detail-box">
            <div className="info-desc-heading">
              <Info size={16} />
              <span>{t.infoScope}</span>
            </div>
            <p className="info-detail-text">{description}</p>
          </div>

          <div className="info-meta-row">
            <span className="meta-label">{t.engineParam}</span>
            <code className="meta-code">{feature.functionName}</code>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
