export type FeatureCategory = 'Core' | 'Package' | 'Deep' | 'App' | 'Classic';

export type Language = 'th' | 'en';

export interface FeatureItem {
  id: string;
  name: string;
  description: string;
  nameTh: string;
  descriptionTh: string;
  functionName: string;
  category: FeatureCategory;
  iconName: string;
  defaultSelected?: boolean;
}

export interface LogEntry {
  id: string;
  line: string;
  isError: boolean;
  timestamp: string;
}

export interface EngineRunResult {
  success: boolean;
  exit_code: number;
  error_count: number;
  cancelled: boolean;
  log_file: string;
}
