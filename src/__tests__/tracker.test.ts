import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTracker } from '../tracker';
import { ChargebackConfigError } from '../errors';
import { ChargebackValidationError } from '../errors';
import type { CostTracker, StorageAdapter, CostRecord } from '../types';

// UUID pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

describe('createTracker', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('returns an object with all CostTracker methods', () => {
    tracker = createTracker();
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

describe('record()', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('creates a CostRecord with id, timestamp, model, provider, cost', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'search' },
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(record.id).toMatch(UUID_RE);
    expect(record.timestamp).toMatch(ISO_RE);
    expect(record.model).toBe('gpt-4o');
    expect(record.provider).toBe('openai');
    expect(typeof record.cost).toBe('number');
    expect(record.cost).toBeGreaterThan(0);
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(500);
    expect(record.totalTokens).toBe(1500);
  });

  it('merges defaultTags with input tags', async () => {
    tracker = createTracker({ defaultTags: { environment: 'production' } });
    const record = await tracker.record({
      tags: { team: 'search' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(record.tags).toEqual({ environment: 'production', team: 'search' });
  });

  it('input tags override defaultTags for the same key', async () => {
    tracker = createTracker({ defaultTags: { team: 'default-team' } });
    const record = await tracker.record({
      tags: { team: 'override-team' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(record.tags.team).toBe('override-team');
  });

  it('infers provider "openai" from gpt- models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o-mini',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('openai');
  });

  it('infers provider "openai" from o1 models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'o1',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('openai');
  });

  it('infers provider "openai" from o3 models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'o3-mini',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('openai');
  });

  it('infers provider "anthropic" from claude- models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'claude-sonnet-4-20250514',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('anthropic');
  });

  it('infers provider "google" from gemini- models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gemini-1.5-pro',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('google');
  });

  it('infers provider "unknown" for unrecognized models', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'custom-model',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('unknown');
  });

  it('computes cost from pricing table when cost not provided', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
    });
    // (1000 / 1_000_000) * 2.50 + (500 / 1_000_000) * 10.00 = 0.0025 + 0.005 = 0.0075
    expect(record.cost).toBeCloseTo(0.0075, 10);
  });

  it('uses explicit cost when provided', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
      cost: 0.42,
    });
    expect(record.cost).toBe(0.42);
  });

  it('sets cost to 0 for unknown models without explicit cost', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'totally-unknown-model',
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(record.cost).toBe(0);
  });

  it('uses custom pricing when provided in config', async () => {
    tracker = createTracker({
      pricing: { 'my-model': { input: 5.00, output: 20.00 } },
    });
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'my-model',
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });
    // (1M / 1M) * 5 + (500K / 1M) * 20 = 5 + 10 = 15
    expect(record.cost).toBeCloseTo(15.0, 10);
  });

  it('validates tags and throws on invalid key', async () => {
    tracker = createTracker();
    await expect(tracker.record({
      tags: { '123invalid': 'value' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    })).rejects.toThrow(ChargebackValidationError);
  });

  it('validates allowedTagKeys and throws on disallowed key', async () => {
    tracker = createTracker({ allowedTagKeys: ['team', 'project'] });
    await expect(tracker.record({
      tags: { feature: 'search' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    })).rejects.toThrow(ChargebackValidationError);
  });

  it('validates requiredTagKeys and throws on missing key', async () => {
    tracker = createTracker({ requiredTagKeys: ['team'] });
    await expect(tracker.record({
      tags: { project: 'search' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    })).rejects.toThrow(ChargebackValidationError);
  });

  it('uses explicit provider when provided', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      provider: 'azure',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.provider).toBe('azure');
  });

  it('stores metadata when provided', async () => {
    tracker = createTracker();
    const record = await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
      metadata: { requestId: 'abc-123' },
    });
    expect(record.metadata).toEqual({ requestId: 'abc-123' });
  });
});

describe('flush()', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('writes buffered records to storage', async () => {
    tracker = createTracker();
    await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    });
    await tracker.flush();
    const records = await tracker.query();
    expect(records).toHaveLength(1);
  });
});

