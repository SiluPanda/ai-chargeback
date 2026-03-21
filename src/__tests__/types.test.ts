import { describe, it, expect } from 'vitest';
import type {
  CostRecord,
  RecordInput,
  ModelPricing,
  StorageAdapter,
  StorageConfig,
  QueryFilters,
  ChargebackConfig,
  TaggedClientOptions,
  ExportFormat,
  ExportOptions,
  ReportOptions,
  CostTotals,
  CostBreakdown,
  TimeSeriesEntry,
  ChargebackReport,
  CostTracker,
} from '../types';

describe('CostRecord shape', () => {
  it('has all required fields', () => {
    const record: CostRecord = {
      id: 'rec_abc123',
      timestamp: '2026-03-15T14:30:00.000Z',
      tags: { team: 'search' },
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 150,
      outputTokens: 42,
      totalTokens: 192,
      cost: 0.000795,
    };
    expect(record.id).toBe('rec_abc123');
    expect(record.timestamp).toBe('2026-03-15T14:30:00.000Z');
    expect(record.tags).toEqual({ team: 'search' });
    expect(record.model).toBe('gpt-4o');
    expect(record.provider).toBe('openai');
    expect(record.inputTokens).toBe(150);
    expect(record.outputTokens).toBe(42);
    expect(record.totalTokens).toBe(192);
    expect(record.cost).toBe(0.000795);
  });

  it('metadata is optional', () => {
    const withMeta: CostRecord = {
      id: 'rec_1',
      timestamp: '2026-03-15T14:30:00.000Z',
      tags: {},
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cost: 0.001,
      metadata: { requestId: 'req_xyz', latencyMs: 320 },
    };
    expect(withMeta.metadata).toEqual({ requestId: 'req_xyz', latencyMs: 320 });

    const withoutMeta: CostRecord = {
      id: 'rec_2',
      timestamp: '2026-03-15T14:30:00.000Z',
      tags: {},
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cost: 0.001,
    };
    expect(withoutMeta.metadata).toBeUndefined();
  });
});

describe('RecordInput shape', () => {
  it('requires tags, model, inputTokens, outputTokens', () => {
    const input: RecordInput = {
      tags: { team: 'search', project: 'autocomplete' },
      model: 'gpt-4o',
      inputTokens: 200,
      outputTokens: 80,
    };
    expect(input.tags).toEqual({ team: 'search', project: 'autocomplete' });
    expect(input.model).toBe('gpt-4o');
    expect(input.inputTokens).toBe(200);
    expect(input.outputTokens).toBe(80);
  });

  it('provider, cost, metadata are optional', () => {
    const minimal: RecordInput = {
      tags: {},
      model: 'claude-haiku',
      inputTokens: 100,
      outputTokens: 50,
    };
    expect(minimal.provider).toBeUndefined();
    expect(minimal.cost).toBeUndefined();
    expect(minimal.metadata).toBeUndefined();

    const full: RecordInput = {
      tags: { team: 'ml' },
      model: 'claude-haiku',
      provider: 'anthropic',
      inputTokens: 100,
      outputTokens: 50,
      cost: 0.0005,
      metadata: { feature: 'summarize' },
    };
    expect(full.provider).toBe('anthropic');
    expect(full.cost).toBe(0.0005);
    expect(full.metadata).toEqual({ feature: 'summarize' });
  });
});

describe('StorageConfig discriminated union', () => {
  it('memory type has only the type field', () => {
    const cfg: StorageConfig = { type: 'memory' };
    expect(cfg.type).toBe('memory');
  });

  it('file type has type and path fields', () => {
    const cfg: StorageConfig = { type: 'file', path: './ai-costs.json' };
    expect(cfg.type).toBe('file');
    if (cfg.type === 'file') {
      expect(cfg.path).toBe('./ai-costs.json');
    }
  });

  it('custom type has type and adapter fields', () => {
    const mockAdapter: StorageAdapter = {
      append: async () => {},
      query: async () => [],
      purge: async () => 0,
      close: async () => {},
    };
    const cfg: StorageConfig = { type: 'custom', adapter: mockAdapter };
    expect(cfg.type).toBe('custom');
    if (cfg.type === 'custom') {
      expect(typeof cfg.adapter.append).toBe('function');
      expect(typeof cfg.adapter.query).toBe('function');
      expect(typeof cfg.adapter.purge).toBe('function');
      expect(typeof cfg.adapter.close).toBe('function');
    }
  });
});

