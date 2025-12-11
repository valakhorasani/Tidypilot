
export interface DataRow {
  [key: string]: any;
}

export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'mixed';

export interface ColumnIssue {
  type: 'missing' | 'duplicate_rows' | 'inconsistent_category' | 'mixed_types' | 'outlier' | 'invalid_date' | 'validation_error';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  count: number;
  examples: string[];
  isAnomaly?: boolean;
  isLowConfidence?: boolean;
}

export interface ColumnProfile {
  name: string;
  inferredType: ColumnType;
  missingCount: number;
  uniqueCount: number;
  issues: ColumnIssue[];
  topCategories?: { value: string; count: number }[]; // Only for text
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
}

export interface DatasetStats {
  rowCount: number;
  columnCount: number;
  totalMissingCells: number;
  duplicateRows: number;
  columns: ColumnProfile[];
}

export interface AnalysisReport {
  stats: DatasetStats;
  preview: DataRow[];
}

export interface CleaningStep {
  stepNumber: number;
  title: string;
  action: string;
  reason: string;
  powerQuery: string;
  excel: string;
  risk: string;
}

export interface KPIMeasure {
  name: string;
  dax: string;
  description: string;
}

export interface BIModelingSuggestions {
  factMeasures: string[];
  dimensions: string[];
  starSchema: string;
  kpis: KPIMeasure[];
}

export interface CleaningPlan {
  steps: CleaningStep[];
  powerQuerySteps: string[];
  excelFormulas: { issue: string; formula: string }[];
  biModeling?: BIModelingSuggestions;
}

export interface AppSettings {
  autoClean: boolean;
  strictMode: boolean;
  outlierSensitivity: 'Low' | 'Medium' | 'High';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
