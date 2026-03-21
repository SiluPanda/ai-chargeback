import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../storage/memory';
import type { CostRecord } from '../types';

function makeRecord(overrides: Partial<CostRecord> = {}): CostRecord {
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

const RECORDS: CostRecord[] = [
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

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
  });

  describe('append()', () => {
    it('adds records to the store', async () => {
      await adapter.append([RECORDS[0], RECORDS[1]]);
      const all = await adapter.query({});
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('rec_001');
      expect(all[1].id).toBe('rec_002');
    });

    it('appends multiple batches cumulatively', async () => {
      await adapter.append([RECORDS[0]]);
      await adapter.append([RECORDS[1], RECORDS[2]]);
      const all = await adapter.query({});
      expect(all).toHaveLength(3);
    });

    it('handles appending an empty array', async () => {
      await adapter.append([]);
      const all = await adapter.query({});
      expect(all).toHaveLength(0);
    });
  });

  describe('query() with no filters', () => {
    it('returns all records when filters are empty', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({});
      expect(result).toHaveLength(5);
    });

    it('returns empty array when store is empty', async () => {
      const result = await adapter.query({});
      expect(result).toEqual([]);
    });
  });

  describe('query() with from/to date range filter', () => {
    it('filters records with from date', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ from: '2026-03-14T00:00:00.000Z' });
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toEqual(['rec_003', 'rec_004', 'rec_005']);
    });

    it('filters records with to date', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ to: '2026-03-13T00:00:00.000Z' });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_002']);
    });

    it('filters records with both from and to dates', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        from: '2026-03-12T00:00:00.000Z',
        to: '2026-03-15T00:00:00.000Z',
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_002', 'rec_003']);
    });

    it('returns empty when date range matches nothing', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        from: '2026-04-01T00:00:00.000Z',
        to: '2026-04-30T00:00:00.000Z',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('query() with tags filter', () => {
    it('filters by a single tag', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ tags: { team: 'ml' } });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_002', 'rec_004']);
    });

    it('requires ALL tags to match (AND logic)', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        tags: { team: 'search', project: 'autocomplete' },
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
    });

    it('returns empty when no records match all tags', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        tags: { team: 'search', environment: 'production' },
      });
      expect(result).toHaveLength(0);
    });

    it('matches records that have additional tags beyond filter', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ tags: { environment: 'production' } });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec_004');
    });
  });

  describe('query() with models filter', () => {
    it('filters by a single model', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ models: ['gpt-4o'] });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
    });

    it('filters by multiple models', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ models: ['gpt-4o', 'gemini-1.5-pro'] });
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_004', 'rec_005']);
    });

    it('returns empty when no records match the model', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ models: ['unknown-model'] });
      expect(result).toHaveLength(0);
    });
  });

  describe('query() with providers filter', () => {
    it('filters by a single provider', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ providers: ['anthropic'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec_002');
    });

    it('filters by multiple providers', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ providers: ['openai', 'google'] });
      expect(result).toHaveLength(4);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_003', 'rec_004', 'rec_005']);
    });

    it('returns empty when no records match the provider', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({ providers: ['azure'] });
      expect(result).toHaveLength(0);
    });
  });

  describe('query() with combined filters', () => {
    it('combines tags and models filter', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        tags: { team: 'search' },
        models: ['gpt-4o'],
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
    });

    it('combines date range and provider filter', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        from: '2026-03-13T00:00:00.000Z',
        providers: ['openai'],
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_003', 'rec_005']);
    });

    it('combines all filter types', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T00:00:00.000Z',
        tags: { team: 'search' },
        models: ['gpt-4o'],
        providers: ['openai'],
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['rec_001', 'rec_005']);
    });

    it('combined filters with no overlap returns empty', async () => {
      await adapter.append(RECORDS);
      const result = await adapter.query({
        tags: { team: 'ml' },
        providers: ['openai'],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('purge()', () => {
    it('removes matching records and returns count', async () => {
      await adapter.append(RECORDS);
      const count = await adapter.purge({ tags: { team: 'search' } });
      expect(count).toBe(3);
      const remaining = await adapter.query({});
      expect(remaining).toHaveLength(2);
      expect(remaining.map(r => r.id)).toEqual(['rec_002', 'rec_004']);
    });

    it('returns 0 when no records match', async () => {
      await adapter.append(RECORDS);
      const count = await adapter.purge({ providers: ['azure'] });
      expect(count).toBe(0);
      const remaining = await adapter.query({});
      expect(remaining).toHaveLength(5);
    });

    it('purges all records when filters match everything', async () => {
      await adapter.append(RECORDS);
      const count = await adapter.purge({});
      expect(count).toBe(5);
      const remaining = await adapter.query({});
      expect(remaining).toHaveLength(0);
    });

    it('purges by date range', async () => {
      await adapter.append(RECORDS);
      const count = await adapter.purge({
        from: '2026-03-14T00:00:00.000Z',
        to: '2026-03-19T00:00:00.000Z',
      });
      expect(count).toBe(2);
      const remaining = await adapter.query({});
      expect(remaining).toHaveLength(3);
      expect(remaining.map(r => r.id)).toEqual(['rec_001', 'rec_002', 'rec_005']);
    });

    it('purges by model filter', async () => {
      await adapter.append(RECORDS);
      const count = await adapter.purge({ models: ['gpt-4o'] });
      expect(count).toBe(2);
      const remaining = await adapter.query({});
      expect(remaining).toHaveLength(3);
    });
  });

  describe('close()', () => {
    it('clears all records', async () => {
      await adapter.append(RECORDS);
      const before = await adapter.query({});
      expect(before).toHaveLength(5);

      await adapter.close();
      const after = await adapter.query({});
      expect(after).toHaveLength(0);
    });

    it('can be called on an already-empty adapter', async () => {
      await adapter.close();
      const result = await adapter.query({});
      expect(result).toEqual([]);
    });
  });

  describe('empty adapter', () => {
    it('returns empty array on query with no records', async () => {
      const result = await adapter.query({});
      expect(result).toEqual([]);
    });

    it('returns 0 on purge with no records', async () => {
      const count = await adapter.purge({});
      expect(count).toBe(0);
    });
  });
});