describe('ChargebackConfig', () => {
  it('requires storage; all others are optional', () => {
    const minimalConfig: ChargebackConfig = {
      storage: { type: 'memory' },
    };
    expect(minimalConfig.storage).toEqual({ type: 'memory' });
    expect(minimalConfig.pricing).toBeUndefined();
    expect(minimalConfig.buffer).toBeUndefined();
    expect(minimalConfig.defaultTags).toBeUndefined();
    expect(minimalConfig.allowedTagKeys).toBeUndefined();
    expect(minimalConfig.requiredTagKeys).toBeUndefined();
  });

  it('accepts all optional fields', () => {
    const fullConfig: ChargebackConfig = {
      storage: { type: 'file', path: './costs.json' },
      pricing: { 'gpt-4o': { input: 2.5, output: 10 } },
      buffer: { maxRecords: 100, maxIntervalMs: 5000 },
      defaultTags: { environment: 'production' },
      allowedTagKeys: ['team', 'project', 'feature'],
      requiredTagKeys: ['team'],
    };
    expect(fullConfig.pricing).toBeDefined();
    expect(fullConfig.buffer?.maxRecords).toBe(100);
    expect(fullConfig.allowedTagKeys).toEqual(['team', 'project', 'feature']);
  });

  it('allowedTagKeys can be the literal string any', () => {
    const cfg: ChargebackConfig = {
      storage: { type: 'memory' },
      allowedTagKeys: 'any',
    };
    expect(cfg.allowedTagKeys).toBe('any');
  });
});

describe('CostTracker interface', () => {
  it('can be mock-implemented with all 8 methods', () => {
    const mockRecord: CostRecord = {
      id: 'rec_1',
      timestamp: new Date().toISOString(),
      tags: { team: 'test' },
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cost: 0.0001,
    };

    const mockReport: ChargebackReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        groupBy: ['team'],
        filters: {},
        totalRecords: 1,
      },
      totals: {
        cost: 0.0001,
        inputTokens: 10,
        outputTokens: 5,
        calls: 1,
        byModel: {},
        byProvider: {},
      },
      groups: [],
    };

    const tracker: CostTracker = {
      record: async () => mockRecord,
      report: async () => mockReport,
      export: async () => '{}',
      query: async () => [mockRecord],
      flush: async () => {},
      purge: async () => 0,
      close: async () => {},
      count: async () => 1,
    };

    expect(typeof tracker.record).toBe('function');
    expect(typeof tracker.report).toBe('function');
    expect(typeof tracker.export).toBe('function');
    expect(typeof tracker.query).toBe('function');
    expect(typeof tracker.flush).toBe('function');
    expect(typeof tracker.purge).toBe('function');
    expect(typeof tracker.close).toBe('function');
    expect(typeof tracker.count).toBe('function');
  });
});

describe('ExportFormat union', () => {
  it('has exactly 3 valid values', () => {
    const json: ExportFormat = 'json';
    const csv: ExportFormat = 'csv';
    const markdown: ExportFormat = 'markdown';
    expect(json).toBe('json');
    expect(csv).toBe('csv');
    expect(markdown).toBe('markdown');

    const formats: ExportFormat[] = ['json', 'csv', 'markdown'];
    expect(formats).toHaveLength(3);
  });
});

describe('ReportOptions', () => {
  it('is all-optional — empty object is valid', () => {
    const empty: ReportOptions = {};
    expect(empty).toEqual({});
  });

  it('accepts all fields', () => {
    const opts: ReportOptions = {
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-31T23:59:59.000Z',
      groupBy: ['team', 'project'],
      filter: { environment: 'production' },
      models: ['gpt-4o'],
      providers: ['openai'],
      timeSeries: 'month',
      includeModelBreakdown: true,
      limit: 50,
      sortBy: 'cost-desc',
    };
    expect(opts.groupBy).toEqual(['team', 'project']);
    expect(opts.timeSeries).toBe('month');
    expect(opts.sortBy).toBe('cost-desc');
  });

  it('sortBy accepts all valid values', () => {
    const values: Array<ReportOptions['sortBy']> = [
      'cost-desc', 'cost-asc', 'name-asc', 'name-desc', 'calls-desc',
    ];
    expect(values).toHaveLength(5);
  });

  it('timeSeries accepts day, week, month', () => {
    const day: ReportOptions = { timeSeries: 'day' };
    const week: ReportOptions = { timeSeries: 'week' };
    const month: ReportOptions = { timeSeries: 'month' };
    expect(day.timeSeries).toBe('day');
    expect(week.timeSeries).toBe('week');
    expect(month.timeSeries).toBe('month');
  });
});

