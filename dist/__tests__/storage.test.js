"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const memory_1 = require("../storage/memory");
function makeRecord(overrides = {}) {
    return {
        id: 'rec_001',
        timestamp: '2026-03-15T12:00:00.000Z',
        tags: { team: 'search', project: 'autocomplete' },
        model: 'gpt-4o',
        provider: 'openai',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cost: 0.0075,
        ...overrides,
    };
}
const RECORDS = [
    makeRecord({
        id: 'rec_001',
        timestamp: '2026-03-10T08:00:00.000Z',
        tags: { team: 'search', project: 'autocomplete' },
        model: 'gpt-4o',
        provider: 'openai',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cost: 0.0075,
    }),
    makeRecord({
        id: 'rec_002',
        timestamp: '2026-03-12T10:30:00.000Z',
        tags: { team: 'ml', project: 'summarizer' },
        model: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        inputTokens: 2000,
        outputTokens: 800,
        totalTokens: 2800,
        cost: 0.018,
    }),
    makeRecord({
        id: 'rec_003',
        timestamp: '2026-03-14T15:45:00.000Z',
        tags: { team: 'search', project: 'ranking' },
        model: 'gpt-4o-mini',
        provider: 'openai',
        inputTokens: 5000,
        outputTokens: 1200,
        totalTokens: 6200,
        cost: 0.00147,
    }),
    makeRecord({
        id: 'rec_004',
        timestamp: '2026-03-18T09:15:00.000Z',
        tags: { team: 'ml', project: 'summarizer', environment: 'production' },
        model: 'gemini-1.5-pro',
        provider: 'google',
        inputTokens: 3000,
        outputTokens: 600,
        totalTokens: 3600,
        cost: 0.00675,
    }),
    makeRecord({
        id: 'rec_005',
        timestamp: '2026-03-20T18:00:00.000Z',
        tags: { team: 'search', project: 'autocomplete' },
        model: 'gpt-4o',
        provider: 'openai',
        inputTokens: 800,
        outputTokens: 300,
        totalTokens: 1100,
        cost: 0.005,
    }),
];
(0, vitest_1.describe)('MemoryStorageAdapter', () => {
    let adapter;
    (0, vitest_1.beforeEach)(() => {
        adapter = new memory_1.MemoryStorageAdapter();
    });
    (0, vitest_1.describe)('append()', () => {
        (0, vitest_1.it)('adds records to the store', async () => {
            await adapter.append([RECORDS[0], RECORDS[1]]);
            const all = await adapter.query({});
            (0, vitest_1.expect)(all).toHaveLength(2);
            (0, vitest_1.expect)(all[0].id).toBe('rec_001');
            (0, vitest_1.expect)(all[1].id).toBe('rec_002');
        });
        (0, vitest_1.it)('appends multiple batches cumulatively', async () => {
            await adapter.append([RECORDS[0]]);
            await adapter.append([RECORDS[1], RECORDS[2]]);
            const all = await adapter.query({});
            (0, vitest_1.expect)(all).toHaveLength(3);
        });
        (0, vitest_1.it)('handles appending an empty array', async () => {
            await adapter.append([]);
            const all = await adapter.query({});
            (0, vitest_1.expect)(all).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('query() with no filters', () => {
        (0, vitest_1.it)('returns all records when filters are empty', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({});
            (0, vitest_1.expect)(result).toHaveLength(5);
        });
        (0, vitest_1.it)('returns empty array when store is empty', async () => {
            const result = await adapter.query({});
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    (0, vitest_1.describe)('query() with from/to date range filter', () => {
        (0, vitest_1.it)('filters records with from date', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ from: '2026-03-14T00:00:00.000Z' });
            (0, vitest_1.expect)(result).toHaveLength(3);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_003', 'rec_004', 'rec_005']);
        });
        (0, vitest_1.it)('filters records with to date', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ to: '2026-03-13T00:00:00.000Z' });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_002']);
        });
        (0, vitest_1.it)('filters records with both from and to dates', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                from: '2026-03-12T00:00:00.000Z',
                to: '2026-03-15T00:00:00.000Z',
            });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_002', 'rec_003']);
        });
        (0, vitest_1.it)('returns empty when date range matches nothing', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                from: '2026-04-01T00:00:00.000Z',
                to: '2026-04-30T00:00:00.000Z',
            });
            (0, vitest_1.expect)(result).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('query() with tags filter', () => {
        (0, vitest_1.it)('filters by a single tag', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ tags: { team: 'ml' } });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_002', 'rec_004']);
        });
        (0, vitest_1.it)('requires ALL tags to match (AND logic)', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                tags: { team: 'search', project: 'autocomplete' },
            });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
        });
        (0, vitest_1.it)('returns empty when no records match all tags', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                tags: { team: 'search', environment: 'production' },
            });
            (0, vitest_1.expect)(result).toHaveLength(0);
        });
        (0, vitest_1.it)('matches records that have additional tags beyond filter', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ tags: { environment: 'production' } });
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].id).toBe('rec_004');
        });
    });
    (0, vitest_1.describe)('query() with models filter', () => {
        (0, vitest_1.it)('filters by a single model', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ models: ['gpt-4o'] });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
        });
        (0, vitest_1.it)('filters by multiple models', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ models: ['gpt-4o', 'gemini-1.5-pro'] });
            (0, vitest_1.expect)(result).toHaveLength(3);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_004', 'rec_005']);
        });
        (0, vitest_1.it)('returns empty when no records match the model', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ models: ['unknown-model'] });
            (0, vitest_1.expect)(result).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('query() with providers filter', () => {
        (0, vitest_1.it)('filters by a single provider', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ providers: ['anthropic'] });
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].id).toBe('rec_002');
        });
        (0, vitest_1.it)('filters by multiple providers', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ providers: ['openai', 'google'] });
            (0, vitest_1.expect)(result).toHaveLength(4);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_003', 'rec_004', 'rec_005']);
        });
        (0, vitest_1.it)('returns empty when no records match the provider', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({ providers: ['azure'] });
            (0, vitest_1.expect)(result).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('query() with combined filters', () => {
        (0, vitest_1.it)('combines tags and models filter', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                tags: { team: 'search' },
                models: ['gpt-4o'],
            });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
        });
        (0, vitest_1.it)('combines date range and provider filter', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                from: '2026-03-13T00:00:00.000Z',
                providers: ['openai'],
            });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_003', 'rec_005']);
        });
        (0, vitest_1.it)('combines all filter types', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                from: '2026-03-01T00:00:00.000Z',
                to: '2026-03-31T00:00:00.000Z',
                tags: { team: 'search' },
                models: ['gpt-4o'],
                providers: ['openai'],
            });
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
        });
        (0, vitest_1.it)('combined filters with no overlap returns empty', async () => {
            await adapter.append(RECORDS);
            const result = await adapter.query({
                tags: { team: 'ml' },
                providers: ['openai'],
            });
            (0, vitest_1.expect)(result).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('purge()', () => {
        (0, vitest_1.it)('removes matching records and returns count', async () => {
            await adapter.append(RECORDS);
            const count = await adapter.purge({ tags: { team: 'search' } });
            (0, vitest_1.expect)(count).toBe(3);
            const remaining = await adapter.query({});
            (0, vitest_1.expect)(remaining).toHaveLength(2);
            (0, vitest_1.expect)(remaining.map(r => r.id)).toEqual(['rec_002', 'rec_004']);
        });
        (0, vitest_1.it)('returns 0 when no records match', async () => {
            await adapter.append(RECORDS);
            const count = await adapter.purge({ providers: ['azure'] });
            (0, vitest_1.expect)(count).toBe(0);
            const remaining = await adapter.query({});
            (0, vitest_1.expect)(remaining).toHaveLength(5);
        });
        (0, vitest_1.it)('purges all records when filters match everything', async () => {
            await adapter.append(RECORDS);
            const count = await adapter.purge({});
            (0, vitest_1.expect)(count).toBe(5);
            const remaining = await adapter.query({});
            (0, vitest_1.expect)(remaining).toHaveLength(0);
        });
        (0, vitest_1.it)('purges by date range', async () => {
            await adapter.append(RECORDS);
            const count = await adapter.purge({
                from: '2026-03-14T00:00:00.000Z',
                to: '2026-03-19T00:00:00.000Z',
            });
            (0, vitest_1.expect)(count).toBe(2);
            const remaining = await adapter.query({});
            (0, vitest_1.expect)(remaining).toHaveLength(3);
            (0, vitest_1.expect)(remaining.map(r => r.id)).toEqual(['rec_001', 'rec_002', 'rec_005']);
        });
        (0, vitest_1.it)('purges by model filter', async () => {
            await adapter.append(RECORDS);
            const count = await adapter.purge({ models: ['gpt-4o'] });
            (0, vitest_1.expect)(count).toBe(2);
            const remaining = await adapter.query({});
            (0, vitest_1.expect)(remaining).toHaveLength(3);
        });
    });
    (0, vitest_1.describe)('close()', () => {
        (0, vitest_1.it)('clears all records', async () => {
            await adapter.append(RECORDS);
            const before = await adapter.query({});
            (0, vitest_1.expect)(before).toHaveLength(5);
            await adapter.close();
            const after = await adapter.query({});
            (0, vitest_1.expect)(after).toHaveLength(0);
        });
        (0, vitest_1.it)('can be called on an already-empty adapter', async () => {
            await adapter.close();
            const result = await adapter.query({});
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    (0, vitest_1.describe)('empty adapter', () => {
        (0, vitest_1.it)('returns empty array on query with no records', async () => {
            const result = await adapter.query({});
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('returns 0 on purge with no records', async () => {
            const count = await adapter.purge({});
            (0, vitest_1.expect)(count).toBe(0);
        });
    });
});
//# sourceMappingURL=storage.test.js.map