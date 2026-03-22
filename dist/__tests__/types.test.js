"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('CostRecord shape', () => {
    (0, vitest_1.it)('has all required fields', () => {
        const record = {
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
        (0, vitest_1.expect)(record.id).toBe('rec_abc123');
        (0, vitest_1.expect)(record.timestamp).toBe('2026-03-15T14:30:00.000Z');
        (0, vitest_1.expect)(record.tags).toEqual({ team: 'search' });
        (0, vitest_1.expect)(record.model).toBe('gpt-4o');
        (0, vitest_1.expect)(record.provider).toBe('openai');
        (0, vitest_1.expect)(record.inputTokens).toBe(150);
        (0, vitest_1.expect)(record.outputTokens).toBe(42);
        (0, vitest_1.expect)(record.totalTokens).toBe(192);
        (0, vitest_1.expect)(record.cost).toBe(0.000795);
    });
    (0, vitest_1.it)('metadata is optional', () => {
        const withMeta = {
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
        (0, vitest_1.expect)(withMeta.metadata).toEqual({ requestId: 'req_xyz', latencyMs: 320 });
        const withoutMeta = {
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
        (0, vitest_1.expect)(withoutMeta.metadata).toBeUndefined();
    });
});
(0, vitest_1.describe)('RecordInput shape', () => {
    (0, vitest_1.it)('requires tags, model, inputTokens, outputTokens', () => {
        const input = {
            tags: { team: 'search', project: 'autocomplete' },
            model: 'gpt-4o',
            inputTokens: 200,
            outputTokens: 80,
        };
        (0, vitest_1.expect)(input.tags).toEqual({ team: 'search', project: 'autocomplete' });
        (0, vitest_1.expect)(input.model).toBe('gpt-4o');
        (0, vitest_1.expect)(input.inputTokens).toBe(200);
        (0, vitest_1.expect)(input.outputTokens).toBe(80);
    });
    (0, vitest_1.it)('provider, cost, metadata are optional', () => {
        const minimal = {
            tags: {},
            model: 'claude-haiku',
            inputTokens: 100,
            outputTokens: 50,
        };
        (0, vitest_1.expect)(minimal.provider).toBeUndefined();
        (0, vitest_1.expect)(minimal.cost).toBeUndefined();
        (0, vitest_1.expect)(minimal.metadata).toBeUndefined();
        const full = {
            tags: { team: 'ml' },
            model: 'claude-haiku',
            provider: 'anthropic',
            inputTokens: 100,
            outputTokens: 50,
            cost: 0.0005,
            metadata: { feature: 'summarize' },
        };
        (0, vitest_1.expect)(full.provider).toBe('anthropic');
        (0, vitest_1.expect)(full.cost).toBe(0.0005);
        (0, vitest_1.expect)(full.metadata).toEqual({ feature: 'summarize' });
    });
});
(0, vitest_1.describe)('StorageConfig discriminated union', () => {
    (0, vitest_1.it)('memory type has only the type field', () => {
        const cfg = { type: 'memory' };
        (0, vitest_1.expect)(cfg.type).toBe('memory');
    });
    (0, vitest_1.it)('file type has type and path fields', () => {
        const cfg = { type: 'file', path: './ai-costs.json' };
        (0, vitest_1.expect)(cfg.type).toBe('file');
        if (cfg.type === 'file') {
            (0, vitest_1.expect)(cfg.path).toBe('./ai-costs.json');
        }
    });
    (0, vitest_1.it)('custom type has type and adapter fields', () => {
        const mockAdapter = {
            append: async () => { },
            query: async () => [],
            purge: async () => 0,
            close: async () => { },
        };
        const cfg = { type: 'custom', adapter: mockAdapter };
        (0, vitest_1.expect)(cfg.type).toBe('custom');
        if (cfg.type === 'custom') {
            (0, vitest_1.expect)(typeof cfg.adapter.append).toBe('function');
            (0, vitest_1.expect)(typeof cfg.adapter.query).toBe('function');
            (0, vitest_1.expect)(typeof cfg.adapter.purge).toBe('function');
            (0, vitest_1.expect)(typeof cfg.adapter.close).toBe('function');
        }
    });
});
(0, vitest_1.describe)('ChargebackConfig', () => {
    (0, vitest_1.it)('requires storage; all others are optional', () => {
        const minimalConfig = {
            storage: { type: 'memory' },
        };
        (0, vitest_1.expect)(minimalConfig.storage).toEqual({ type: 'memory' });
        (0, vitest_1.expect)(minimalConfig.pricing).toBeUndefined();
        (0, vitest_1.expect)(minimalConfig.buffer).toBeUndefined();
        (0, vitest_1.expect)(minimalConfig.defaultTags).toBeUndefined();
        (0, vitest_1.expect)(minimalConfig.allowedTagKeys).toBeUndefined();
        (0, vitest_1.expect)(minimalConfig.requiredTagKeys).toBeUndefined();
    });
    (0, vitest_1.it)('accepts all optional fields', () => {
        const fullConfig = {
            storage: { type: 'file', path: './costs.json' },
            pricing: { 'gpt-4o': { input: 2.5, output: 10 } },
            buffer: { maxRecords: 100, maxIntervalMs: 5000 },
            defaultTags: { environment: 'production' },
            allowedTagKeys: ['team', 'project', 'feature'],
            requiredTagKeys: ['team'],
        };
        (0, vitest_1.expect)(fullConfig.pricing).toBeDefined();
        (0, vitest_1.expect)(fullConfig.buffer?.maxRecords).toBe(100);
        (0, vitest_1.expect)(fullConfig.allowedTagKeys).toEqual(['team', 'project', 'feature']);
    });
    (0, vitest_1.it)('allowedTagKeys can be the literal string any', () => {
        const cfg = {
            storage: { type: 'memory' },
            allowedTagKeys: 'any',
        };
        (0, vitest_1.expect)(cfg.allowedTagKeys).toBe('any');
    });
});
(0, vitest_1.describe)('CostTracker interface', () => {
    (0, vitest_1.it)('can be mock-implemented with all 8 methods', () => {
        const mockRecord = {
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
        const mockReport = {
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
        const tracker = {
            record: async () => mockRecord,
            report: async () => mockReport,
            export: async () => '{}',
            query: async () => [mockRecord],
            flush: async () => { },
            purge: async () => 0,
            close: async () => { },
            count: async () => 1,
        };
        (0, vitest_1.expect)(typeof tracker.record).toBe('function');
        (0, vitest_1.expect)(typeof tracker.report).toBe('function');
        (0, vitest_1.expect)(typeof tracker.export).toBe('function');
        (0, vitest_1.expect)(typeof tracker.query).toBe('function');
        (0, vitest_1.expect)(typeof tracker.flush).toBe('function');
        (0, vitest_1.expect)(typeof tracker.purge).toBe('function');
        (0, vitest_1.expect)(typeof tracker.close).toBe('function');
        (0, vitest_1.expect)(typeof tracker.count).toBe('function');
    });
});
(0, vitest_1.describe)('ExportFormat union', () => {
    (0, vitest_1.it)('has exactly 3 valid values', () => {
        const json = 'json';
        const csv = 'csv';
        const markdown = 'markdown';
        (0, vitest_1.expect)(json).toBe('json');
        (0, vitest_1.expect)(csv).toBe('csv');
        (0, vitest_1.expect)(markdown).toBe('markdown');
        const formats = ['json', 'csv', 'markdown'];
        (0, vitest_1.expect)(formats).toHaveLength(3);
    });
});
(0, vitest_1.describe)('ReportOptions', () => {
    (0, vitest_1.it)('is all-optional — empty object is valid', () => {
        const empty = {};
        (0, vitest_1.expect)(empty).toEqual({});
    });
    (0, vitest_1.it)('accepts all fields', () => {
        const opts = {
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
        (0, vitest_1.expect)(opts.groupBy).toEqual(['team', 'project']);
        (0, vitest_1.expect)(opts.timeSeries).toBe('month');
        (0, vitest_1.expect)(opts.sortBy).toBe('cost-desc');
    });
    (0, vitest_1.it)('sortBy accepts all valid values', () => {
        const values = [
            'cost-desc', 'cost-asc', 'name-asc', 'name-desc', 'calls-desc',
        ];
        (0, vitest_1.expect)(values).toHaveLength(5);
    });
    (0, vitest_1.it)('timeSeries accepts day, week, month', () => {
        const day = { timeSeries: 'day' };
        const week = { timeSeries: 'week' };
        const month = { timeSeries: 'month' };
        (0, vitest_1.expect)(day.timeSeries).toBe('day');
        (0, vitest_1.expect)(week.timeSeries).toBe('week');
        (0, vitest_1.expect)(month.timeSeries).toBe('month');
    });
});
(0, vitest_1.describe)('ChargebackReport', () => {
    (0, vitest_1.it)('has metadata, totals, groups; timeSeries is optional', () => {
        const report = {
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
        (0, vitest_1.expect)(report.metadata.groupBy).toEqual(['team']);
        (0, vitest_1.expect)(report.metadata.totalRecords).toBe(100);
        (0, vitest_1.expect)(report.totals.cost).toBe(42.5);
        (0, vitest_1.expect)(report.groups).toHaveLength(1);
        (0, vitest_1.expect)(report.timeSeries).toBeUndefined();
    });
    (0, vitest_1.it)('timeSeries is an optional array of TimeSeriesEntry', () => {
        const entry = {
            period: '2026-03-01T00:00:00.000Z',
            label: 'March 2026',
            cost: 42.5,
            calls: 5000,
            inputTokens: 1000000,
            outputTokens: 250000,
        };
        const report = {
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
        (0, vitest_1.expect)(report.timeSeries).toHaveLength(1);
        (0, vitest_1.expect)(report.timeSeries?.[0].label).toBe('March 2026');
    });
    (0, vitest_1.it)('metadata from and to are optional', () => {
        const report = {
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
        (0, vitest_1.expect)(report.metadata.from).toBeUndefined();
        (0, vitest_1.expect)(report.metadata.to).toBeUndefined();
    });
});
(0, vitest_1.describe)('QueryFilters', () => {
    (0, vitest_1.it)('is all-optional — empty object is valid', () => {
        const empty = {};
        (0, vitest_1.expect)(empty).toEqual({});
    });
    (0, vitest_1.it)('accepts all fields', () => {
        const filters = {
            from: '2026-03-01T00:00:00.000Z',
            to: '2026-03-31T23:59:59.000Z',
            tags: { team: 'search' },
            models: ['gpt-4o', 'gpt-4o-mini'],
            providers: ['openai'],
        };
        (0, vitest_1.expect)(filters.models).toHaveLength(2);
        (0, vitest_1.expect)(filters.providers).toEqual(['openai']);
    });
});
(0, vitest_1.describe)('ModelPricing', () => {
    (0, vitest_1.it)('has input and output fields in USD per million tokens', () => {
        const pricing = { input: 2.5, output: 10.0 };
        (0, vitest_1.expect)(pricing.input).toBe(2.5);
        (0, vitest_1.expect)(pricing.output).toBe(10.0);
    });
});
(0, vitest_1.describe)('TaggedClientOptions', () => {
    (0, vitest_1.it)('is all-optional', () => {
        const empty = {};
        (0, vitest_1.expect)(empty.tags).toBeUndefined();
        (0, vitest_1.expect)(empty.tracker).toBeUndefined();
    });
});
(0, vitest_1.describe)('ExportOptions extends ReportOptions', () => {
    (0, vitest_1.it)('inherits ReportOptions fields and adds csv/markdown options', () => {
        const opts = {
            from: '2026-03-01T00:00:00.000Z',
            groupBy: ['team'],
            csvDelimiter: ';',
            csvHeader: false,
            markdownTitle: 'My Report',
        };
        (0, vitest_1.expect)(opts.from).toBe('2026-03-01T00:00:00.000Z');
        (0, vitest_1.expect)(opts.csvDelimiter).toBe(';');
        (0, vitest_1.expect)(opts.csvHeader).toBe(false);
        (0, vitest_1.expect)(opts.markdownTitle).toBe('My Report');
    });
    (0, vitest_1.it)('all ExportOptions fields are optional', () => {
        const empty = {};
        (0, vitest_1.expect)(empty.csvDelimiter).toBeUndefined();
        (0, vitest_1.expect)(empty.csvHeader).toBeUndefined();
        (0, vitest_1.expect)(empty.markdownTitle).toBeUndefined();
    });
});
(0, vitest_1.describe)('CostBreakdown', () => {
    (0, vitest_1.it)('has all required fields; byModel is optional', () => {
        const breakdown = {
            group: { team: 'search' },
            name: 'search',
            cost: 4200,
            percentage: 42.0,
            inputTokens: 12500000,
            outputTokens: 3200000,
            calls: 28400,
        };
        (0, vitest_1.expect)(breakdown.byModel).toBeUndefined();
        const withModel = {
            ...breakdown,
            byModel: { 'gpt-4o': { cost: 3000, percentage: 71.4 } },
        };
        (0, vitest_1.expect)(withModel.byModel?.['gpt-4o'].cost).toBe(3000);
    });
});
(0, vitest_1.describe)('CostTotals', () => {
    (0, vitest_1.it)('has cost, inputTokens, outputTokens, calls, byModel, byProvider', () => {
        const totals = {
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
        (0, vitest_1.expect)(totals.cost).toBe(10000);
        (0, vitest_1.expect)(Object.keys(totals.byModel)).toContain('gpt-4o');
        (0, vitest_1.expect)(Object.keys(totals.byProvider)).toContain('openai');
    });
});
//# sourceMappingURL=types.test.js.map