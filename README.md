# ai-chargeback

Tag and allocate AI API costs by team, project, or feature.

[![npm version](https://img.shields.io/npm/v/ai-chargeback.svg)](https://www.npmjs.com/package/ai-chargeback)
[![license](https://img.shields.io/npm/l/ai-chargeback.svg)](https://github.com/SiluPanda/ai-chargeback/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/ai-chargeback.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

`ai-chargeback` is a cost allocation library for AI API usage. It attaches cost center metadata -- team, project, feature, environment -- to every AI API call, accumulates token usage and dollar costs per tag combination, and produces chargeback data that breaks down AI spend by any dimension. It answers the question every enterprise AI platform team eventually faces: "Which team, project, or feature is responsible for which portion of our AI API bill?"

## Installation

```bash
npm install ai-chargeback
```

## Quick Start

```typescript
import { createTracker } from 'ai-chargeback';

const tracker = createTracker();

// Record an AI API call with cost center tags
const record = await tracker.record({
  tags: { team: 'search', project: 'autocomplete', feature: 'suggestions' },
  model: 'gpt-4o',
  inputTokens: 1500,
  outputTokens: 400,
});

console.log(record.cost);      // 0.00775 (auto-computed from built-in pricing)
console.log(record.provider);  // 'openai' (auto-inferred from model name)

// Query stored records
const records = await tracker.query({ tags: { team: 'search' } });
console.log(`Search team calls: ${records.length}`);

// Clean up
await tracker.close();
```

## Features

- **Tag-based cost allocation** -- Attach arbitrary key-value tags (team, project, feature, environment, cost center) to every AI API call for multi-dimensional cost attribution.
- **Automatic cost computation** -- Built-in pricing table for 16 models across OpenAI, Anthropic, and Google. Costs are computed automatically from token counts when not provided explicitly.
- **Provider inference** -- Automatically detects the provider (openai, anthropic, google) from the model name. Supports explicit override.
- **Configurable tag governance** -- Enforce allowed tag keys, required tag keys, and default tags at the tracker level. Tag keys are validated against format rules, reserved prefixes, and count limits.
- **Buffered writes** -- Records are buffered in memory and flushed to storage in batches, configurable by record count and time interval.
- **Pluggable storage** -- Ships with an in-memory adapter. Supports custom adapters via the `StorageAdapter` interface for databases, file systems, or cloud storage.
- **Flexible querying** -- Filter stored records by date range, tags, models, and providers.
- **Custom pricing** -- Override built-in pricing or add pricing for custom/private models.
- **Zero runtime dependencies** -- Only uses Node.js built-ins.

## API Reference

### `createTracker(config?)`

Creates a `CostTracker` instance. All configuration is optional; defaults to in-memory storage with built-in pricing.

```typescript
function createTracker(config?: Partial<ChargebackConfig>): CostTracker;
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `Partial<ChargebackConfig>` | Optional tracker configuration |

**Returns:** `CostTracker`

```typescript
import { createTracker } from 'ai-chargeback';

// Minimal -- in-memory storage, built-in pricing
const tracker = createTracker();

// Fully configured
const tracker = createTracker({
  storage: { type: 'memory' },
  pricing: {
    'my-private-model': { input: 5.00, output: 20.00 },
  },
  buffer: { maxRecords: 50, maxIntervalMs: 3000 },
  defaultTags: { environment: 'production' },
  allowedTagKeys: ['team', 'project', 'feature', 'environment'],
  requiredTagKeys: ['team'],
});
```

---

### `CostTracker`

The interface returned by `createTracker`. All methods are asynchronous.

#### `tracker.record(input)`

Records an AI API call. Validates tags, computes cost if not provided, infers provider from model name, and buffers the record for storage.

```typescript
record(input: RecordInput): Promise<CostRecord>
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input.tags` | `Tags` | Yes | Key-value pairs for cost attribution |
| `input.model` | `string` | Yes | Model identifier (e.g., `'gpt-4o'`, `'claude-sonnet-4-20250514'`) |
| `input.inputTokens` | `number` | Yes | Number of input/prompt tokens |
| `input.outputTokens` | `number` | Yes | Number of output/completion tokens |
| `input.provider` | `string` | No | Provider name. Auto-inferred if omitted. |
| `input.cost` | `number` | No | Explicit cost in USD. Auto-computed from pricing if omitted. |
| `input.metadata` | `Record<string, unknown>` | No | Arbitrary metadata attached to the record |

**Returns:** `CostRecord` -- the created record with `id`, `timestamp`, computed `cost`, inferred `provider`, and `totalTokens`.

**Throws:** `ChargebackValidationError` if tags fail validation. `ChargebackConfigError` if the tracker has been closed.

```typescript
const record = await tracker.record({
  tags: { team: 'ml', project: 'summarizer' },
  model: 'claude-sonnet-4-20250514',
  inputTokens: 2000,
  outputTokens: 800,
  metadata: { requestId: 'req-abc-123' },
});
// record.id         -> UUID v4
// record.timestamp  -> ISO 8601
// record.provider   -> 'anthropic'
// record.cost       -> 0.018
// record.totalTokens -> 2800
```

---

#### `tracker.query(filters?)`

Retrieves stored records matching the given filters. Flushes the buffer before querying.

```typescript
query(filters?: QueryFilters): Promise<CostRecord[]>
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `filters.from` | `string` | ISO 8601 start date (inclusive) |
| `filters.to` | `string` | ISO 8601 end date (inclusive) |
| `filters.tags` | `Tags` | Filter by tag key-value pairs (AND logic) |
| `filters.models` | `string[]` | Filter by model names (OR logic) |
| `filters.providers` | `string[]` | Filter by provider names (OR logic) |

**Returns:** `CostRecord[]`

```typescript
// All records for the search team using OpenAI models
const records = await tracker.query({
  tags: { team: 'search' },
  providers: ['openai'],
});

// Records within a date range
const marchRecords = await tracker.query({
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-03-31T23:59:59.000Z',
});
```

---

#### `tracker.count(filters?)`

Returns the number of records matching the given filters.

```typescript
count(filters?: QueryFilters): Promise<number>
```

```typescript
const total = await tracker.count();
const mlCount = await tracker.count({ tags: { team: 'ml' } });
```

---

#### `tracker.flush()`

Immediately writes all buffered records to storage.

```typescript
flush(): Promise<void>
```

```typescript
await tracker.record({ tags: { team: 'test' }, model: 'gpt-4o', inputTokens: 100, outputTokens: 50 });
await tracker.flush(); // Records are now persisted to storage
```

---

#### `tracker.purge(filters)`

Removes records matching the given filters from storage. Flushes the buffer first.

```typescript
purge(filters: QueryFilters): Promise<number>
```

**Returns:** The number of records removed.

```typescript
// Remove all records for the staging environment
const removed = await tracker.purge({ tags: { environment: 'staging' } });
console.log(`Purged ${removed} records`);

// Remove records older than a date
const purged = await tracker.purge({ to: '2026-01-01T00:00:00.000Z' });
```

---

#### `tracker.close()`

Flushes remaining buffered records, stops the flush interval timer, and closes the storage adapter. After calling `close()`, any subsequent call to `record()` throws a `ChargebackConfigError`. Calling `close()` multiple times is safe (idempotent).

```typescript
close(): Promise<void>
```

```typescript
await tracker.close();
// tracker.record(...) will now throw ChargebackConfigError: "Tracker is closed"
```

---

### Pricing Functions

#### `getPrice(model, customPricing?)`

Looks up the per-token pricing for a model. Checks custom pricing first, then built-in pricing. Supports date-suffixed model names (e.g., `'gpt-4o-2024-08-06'` resolves to `'gpt-4o'`).

```typescript
function getPrice(
  model: string,
  customPricing?: Record<string, ModelPricing>,
): ModelPricing | undefined;
```

**Returns:** `ModelPricing` if found, `undefined` otherwise.

```typescript
import { getPrice } from 'ai-chargeback';

getPrice('gpt-4o');                // { input: 2.50, output: 10.00 }
getPrice('gpt-4o-2024-08-06');     // { input: 2.50, output: 10.00 } (date suffix stripped)
getPrice('unknown-model');          // undefined

// With custom pricing
getPrice('my-model', { 'my-model': { input: 5.00, output: 20.00 } });
// { input: 5.00, output: 20.00 }
```

---

#### `computeCost(inputTokens, outputTokens, pricing)`

Computes the dollar cost from token counts and per-million-token pricing.

```typescript
function computeCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number;
```

**Formula:** `(inputTokens / 1,000,000) * pricing.input + (outputTokens / 1,000,000) * pricing.output`

```typescript
import { computeCost } from 'ai-chargeback';

const cost = computeCost(1000, 500, { input: 2.50, output: 10.00 });
// (1000 / 1_000_000) * 2.50 + (500 / 1_000_000) * 10.00 = 0.0075
```

---

#### `BUILT_IN_PRICING`

A `Record<string, ModelPricing>` containing pricing for 16 models. Prices are in USD per million tokens.

| Model | Input ($/M tokens) | Output ($/M tokens) |
|-------|-------------------:|--------------------:|
| `gpt-4o` | 2.50 | 10.00 |
| `gpt-4o-mini` | 0.15 | 0.60 |
| `gpt-4-turbo` | 10.00 | 30.00 |
| `gpt-4` | 30.00 | 60.00 |
| `gpt-3.5-turbo` | 0.50 | 1.50 |
| `o1` | 15.00 | 60.00 |
| `o1-mini` | 3.00 | 12.00 |
| `o3-mini` | 1.10 | 4.40 |
| `claude-opus-4-20250514` | 15.00 | 75.00 |
| `claude-sonnet-4-20250514` | 3.00 | 15.00 |
| `claude-haiku-3-20250307` | 0.80 | 4.00 |
| `claude-3-5-sonnet-20241022` | 3.00 | 15.00 |
| `claude-3-haiku-20240307` | 0.25 | 1.25 |
| `gemini-1.5-pro` | 1.25 | 5.00 |
| `gemini-1.5-flash` | 0.075 | 0.30 |
| `gemini-2.0-flash` | 0.10 | 0.40 |

---

### Validation Functions

#### `validateTags(tags, options?)`

Validates a tag set against all rules: key format, value constraints, count limits, allowed keys, and required keys.

```typescript
function validateTags(
  tags: Tags,
  options?: {
    allowedTagKeys?: string[] | 'any';
    requiredTagKeys?: string[];
  },
): void;
```

**Throws:** `ChargebackValidationError` on any validation failure.

```typescript
import { validateTags } from 'ai-chargeback';

// Passes
validateTags({ team: 'search', project: 'autocomplete' });

// Passes with governance
validateTags(
  { team: 'search', project: 'autocomplete' },
  { allowedTagKeys: ['team', 'project', 'feature'], requiredTagKeys: ['team'] },
);

// Throws: Tag key "123bad" is invalid
validateTags({ '123bad': 'value' });
```

**Tag key rules:**
- Must start with a letter
- May contain alphanumeric characters, underscores, dots, and hyphens
- Must not use the reserved prefix `_cb_`
- Maximum 20 tags per record

**Tag value rules:**
- Must not be empty
- Maximum 256 characters

---

#### `validateTagKey(key)`

Validates a single tag key against format rules and reserved prefix.

```typescript
function validateTagKey(key: string): void;
```

**Throws:** `ChargebackValidationError` if the key is empty, uses the reserved `_cb_` prefix, or contains invalid characters.

---

#### `validateTagValue(key, value)`

Validates a single tag value for length and emptiness.

```typescript
function validateTagValue(key: string, value: string): void;
```

**Throws:** `ChargebackValidationError` if the value is empty or exceeds 256 characters.

---

### `MemoryStorageAdapter`

An in-memory implementation of the `StorageAdapter` interface. Used as the default storage backend. Records are lost when the process exits.

```typescript
class MemoryStorageAdapter implements StorageAdapter {
  append(records: CostRecord[]): Promise<void>;
  query(filters: QueryFilters): Promise<CostRecord[]>;
  purge(filters: QueryFilters): Promise<number>;
  close(): Promise<void>;
}
```

```typescript
import { MemoryStorageAdapter } from 'ai-chargeback';

const adapter = new MemoryStorageAdapter();
```

---

### Error Classes

#### `ChargebackValidationError`

Thrown when tag validation fails (invalid key format, empty value, exceeded limits, disallowed key, missing required key).

```typescript
class ChargebackValidationError extends Error {
  readonly name: 'ChargebackValidationError';
}
```

#### `ChargebackStorageError`

Thrown when a storage operation fails. Includes an optional `cause` property for the underlying error.

```typescript
class ChargebackStorageError extends Error {
  readonly name: 'ChargebackStorageError';
  readonly cause?: Error;
}
```

#### `ChargebackConfigError`

Thrown when the tracker is used incorrectly (e.g., recording after `close()`).

```typescript
class ChargebackConfigError extends Error {
  readonly name: 'ChargebackConfigError';
}
```

## Configuration

### `ChargebackConfig`

The full configuration object for `createTracker`. All fields are optional.

```typescript
interface ChargebackConfig {
  storage: StorageConfig;
  pricing?: Record<string, ModelPricing>;
  buffer?: { maxRecords: number; maxIntervalMs: number };
  defaultTags?: Tags;
  allowedTagKeys?: string[] | 'any';
  requiredTagKeys?: string[];
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `storage` | `StorageConfig` | `{ type: 'memory' }` | Storage backend configuration |
| `pricing` | `Record<string, ModelPricing>` | `{}` | Custom model pricing (USD per million tokens). Takes precedence over built-in pricing. |
| `buffer.maxRecords` | `number` | `100` | Flush buffer to storage when it reaches this many records |
| `buffer.maxIntervalMs` | `number` | `5000` | Flush buffer to storage at this interval (milliseconds). Set to `0` to disable interval-based flushing. |
| `defaultTags` | `Tags` | `{}` | Tags merged into every record. Input tags override defaults for the same key. |
| `allowedTagKeys` | `string[] \| 'any'` | `'any'` | Restrict which tag keys can be used. Set to `'any'` to allow all keys. |
| `requiredTagKeys` | `string[]` | `[]` | Tag keys that must be present on every record |

### `StorageConfig`

A discriminated union for selecting the storage backend.

```typescript
type StorageConfig =
  | { type: 'memory' }
  | { type: 'file'; path: string }
  | { type: 'custom'; adapter: StorageAdapter };
```

| Type | Fields | Description |
|------|--------|-------------|
| `'memory'` | -- | In-memory storage. Data is lost on process exit. |
| `'file'` | `path: string` | File-based JSON storage (path to the JSON file). |
| `'custom'` | `adapter: StorageAdapter` | Any object implementing the `StorageAdapter` interface. |

## Error Handling

All errors thrown by `ai-chargeback` are instances of one of three specific error classes, all of which extend `Error`. This allows fine-grained error handling with `instanceof` checks.

```typescript
import {
  createTracker,
  ChargebackValidationError,
  ChargebackStorageError,
  ChargebackConfigError,
} from 'ai-chargeback';

const tracker = createTracker({ requiredTagKeys: ['team'] });

try {
  await tracker.record({
    tags: { project: 'search' }, // missing required 'team' tag
    model: 'gpt-4o',
    inputTokens: 100,
    outputTokens: 50,
  });
} catch (err) {
  if (err instanceof ChargebackValidationError) {
    console.error('Tag validation failed:', err.message);
    // -> 'Required tag key "team" is missing'
  }
}
```

**When each error is thrown:**

| Error | Trigger |
|-------|---------|
| `ChargebackValidationError` | Invalid tag key format, empty tag value, value exceeding 256 chars, more than 20 tags, disallowed tag key, missing required tag key |
| `ChargebackStorageError` | Storage adapter operation failure (includes `cause` property for the underlying error) |
| `ChargebackConfigError` | Calling `record()` after `close()` |

## Advanced Usage

### Custom Storage Adapter

Implement the `StorageAdapter` interface to persist records to any backend.

```typescript
import { createTracker } from 'ai-chargeback';
import type { StorageAdapter, CostRecord, QueryFilters } from 'ai-chargeback';

class PostgresStorageAdapter implements StorageAdapter {
  constructor(private pool: Pool) {}

  async append(records: CostRecord[]): Promise<void> {
    for (const r of records) {
      await this.pool.query(
        `INSERT INTO ai_costs (id, timestamp, tags, model, provider,
         input_tokens, output_tokens, total_tokens, cost, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [r.id, r.timestamp, JSON.stringify(r.tags), r.model, r.provider,
         r.inputTokens, r.outputTokens, r.totalTokens, r.cost,
         JSON.stringify(r.metadata)],
      );
    }
  }

  async query(filters: QueryFilters): Promise<CostRecord[]> {
    // Build WHERE clause from filters.from, filters.to, filters.tags, etc.
    // Return matching rows mapped to CostRecord objects
  }

  async purge(filters: QueryFilters): Promise<number> {
    // DELETE FROM ai_costs WHERE ...
    // Return the number of deleted rows
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

const tracker = createTracker({
  storage: { type: 'custom', adapter: new PostgresStorageAdapter(pool) },
});
```

### Tag Governance

Enforce a tag taxonomy across your organization by restricting allowed and required tag keys.

```typescript
const tracker = createTracker({
  allowedTagKeys: ['team', 'project', 'feature', 'environment', 'costCenter'],
  requiredTagKeys: ['team'],
  defaultTags: { environment: 'production' },
});

// Succeeds -- 'team' is present, 'project' is allowed
await tracker.record({
  tags: { team: 'search', project: 'autocomplete' },
  model: 'gpt-4o',
  inputTokens: 500,
  outputTokens: 200,
});

// Throws ChargebackValidationError -- 'region' is not in allowedTagKeys
await tracker.record({
  tags: { team: 'search', region: 'us-east' },
  model: 'gpt-4o',
  inputTokens: 500,
  outputTokens: 200,
});

// Throws ChargebackValidationError -- required 'team' tag is missing
await tracker.record({
  tags: { project: 'autocomplete' },
  model: 'gpt-4o',
  inputTokens: 500,
  outputTokens: 200,
});
```

### Custom Model Pricing

Add pricing for private or fine-tuned models, or override built-in pricing.

```typescript
const tracker = createTracker({
  pricing: {
    'ft:gpt-4o:my-org:custom-model:abc123': { input: 3.75, output: 15.00 },
    'my-private-llama': { input: 0.50, output: 1.00 },
    'gpt-4o': { input: 2.00, output: 8.00 }, // override built-in pricing
  },
});
```

### Buffer Tuning

Configure how frequently records are flushed from the in-memory buffer to the storage adapter.

```typescript
// High-throughput: large buffer, infrequent flushes
const tracker = createTracker({
  buffer: { maxRecords: 500, maxIntervalMs: 10000 },
});

// Low-latency: small buffer, frequent flushes
const tracker = createTracker({
  buffer: { maxRecords: 10, maxIntervalMs: 1000 },
});

// Manual flush only: disable interval timer
const tracker = createTracker({
  buffer: { maxRecords: 1000, maxIntervalMs: 0 },
});
```

### Provider Inference

The tracker automatically infers the provider from model name prefixes:

| Model prefix | Inferred provider |
|-------------|-------------------|
| `gpt-*`, `o1*`, `o3*`, `o4*` | `openai` |
| `claude-*` | `anthropic` |
| `gemini-*` | `google` |
| All other | `unknown` |

Override by passing `provider` explicitly:

```typescript
await tracker.record({
  tags: { team: 'platform' },
  model: 'gpt-4o',
  provider: 'azure', // Azure-hosted OpenAI model
  inputTokens: 1000,
  outputTokens: 500,
});
```

## TypeScript

`ai-chargeback` is written in TypeScript with strict mode enabled. All types are exported from the package entry point.

```typescript
import type {
  Tags,
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
} from 'ai-chargeback';
```

### Key Types

```typescript
// Arbitrary string key-value pairs for cost attribution
type Tags = Record<string, string>;

// What you pass to tracker.record()
interface RecordInput {
  tags: Tags;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

// What tracker.record() returns
interface CostRecord {
  id: string;                          // UUID v4
  timestamp: string;                   // ISO 8601
  tags: Tags;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;                        // USD
  metadata?: Record<string, unknown>;
}

// Per-million-token pricing
interface ModelPricing {
  input: number;   // USD per million input tokens
  output: number;  // USD per million output tokens
}

// Implement this to add a custom storage backend
interface StorageAdapter {
  append(records: CostRecord[]): Promise<void>;
  query(filters: QueryFilters): Promise<CostRecord[]>;
  purge(filters: QueryFilters): Promise<number>;
  close(): Promise<void>;
}

// Filters for query() and purge()
interface QueryFilters {
  from?: string;       // ISO 8601
  to?: string;         // ISO 8601
  tags?: Tags;
  models?: string[];
  providers?: string[];
}
```

## License

MIT
