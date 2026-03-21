export type Tags = Record<string, string>;

export interface CostRecord {
  id: string;
  timestamp: string;        // ISO 8601
  tags: Tags;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  metadata?: Record<string, unknown>;
}

export interface RecordInput {
  tags: Tags;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelPricing {
  input: number;   // USD per million tokens
  output: number;  // USD per million tokens
}

export interface StorageAdapter {
  append(records: CostRecord[]): Promise<void>;
  query(filters: QueryFilters): Promise<CostRecord[]>;
  purge(filters: QueryFilters): Promise<number>;
  close(): Promise<void>;
}

export type StorageConfig =
  | { type: 'memory' }
  | { type: 'file'; path: string }
  | { type: 'custom'; adapter: StorageAdapter };

export interface QueryFilters {
  from?: string;       // ISO 8601
  to?: string;         // ISO 8601
  tags?: Tags;
  models?: string[];
  providers?: string[];
}

export interface ChargebackConfig {
  storage: StorageConfig;
  pricing?: Record<string, ModelPricing>;
  buffer?: { maxRecords: number; maxIntervalMs: number };
  defaultTags?: Tags;
  allowedTagKeys?: string[] | 'any';
  requiredTagKeys?: string[];
}

export interface TaggedClientOptions {
  tags?: Tags;
  tracker?: CostTracker;
}

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ReportOptions {
  from?: string;
  to?: string;
  groupBy?: string[];
  filter?: Tags;
  models?: string[];
  providers?: string[];
  timeSeries?: 'day' | 'week' | 'month';
  includeModelBreakdown?: boolean;
  limit?: number;
  sortBy?: 'cost-desc' | 'cost-asc' | 'name-asc' | 'name-desc' | 'calls-desc';
}

export interface ExportOptions extends ReportOptions {
  csvDelimiter?: string;       // default ','
  csvHeader?: boolean;         // default true
  markdownTitle?: string;      // default 'AI Cost Chargeback Report'
}

export interface CostTotals {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>;
  byProvider: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>;
}

export interface CostBreakdown {
  group: Tags;
  name: string;
  cost: number;
  percentage: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  byModel?: Record<string, { cost: number; percentage: number }>;
}

export interface TimeSeriesEntry {
  period: string;      // ISO 8601
  label: string;
  cost: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  groups?: Record<string, { cost: number; calls: number }>;
}

export interface ChargebackReport {
  metadata: {
    generatedAt: string;
    from?: string;
    to?: string;
    groupBy: string[];
    filters: Tags;
    totalRecords: number;
  };
  totals: CostTotals;
  groups: CostBreakdown[];
  timeSeries?: TimeSeriesEntry[];
}

export interface CostTracker {
  record(input: RecordInput): Promise<CostRecord>;
  report(options?: ReportOptions): Promise<ChargebackReport>;
  export(format: ExportFormat, options?: ExportOptions): Promise<string>;
  query(filters?: QueryFilters): Promise<CostRecord[]>;
  flush(): Promise<void>;
  purge(filters: QueryFilters): Promise<number>;
  close(): Promise<void>;
  count(filters?: QueryFilters): Promise<number>;
}
