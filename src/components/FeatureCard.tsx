import React from 'react';
import { FeatureItem, Language } from '../types';
import { FeatureIcon } from './FeatureIcon';
import { HelpCircle } from 'lucide-react';

interface FeatureCardProps {
  feature: FeatureItem;
  lang: Language;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onShowInfo: (feature: FeatureItem) => void;
  disabled?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  lang,
  isSelected,
  onToggle,
  onShowInfo,
  disabled = false,
}) => {
  const title = lang === 'th' ? feature.nameTh : feature.name;
  const description = lang === 'th' ? feature.descriptionTh : feature.description;

  return (
    <div
      className={`feature-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.info-trigger')) return;
        if (!disabled) onToggle(feature.id);
      }}
    >
      <div className="card-icon-container">
        <FeatureIcon name={feature.iconName} size={20} className="card-icon" />
      </div>

      <div className="card-body">
        <div className="card-title-row">
          <h3 className="card-title">{title}</h3>
        </div>
        <p className="card-desc" title={description}>
          {description}
        </p>
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="info-trigger"
          onClick={(e) => {
            e.stopPropagation();
            onShowInfo(feature);
          }}
          title={lang === 'th' ? 'ดูรายละเอียดและคำอธิบาย' : 'Details and explanation'}
        >
          <HelpCircle size={15} />
        </button>

        <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={disabled}
            onChange={() => onToggle(feature.id)}
          />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
};
