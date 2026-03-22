"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tracker_1 = require("../tracker");
const errors_1 = require("../errors");
const errors_2 = require("../errors");
// UUID pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
(0, vitest_1.describe)('createTracker', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('returns an object with all CostTracker methods', () => {
        tracker = (0, tracker_1.createTracker)();
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
(0, vitest_1.describe)('record()', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('creates a CostRecord with id, timestamp, model, provider, cost', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 1000,
            outputTokens: 500,
        });
        (0, vitest_1.expect)(record.id).toMatch(UUID_RE);
        (0, vitest_1.expect)(record.timestamp).toMatch(ISO_RE);
        (0, vitest_1.expect)(record.model).toBe('gpt-4o');
        (0, vitest_1.expect)(record.provider).toBe('openai');
        (0, vitest_1.expect)(typeof record.cost).toBe('number');
        (0, vitest_1.expect)(record.cost).toBeGreaterThan(0);
        (0, vitest_1.expect)(record.inputTokens).toBe(1000);
        (0, vitest_1.expect)(record.outputTokens).toBe(500);
        (0, vitest_1.expect)(record.totalTokens).toBe(1500);
    });
    (0, vitest_1.it)('merges defaultTags with input tags', async () => {
        tracker = (0, tracker_1.createTracker)({ defaultTags: { environment: 'production' } });
        const record = await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.tags).toEqual({ environment: 'production', team: 'search' });
    });
    (0, vitest_1.it)('input tags override defaultTags for the same key', async () => {
        tracker = (0, tracker_1.createTracker)({ defaultTags: { team: 'default-team' } });
        const record = await tracker.record({
            tags: { team: 'override-team' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.tags.team).toBe('override-team');
    });
    (0, vitest_1.it)('infers provider "openai" from gpt- models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o-mini',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('openai');
    });
    (0, vitest_1.it)('infers provider "openai" from o1 models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'o1',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('openai');
    });
    (0, vitest_1.it)('infers provider "openai" from o3 models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'o3-mini',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('openai');
    });
    (0, vitest_1.it)('infers provider "anthropic" from claude- models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('anthropic');
    });
    (0, vitest_1.it)('infers provider "google" from gemini- models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gemini-1.5-pro',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('google');
    });
    (0, vitest_1.it)('infers provider "unknown" for unrecognized models', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'custom-model',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('unknown');
    });
    (0, vitest_1.it)('computes cost from pricing table when cost not provided', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 1000,
            outputTokens: 500,
        });
        // (1000 / 1_000_000) * 2.50 + (500 / 1_000_000) * 10.00 = 0.0025 + 0.005 = 0.0075
        (0, vitest_1.expect)(record.cost).toBeCloseTo(0.0075, 10);
    });
    (0, vitest_1.it)('uses explicit cost when provided', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.42,
        });
        (0, vitest_1.expect)(record.cost).toBe(0.42);
    });
    (0, vitest_1.it)('sets cost to 0 for unknown models without explicit cost', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'totally-unknown-model',
            inputTokens: 1000,
            outputTokens: 500,
        });
        (0, vitest_1.expect)(record.cost).toBe(0);
    });
    (0, vitest_1.it)('uses custom pricing when provided in config', async () => {
        tracker = (0, tracker_1.createTracker)({
            pricing: { 'my-model': { input: 5.00, output: 20.00 } },
        });
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'my-model',
            inputTokens: 1_000_000,
            outputTokens: 500_000,
        });
        // (1M / 1M) * 5 + (500K / 1M) * 20 = 5 + 10 = 15
        (0, vitest_1.expect)(record.cost).toBeCloseTo(15.0, 10);
    });
    (0, vitest_1.it)('validates tags and throws on invalid key', async () => {
        tracker = (0, tracker_1.createTracker)();
        await (0, vitest_1.expect)(tracker.record({
            tags: { '123invalid': 'value' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        })).rejects.toThrow(errors_2.ChargebackValidationError);
    });
    (0, vitest_1.it)('validates allowedTagKeys and throws on disallowed key', async () => {
        tracker = (0, tracker_1.createTracker)({ allowedTagKeys: ['team', 'project'] });
        await (0, vitest_1.expect)(tracker.record({
            tags: { feature: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        })).rejects.toThrow(errors_2.ChargebackValidationError);
    });
    (0, vitest_1.it)('validates requiredTagKeys and throws on missing key', async () => {
        tracker = (0, tracker_1.createTracker)({ requiredTagKeys: ['team'] });
        await (0, vitest_1.expect)(tracker.record({
            tags: { project: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        })).rejects.toThrow(errors_2.ChargebackValidationError);
    });
    (0, vitest_1.it)('uses explicit provider when provided', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            provider: 'azure',
            inputTokens: 100,
            outputTokens: 50,
        });
        (0, vitest_1.expect)(record.provider).toBe('azure');
    });
    (0, vitest_1.it)('stores metadata when provided', async () => {
        tracker = (0, tracker_1.createTracker)();
        const record = await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
            metadata: { requestId: 'abc-123' },
        });
        (0, vitest_1.expect)(record.metadata).toEqual({ requestId: 'abc-123' });
    });
});
(0, vitest_1.describe)('flush()', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('writes buffered records to storage', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.flush();
        const records = await tracker.query();
        (0, vitest_1.expect)(records).toHaveLength(1);
    });
});
(0, vitest_1.describe)('query()', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('returns stored records', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'ml' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        const records = await tracker.query();
        (0, vitest_1.expect)(records).toHaveLength(2);
    });
    (0, vitest_1.it)('returns records matching tag filters', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'ml' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        const records = await tracker.query({ tags: { team: 'ml' } });
        (0, vitest_1.expect)(records).toHaveLength(1);
        (0, vitest_1.expect)(records[0].tags.team).toBe('ml');
    });
    (0, vitest_1.it)('returns records matching model filters', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'test' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        const records = await tracker.query({ models: ['gpt-4o'] });
        (0, vitest_1.expect)(records).toHaveLength(1);
        (0, vitest_1.expect)(records[0].model).toBe('gpt-4o');
    });
    (0, vitest_1.it)('returns records matching provider filters', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'test' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        const records = await tracker.query({ providers: ['anthropic'] });
        (0, vitest_1.expect)(records).toHaveLength(1);
        (0, vitest_1.expect)(records[0].provider).toBe('anthropic');
    });
});
(0, vitest_1.describe)('count()', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('returns the total record count', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 200,
            outputTokens: 100,
        });
        (0, vitest_1.expect)(await tracker.count()).toBe(2);
    });
    (0, vitest_1.it)('returns count matching filters', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'ml' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        (0, vitest_1.expect)(await tracker.count({ tags: { team: 'ml' } })).toBe(1);
    });
});
(0, vitest_1.describe)('purge()', () => {
    let tracker;
    (0, vitest_1.afterEach)(async () => {
        if (tracker)
            await tracker.close();
    });
    (0, vitest_1.it)('removes matching records and returns count', async () => {
        tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.record({
            tags: { team: 'ml' },
            model: 'claude-sonnet-4-20250514',
            inputTokens: 200,
            outputTokens: 100,
        });
        await tracker.record({
            tags: { team: 'search' },
            model: 'gpt-4o-mini',
            inputTokens: 300,
            outputTokens: 150,
        });
        const count = await tracker.purge({ tags: { team: 'search' } });
        (0, vitest_1.expect)(count).toBe(2);
        const remaining = await tracker.query();
        (0, vitest_1.expect)(remaining).toHaveLength(1);
        (0, vitest_1.expect)(remaining[0].tags.team).toBe('ml');
    });
});
(0, vitest_1.describe)('close()', () => {
    (0, vitest_1.it)('flushes and prevents further records', async () => {
        const tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.close();
        await (0, vitest_1.expect)(tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        })).rejects.toThrow(errors_1.ChargebackConfigError);
    });
    (0, vitest_1.it)('throws ChargebackConfigError with "Tracker is closed" message after close', async () => {
        const tracker = (0, tracker_1.createTracker)();
        await tracker.close();
        await (0, vitest_1.expect)(tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        })).rejects.toThrow('Tracker is closed');
    });
    (0, vitest_1.it)('is idempotent — second close() is a no-op', async () => {
        const tracker = (0, tracker_1.createTracker)();
        await tracker.record({
            tags: { team: 'test' },
            model: 'gpt-4o',
            inputTokens: 100,
            outputTokens: 50,
        });
        await tracker.close();
        await tracker.close(); // should not throw
    });
});
(0, vitest_1.describe)('buffer auto-flush', () => {
    (0, vitest_1.it)('auto-flushes when buffer reaches maxRecords', async () => {
        const appended = [];
        const mockAdapter = {
            async append(records) { appended.push([...records]); },
            async query() { return appended.flat(); },
            async purge() { return 0; },
            async close() { },
        };
        const tracker = (0, tracker_1.createTracker)({
            storage: { type: 'custom', adapter: mockAdapter },
            buffer: { maxRecords: 3, maxIntervalMs: 0 },
        });
        // Record 2 — should NOT flush yet
        await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
        await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
        (0, vitest_1.expect)(appended).toHaveLength(0);
        // Record 3 — should trigger auto-flush
        await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
        (0, vitest_1.expect)(appended).toHaveLength(1);
        (0, vitest_1.expect)(appended[0]).toHaveLength(3);
        await tracker.close();
    });
    (0, vitest_1.it)('flushes on interval timer', async () => {
        vitest_1.vi.useFakeTimers();
        const appended = [];
        const mockAdapter = {
            async append(records) { appended.push([...records]); },
            async query() { return appended.flat(); },
            async purge() { return 0; },
            async close() { },
        };
        const tracker = (0, tracker_1.createTracker)({
            storage: { type: 'custom', adapter: mockAdapter },
            buffer: { maxRecords: 100, maxIntervalMs: 2000 },
        });
        await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
        (0, vitest_1.expect)(appended).toHaveLength(0);
        // Advance past the interval
        vitest_1.vi.advanceTimersByTime(2500);
        // Allow any pending microtasks to settle
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(appended).toHaveLength(1);
        (0, vitest_1.expect)(appended[0]).toHaveLength(1);
        await tracker.close();
        vitest_1.vi.useRealTimers();
    });
});
(0, vitest_1.describe)('custom storage adapter', () => {
    (0, vitest_1.it)('calls adapter methods correctly', async () => {
        const calls = [];
        const storedRecords = [];
        const mockAdapter = {
            async append(records) { calls.push('append'); storedRecords.push(...records); },
            async query() { calls.push('query'); return [...storedRecords]; },
            async purge() { calls.push('purge'); const c = storedRecords.length; storedRecords.length = 0; return c; },
            async close() { calls.push('close'); },
        };
        const tracker = (0, tracker_1.createTracker)({
            storage: { type: 'custom', adapter: mockAdapter },
        });
        await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
        await tracker.flush();
        (0, vitest_1.expect)(calls).toContain('append');
        await tracker.query();
        (0, vitest_1.expect)(calls).toContain('query');
        await tracker.purge({});
        (0, vitest_1.expect)(calls).toContain('purge');
        await tracker.close();
        (0, vitest_1.expect)(calls).toContain('close');
    });
});
//# sourceMappingURL=tracker.test.js.map