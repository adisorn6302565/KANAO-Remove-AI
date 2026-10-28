import React from 'react';
import {
  Key,
  FileText,
  EyeOff,
  PackageMinus,
  Layers,
  ShieldAlert,
  Trash2,
  SearchX,
  Clock,
  Edit3,
  Image,
  Palette,
  Scissors,
  FileCode,
  Camera,
  Settings,
} from 'lucide-react';

interface FeatureIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const FeatureIcon: React.FC<FeatureIconProps> = ({ name, size = 18, className }) => {
  switch (name) {
    case 'Key':
      return <Key size={size} className={className} />;
    case 'FileText':
      return <FileText size={size} className={className} />;
    case 'EyeOff':
      return <EyeOff size={size} className={className} />;
    case 'PackageMinus':
      return <PackageMinus size={size} className={className} />;
    case 'Layers':
      return <Layers size={size} className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert size={size} className={className} />;
    case 'Trash2':
      return <Trash2 size={size} className={className} />;
    case 'SearchX':
      return <SearchX size={size} className={className} />;
    case 'Clock':
      return <Clock size={size} className={className} />;
    case 'Edit3':
      return <Edit3 size={size} className={className} />;
    case 'Image':
      return <Image size={size} className={className} />;
    case 'Palette':
      return <Palette size={size} className={className} />;
    case 'Scissors':
      return <Scissors size={size} className={className} />;
    case 'FileCode':
      return <FileCode size={size} className={className} />;
    case 'Camera':
      return <Camera size={size} className={className} />;
    default:
      return <Settings size={size} className={className} />;
  }
};