describe('ChargebackReport', () => {
  it('has metadata, totals, groups; timeSeries is optional', () => {
    const report: ChargebackReport = {
      metadata: {
        generatedAt: '2026-03-31T12:00:00.000Z',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
        groupBy: ['team'],
        filters: { environment: 'production' },
        totalRecords: 100,
      },
      totals: {
        cost: 42.5,
        inputTokens: 1000000,
        outputTokens: 250000,
        calls: 5000,
        byModel: {
          'gpt-4o': { cost: 35.0, inputTokens: 800000, outputTokens: 200000, calls: 4000 },
        },
        byProvider: {
          openai: { cost: 42.5, inputTokens: 1000000, outputTokens: 250000, calls: 5000 },
        },
      },
      groups: [
        {
          group: { team: 'search' },
          name: 'search',
          cost: 25.0,
          percentage: 58.8,
          inputTokens: 600000,
          outputTokens: 150000,
          calls: 3000,
        },
      ],
    };

    expect(report.metadata.groupBy).toEqual(['team']);
    expect(report.metadata.totalRecords).toBe(100);
    expect(report.totals.cost).toBe(42.5);
    expect(report.groups).toHaveLength(1);
    expect(report.timeSeries).toBeUndefined();
  });

  it('timeSeries is an optional array of TimeSeriesEntry', () => {
    const entry: TimeSeriesEntry = {
      period: '2026-03-01T00:00:00.000Z',
      label: 'March 2026',
      cost: 42.5,
      calls: 5000,
      inputTokens: 1000000,
      outputTokens: 250000,
    };

    const report: ChargebackReport = {
      metadata: {
        generatedAt: '2026-03-31T12:00:00.000Z',
        groupBy: [],
        filters: {},
        totalRecords: 0,
      },
      totals: {
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        calls: 0,
        byModel: {},
        byProvider: {},
      },
      groups: [],
      timeSeries: [entry],
    };

    expect(report.timeSeries).toHaveLength(1);
    expect(report.timeSeries?.[0].label).toBe('March 2026');
  });

  it('metadata from and to are optional', () => {
    const report: ChargebackReport = {
      metadata: {
        generatedAt: '2026-03-31T12:00:00.000Z',
        groupBy: [],
        filters: {},
        totalRecords: 0,
      },
      totals: {
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        calls: 0,
        byModel: {},
        byProvider: {},
      },
      groups: [],
    };
    expect(report.metadata.from).toBeUndefined();
    expect(report.metadata.to).toBeUndefined();
  });
});

describe('QueryFilters', () => {
  it('is all-optional — empty object is valid', () => {
    const empty: QueryFilters = {};
    expect(empty).toEqual({});
  });

  it('accepts all fields', () => {
    const filters: QueryFilters = {
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-31T23:59:59.000Z',
      tags: { team: 'search' },
      models: ['gpt-4o', 'gpt-4o-mini'],
      providers: ['openai'],
    };
    expect(filters.models).toHaveLength(2);
    expect(filters.providers).toEqual(['openai']);
  });
});

describe('ModelPricing', () => {
  it('has input and output fields in USD per million tokens', () => {
    const pricing: ModelPricing = { input: 2.5, output: 10.0 };
    expect(pricing.input).toBe(2.5);
    expect(pricing.output).toBe(10.0);
  });
});

describe('TaggedClientOptions', () => {
  it('is all-optional', () => {
    const empty: TaggedClientOptions = {};
    expect(empty.tags).toBeUndefined();
    expect(empty.tracker).toBeUndefined();
  });
});

describe('ExportOptions extends ReportOptions', () => {
  it('inherits ReportOptions fields and adds csv/markdown options', () => {
    const opts: ExportOptions = {
      from: '2026-03-01T00:00:00.000Z',
      groupBy: ['team'],
      csvDelimiter: ';',
      csvHeader: false,
      markdownTitle: 'My Report',
    };
    expect(opts.from).toBe('2026-03-01T00:00:00.000Z');
    expect(opts.csvDelimiter).toBe(';');
    expect(opts.csvHeader).toBe(false);
    expect(opts.markdownTitle).toBe('My Report');
  });

  it('all ExportOptions fields are optional', () => {
    const empty: ExportOptions = {};
    expect(empty.csvDelimiter).toBeUndefined();
    expect(empty.csvHeader).toBeUndefined();
    expect(empty.markdownTitle).toBeUndefined();
  });
});

describe('CostBreakdown', () => {
  it('has all required fields; byModel is optional', () => {
    const breakdown: CostBreakdown = {
      group: { team: 'search' },
      name: 'search',
      cost: 4200,
      percentage: 42.0,
      inputTokens: 12500000,
      outputTokens: 3200000,
      calls: 28400,
    };
    expect(breakdown.byModel).toBeUndefined();

    const withModel: CostBreakdown = {
      ...breakdown,
      byModel: { 'gpt-4o': { cost: 3000, percentage: 71.4 } },
    };
    expect(withModel.byModel?.['gpt-4o'].cost).toBe(3000);
  });
});

describe('CostTotals', () => {
  it('has cost, inputTokens, outputTokens, calls, byModel, byProvider', () => {
    const totals: CostTotals = {
      cost: 10000,
      inputTokens: 30700000,
      outputTokens: 7600000,
      calls: 62800,
      byModel: {
        'gpt-4o': { cost: 7200, inputTokens: 22000000, outputTokens: 5500000, calls: 42000 },
      },
      byProvider: {
        openai: { cost: 9000, inputTokens: 28000000, outputTokens: 7000000, calls: 57000 },
      },
    };
    expect(totals.cost).toBe(10000);
    expect(Object.keys(totals.byModel)).toContain('gpt-4o');
    expect(Object.keys(totals.byProvider)).toContain('openai');
  });
});