describe('query()', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('returns stored records', async () => {
    tracker = createTracker();
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
    expect(records).toHaveLength(2);
  });

  it('returns records matching tag filters', async () => {
    tracker = createTracker();
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
    expect(records).toHaveLength(1);
    expect(records[0].tags.team).toBe('ml');
  });

  it('returns records matching model filters', async () => {
    tracker = createTracker();
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
    expect(records).toHaveLength(1);
    expect(records[0].model).toBe('gpt-4o');
  });

  it('returns records matching provider filters', async () => {
    tracker = createTracker();
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
    expect(records).toHaveLength(1);
    expect(records[0].provider).toBe('anthropic');
  });
});

describe('count()', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('returns the total record count', async () => {
    tracker = createTracker();
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

    expect(await tracker.count()).toBe(2);
  });

  it('returns count matching filters', async () => {
    tracker = createTracker();
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

    expect(await tracker.count({ tags: { team: 'ml' } })).toBe(1);
  });
});

describe('purge()', () => {
  let tracker: CostTracker;

  afterEach(async () => {
    if (tracker) await tracker.close();
  });

  it('removes matching records and returns count', async () => {
    tracker = createTracker();
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
    expect(count).toBe(2);

    const remaining = await tracker.query();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tags.team).toBe('ml');
  });
});

describe('close()', () => {
  it('flushes and prevents further records', async () => {
    const tracker = createTracker();
    await tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    });
    await tracker.close();

    await expect(tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    })).rejects.toThrow(ChargebackConfigError);
  });

  it('throws ChargebackConfigError with "Tracker is closed" message after close', async () => {
    const tracker = createTracker();
    await tracker.close();

    await expect(tracker.record({
      tags: { team: 'test' },
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
    })).rejects.toThrow('Tracker is closed');
  });

  it('is idempotent — second close() is a no-op', async () => {
    const tracker = createTracker();
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

describe('buffer auto-flush', () => {
  it('auto-flushes when buffer reaches maxRecords', async () => {
    const appended: CostRecord[][] = [];
    const mockAdapter: StorageAdapter = {
      async append(records) { appended.push([...records]); },
      async query() { return appended.flat(); },
      async purge() { return 0; },
      async close() {},
    };

    const tracker = createTracker({
      storage: { type: 'custom', adapter: mockAdapter },
      buffer: { maxRecords: 3, maxIntervalMs: 0 },
    });

    // Record 2 — should NOT flush yet
    await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
    await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
    expect(appended).toHaveLength(0);

    // Record 3 — should trigger auto-flush
    await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
    expect(appended).toHaveLength(1);
    expect(appended[0]).toHaveLength(3);

    await tracker.close();
  });

  it('flushes on interval timer', async () => {
    vi.useFakeTimers();

    const appended: CostRecord[][] = [];
    const mockAdapter: StorageAdapter = {
      async append(records) { appended.push([...records]); },
      async query() { return appended.flat(); },
      async purge() { return 0; },
      async close() {},
    };

    const tracker = createTracker({
      storage: { type: 'custom', adapter: mockAdapter },
      buffer: { maxRecords: 100, maxIntervalMs: 2000 },
    });

    await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
    expect(appended).toHaveLength(0);

    // Advance past the interval
    vi.advanceTimersByTime(2500);
    // Allow any pending microtasks to settle
    await vi.advanceTimersByTimeAsync(0);

    expect(appended).toHaveLength(1);
    expect(appended[0]).toHaveLength(1);

    await tracker.close();
    vi.useRealTimers();
  });
});

describe('custom storage adapter', () => {
  it('calls adapter methods correctly', async () => {
    const calls: string[] = [];
    const storedRecords: CostRecord[] = [];
    const mockAdapter: StorageAdapter = {
      async append(records) { calls.push('append'); storedRecords.push(...records); },
      async query() { calls.push('query'); return [...storedRecords]; },
      async purge() { calls.push('purge'); const c = storedRecords.length; storedRecords.length = 0; return c; },
      async close() { calls.push('close'); },
    };

    const tracker = createTracker({
      storage: { type: 'custom', adapter: mockAdapter },
    });

    await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
    await tracker.flush();
    expect(calls).toContain('append');

    await tracker.query();
    expect(calls).toContain('query');

    await tracker.purge({});
    expect(calls).toContain('purge');

    await tracker.close();
    expect(calls).toContain('close');
  });
});
