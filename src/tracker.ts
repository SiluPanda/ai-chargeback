import { randomUUID } from 'node:crypto';
import type {
  CostTracker, CostRecord, RecordInput, QueryFilters,
  ChargebackConfig, ChargebackReport, ExportFormat,
  ExportOptions, ReportOptions, Tags,
} from './types';
import { ChargebackConfigError } from './errors';
import { MemoryStorageAdapter } from './storage/memory';
import { getPrice, computeCost } from './pricing';
import { validateTags } from './validation';

function inferProvider(model: string): string {
  if (/^(gpt-|o1|o3|o4)/.test(model)) return 'openai';
  if (/^claude-/.test(model)) return 'anthropic';
  if (/^gemini-/.test(model)) return 'google';
  return 'unknown';
}

export function createTracker(config?: Partial<ChargebackConfig>): CostTracker {
  const storage = config?.storage?.type === 'custom' ? config.storage.adapter
    : new MemoryStorageAdapter();
  const customPricing = config?.pricing ?? {};
  const defaultTags: Tags = config?.defaultTags ?? {};
  const allowedTagKeys = config?.allowedTagKeys ?? 'any';
  const requiredTagKeys = config?.requiredTagKeys ?? [];
  const maxRecords = config?.buffer?.maxRecords ?? 100;
  const maxIntervalMs = config?.buffer?.maxIntervalMs ?? 5000;

  let buffer: CostRecord[] = [];
  let closed = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  // Start flush interval
  if (maxIntervalMs > 0) {
    flushTimer = setInterval(() => { flushBuffer(); }, maxIntervalMs);
    if (flushTimer.unref) flushTimer.unref();
  }

  async function flushBuffer(): Promise<void> {
    if (buffer.length === 0) return;
    const toFlush = buffer;
    buffer = [];
    await storage.append(toFlush);
  }

  const tracker: CostTracker = {
    async record(input: RecordInput): Promise<CostRecord> {
      if (closed) throw new ChargebackConfigError('Tracker is closed');
      const mergedTags = { ...defaultTags, ...input.tags };
      validateTags(mergedTags, { allowedTagKeys, requiredTagKeys });

      const provider = input.provider ?? inferProvider(input.model);
      let cost = input.cost;
      if (cost === undefined) {
        const pricing = getPrice(input.model, customPricing);
        cost = pricing ? computeCost(input.inputTokens, input.outputTokens, pricing) : 0;
      }

      const record: CostRecord = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        tags: mergedTags,
        model: input.model,
        provider,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.inputTokens + input.outputTokens,
        cost,
        metadata: input.metadata,
      };

      buffer.push(record);
      if (buffer.length >= maxRecords) await flushBuffer();

      return record;
    },

    async flush(): Promise<void> {
      await flushBuffer();
    },

    async query(filters?: QueryFilters): Promise<CostRecord[]> {
      await flushBuffer();
      return storage.query(filters ?? {});
    },

    async count(filters?: QueryFilters): Promise<number> {
      const records = await tracker.query(filters);
      return records.length;
    },

    async purge(filters: QueryFilters): Promise<number> {
      await flushBuffer();
      return storage.purge(filters);
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      await flushBuffer();
      await storage.close();
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async report(options?: ReportOptions): Promise<ChargebackReport> {
      throw new Error('Report generation not yet implemented');
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async export(format: ExportFormat, options?: ExportOptions): Promise<string> {
      throw new Error('Export not yet implemented');
    },
  };

  return tracker;
}
