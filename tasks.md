# ai-chargeback — Task Breakdown

This file tracks all implementation tasks derived from SPEC.md. Tasks are grouped by implementation phase and ordered by dependency.

---

## Phase 1: Core Infrastructure

### 1.1 Type Definitions

- [x] **Define `Tags` type** — Create `src/types.ts` with the `Tags` type as `Record<string, string>` for cost center tag key-value pairs. | Status: done
- [x] **Define `CostRecord` interface** — Add the `CostRecord` interface with fields: `id` (string), `timestamp` (ISO 8601 string), `tags` (Tags), `model` (string), `provider` (string), `inputTokens` (number), `outputTokens` (number), `totalTokens` (number), `cost` (number), `metadata` (optional `Record<string, unknown>`). | Status: done
- [x] **Define `RecordInput` interface** — Add the `RecordInput` interface for manual recording: `tags`, `model`, `provider` (optional, inferred from model), `inputTokens`, `outputTokens`, `cost` (optional override), `metadata` (optional). | Status: done
- [x] **Define `ModelPricing` interface** — Add `ModelPricing` with `input` and `output` fields (USD per million tokens). | Status: done
- [x] **Define `StorageConfig` type** — Add the discriminated union type: `{ type: 'memory' } | { type: 'file'; path: string } | { type: 'custom'; adapter: StorageAdapter }`. | Status: done
- [x] **Define `StorageAdapter` interface** — Add the `StorageAdapter` interface with methods: `append(records: CostRecord[]): Promise<void>`, `query(filters: QueryFilters): Promise<CostRecord[]>`, `purge(filters: QueryFilters): Promise<number>`, `close(): Promise<void>`. | Status: done
- [x] **Define `QueryFilters` interface** — Add `QueryFilters` with optional fields: `from` (ISO 8601), `to` (ISO 8601), `tags` (Tags), `models` (string[]), `providers` (string[]). | Status: done
- [x] **Define `ChargebackConfig` interface** — Add tracker configuration interface with fields: `storage` (StorageConfig), `pricing` (Record<string, ModelPricing>), `buffer` ({ maxRecords, maxIntervalMs }), `defaultTags` (Tags), `allowedTagKeys` (string[] | 'any'), `requiredTagKeys` (string[]). | Status: done
- [x] **Define `TaggedClientOptions` interface** — Add `tags` (optional Tags) and `tracker` (optional CostTracker) fields. | Status: done
- [x] **Define `ReportOptions` interface** — Add report query options: `from`, `to`, `groupBy` (string[]), `filter` (Tags), `models` (string[]), `providers` (string[]), `timeSeries` ('day' | 'week' | 'month'), `includeModelBreakdown` (boolean, default true), `limit` (number), `sortBy` ('cost-desc' | 'cost-asc' | 'name-asc' | 'name-desc' | 'calls-desc'). | Status: done
- [x] **Define `ChargebackReport` interface** — Add the report output type with `metadata` (generatedAt, from, to, groupBy, filters, totalRecords), `totals` (CostTotals), `groups` (CostBreakdown[]), `timeSeries` (optional TimeSeriesEntry[]). | Status: done
- [x] **Define `CostTotals` interface** — Add aggregate totals: `cost`, `inputTokens`, `outputTokens`, `calls`, `byModel` (Record mapping to per-model aggregates), `byProvider` (Record mapping to per-provider aggregates). | Status: done
- [x] **Define `CostBreakdown` interface** — Add per-group breakdown: `group` (Tags), `name` (string), `cost`, `percentage`, `inputTokens`, `outputTokens`, `calls`, `byModel` (optional per-model breakdown with percentage). | Status: done
- [x] **Define `TimeSeriesEntry` interface** — Add time series data point: `period` (ISO 8601), `label` (string), `cost`, `calls`, `inputTokens`, `outputTokens`, `groups` (optional per-group within period). | Status: done
- [x] **Define `ExportFormat` type and `ExportOptions` interface** — `ExportFormat` as `'json' | 'csv' | 'markdown'`. `ExportOptions` extending `ReportOptions` with `csvDelimiter` (default ','), `csvHeader` (default true), `markdownTitle` (default 'AI Cost Chargeback Report'). | Status: done
- [x] **Define `CostTracker` interface** — Add the tracker instance interface with methods: `record(input)`, `report(options?)`, `export(format, options?)`, `query(filters?)`, `flush()`, `purge(filters)`, `close()`, `count(filters?)`. | Status: done
- [x] **Define error classes** — Create `ChargebackValidationError`, `ChargebackStorageError`, and `ChargebackConfigError` extending `Error`, each with appropriate `name` property. | Status: done

### 1.2 Pricing

- [x] **Create built-in pricing table** — Implement `src/pricing.ts` with a `Record<string, ModelPricing>` containing all 16 models from the spec: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo, o1, o1-mini, o3-mini, claude-opus-4-20250514, claude-sonnet-4-20250514, claude-haiku-3-20250307, claude-3-5-sonnet-20241022, claude-3-haiku-20240307, gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash with exact $/MTok values from the spec. | Status: done
- [x] **Implement `getPrice(model)` with prefix matching** — Look up pricing by exact model name first, then strip dated suffixes (e.g., `gpt-4o-2024-08-06` matches `gpt-4o`). Return `ModelPricing | undefined`. | Status: done
- [x] **Implement custom pricing merge** — Accept a `Record<string, ModelPricing>` from config and merge with built-in table (custom takes precedence). | Status: done
- [ ] **Implement `model-price-registry` fallback** — Optionally import `model-price-registry` as a peer dependency fallback when a model is not found in built-in or custom pricing. Use dynamic `require`/`import` with try-catch for optional dependency. | Status: not_done
- [x] **Implement cost computation function** — `computeCost(inputTokens, outputTokens, pricing): number` using formula: `(inputTokens / 1_000_000 * pricing.input) + (outputTokens / 1_000_000 * pricing.output)`. Return 0 with warning for unknown models. | Status: done

### 1.3 In-Memory Storage

- [x] **Implement `MemoryStorageAdapter`** — Create `src/storage/memory.ts` implementing `StorageAdapter`. Use an internal array to store `CostRecord` objects. | Status: done
- [x] **Implement `append()` for in-memory** — Push records to the internal array. | Status: done
- [x] **Implement `query()` with filter support** — Filter stored records by `from`/`to` date range (inclusive), `tags` (records must match ALL specified tags), `models` (array), `providers` (array). Return matching records. | Status: done
- [x] **Implement `purge()` for in-memory** — Remove records matching the given filters from the internal array. Return count of deleted records. | Status: done
- [x] **Implement `close()` for in-memory** — No-op for in-memory (clear internal array). | Status: done

### 1.4 Tag Validation

- [x] **Implement tag key validation** — Validate that tag keys match `/^[a-zA-Z][a-zA-Z0-9_.-]*$/` (starts with letter, alphanumeric with underscores, dots, hyphens). Reject empty strings. Throw `ChargebackValidationError` on invalid key. | Status: done
- [x] **Implement reserved key prefix check** — Reject tag keys starting with `_cb_` (reserved for internal use). Throw `ChargebackValidationError`. | Status: done
- [x] **Implement tag value validation** — Validate tag values are non-empty strings with maximum 256 characters. Throw `ChargebackValidationError` on invalid value. | Status: done
- [x] **Implement tag count limit** — Reject tag sets with more than 20 key-value pairs. Throw `ChargebackValidationError`. | Status: done
- [x] **Implement allowed tag key enforcement** — When `allowedTagKeys` is an array, reject any tag key not in the list. When `'any'`, accept all keys. Throw `ChargebackValidationError` for disallowed keys. | Status: done
- [x] **Implement required tag key enforcement** — When `requiredTagKeys` is set, reject records missing any required key. Throw `ChargebackValidationError` with a clear message. | Status: done

### 1.5 CostTracker

- [x] **Implement `CostTracker` class** — Create `src/tracker.ts` with internal state: storage adapter, pricing table, buffer config, default tags, validation config, closed flag. | Status: done
- [x] **Implement `createTracker(config?)` factory** — Parse config with defaults: `storage: { type: 'memory' }`, `pricing: {}`, `buffer: { maxRecords: 100, maxIntervalMs: 5000 }`, `defaultTags: {}`, `allowedTagKeys: 'any'`, `requiredTagKeys: []`. Throw `ChargebackConfigError` for invalid config. | Status: done
- [ ] **Implement environment variable overrides** — Read `AI_CHARGEBACK_STORAGE_PATH`, `AI_CHARGEBACK_DEFAULT_TEAM`, `AI_CHARGEBACK_DEFAULT_ENV`, `AI_CHARGEBACK_BUFFER_SIZE`, `AI_CHARGEBACK_BUFFER_INTERVAL` from `process.env`. Environment variables override programmatic config. | Status: not_done
- [x] **Implement `record(input)` method** — Validate tags (including merge with defaultTags), compute cost (using pricing table or explicit cost), generate UUID via `crypto.randomUUID()`, create `CostRecord` with timestamp, append to buffer. | Status: done
- [x] **Implement write buffer** — Buffer records in memory. Flush to storage when buffer reaches `maxRecords` or when `maxIntervalMs` elapses (use `setInterval`). | Status: done
- [x] **Implement `flush()` method** — Force immediate write of buffered records to storage via `adapter.append()`. Clear the buffer. | Status: done
- [x] **Implement `query(filters?)` method** — Flush buffer first, then delegate to `adapter.query(filters)`. | Status: done
- [x] **Implement `count(filters?)` method** — Query records matching filters and return the count. | Status: done
- [x] **Implement `purge(filters)` method** — Delegate to `adapter.purge(filters)`. Return count of deleted records. | Status: done
- [x] **Implement `close()` method** — Flush remaining buffer, call `adapter.close()`, clear interval timer, set closed flag. Second call is a no-op. `record()` after `close()` throws error. | Status: done
- [x] **Implement provider inference from model name** — When `provider` is not specified in `RecordInput`, infer from model name: models starting with `gpt-`, `o1`, `o3` map to `openai`; models starting with `claude-` map to `anthropic`; models starting with `gemini-` map to `google`. Default to `'unknown'`. | Status: done

### 1.6 Entry Point

- [x] **Set up `src/index.ts` exports** — Export `createTracker` from `src/tracker.ts`. Remaining exports (`tag`, `runWithTags`, `getCurrentTags`) deferred to Phase 2 implementation. | Status: done

---

## Phase 2: SDK Tagging and Context

### 2.1 AsyncLocalStorage Context

- [ ] **Implement `AsyncLocalStorage` singleton** — Create `src/tagging/context.ts` with a module-level `AsyncLocalStorage<Tags>` instance using `node:async_hooks`. | Status: not_done
- [ ] **Implement `runWithTags(tags, fn)`** — Run an async function within an `AsyncLocalStorage` context that applies the given tags. Return the result of the function. Support nested contexts (inner overrides outer for overlapping keys). | Status: not_done
- [ ] **Implement `getCurrentTags()`** — Return the current tag set from `AsyncLocalStorage`, or `null` if called outside a `runWithTags` context. | Status: not_done
- [ ] **Implement internal `getContextTags()`** — Internal helper to retrieve context tags for use by the tag merge logic. Returns `Tags` or empty object. | Status: not_done

### 2.2 Tag Merge Logic

- [ ] **Implement three-level tag merge** — Create `src/tagging/merge.ts` with `mergeTags(clientTags, contextTags, requestTags): Tags`. Precedence: request > context > client. For overlapping keys, highest-precedence value wins. | Status: not_done
- [ ] **Integrate default tags into merge** — Default tags from tracker config have the lowest precedence (below client-level). Merge order: request > context > client > default. | Status: not_done

### 2.3 OpenAI SDK Wrapping

- [ ] **Implement `tag()` function with Proxy** — Create `src/tagging/tag.ts`. Use JavaScript `Proxy` to wrap SDK client objects. The proxy intercepts method calls on nested objects (e.g., `client.chat.completions.create`). Return type preserves the original client type (`tag<T>(client: T, options): T`). | Status: not_done
- [ ] **Implement OpenAI `chat.completions.create` interception** — Intercept calls to `chat.completions.create`. After the call completes, extract usage from `response.usage.prompt_tokens` and `response.usage.completion_tokens`. Record a cost entry via the tracker. | Status: not_done
- [ ] **Implement OpenAI `completions.create` interception** — Intercept the legacy completions API. Extract usage from `response.usage.prompt_tokens` and `response.usage.completion_tokens`. | Status: not_done
- [ ] **Implement OpenAI `embeddings.create` interception** — Intercept embeddings calls. Extract usage from `response.usage.prompt_tokens` and `response.usage.total_tokens`. | Status: not_done
- [ ] **Implement request-level tag overrides via `chargebackTags`** — Detect the `chargebackTags` property in the second argument (options/requestOptions) of intercepted API calls. Merge with client-level and context-level tags using the three-level precedence. | Status: not_done

### 2.4 Anthropic SDK Wrapping

- [ ] **Implement Anthropic `messages.create` interception** — Intercept calls to `messages.create`. Extract usage from `response.usage.input_tokens` and `response.usage.output_tokens`. Normalize to `inputTokens`/`outputTokens`. | Status: not_done
- [ ] **Implement Anthropic `messages.stream` interception** — Intercept streaming calls. Accumulate `input_tokens` from `message_start` event and `output_tokens` from `message_delta` event with `stop_reason`. Record cost after stream completes. | Status: not_done

### 2.5 Streaming Support

- [ ] **Implement OpenAI streaming response handling** — When the response is a stream, intercept the final chunk with `usage` field (requires `stream_options: { include_usage: true }`). Record cost from the final chunk's usage data. Emit warning if `include_usage` is not set (cost recorded with zero tokens). | Status: not_done
- [ ] **Implement stream passthrough** — Ensure the stream is passed through transparently to the caller. The proxy must not consume or buffer the stream; it should observe the final event and pass all events through. | Status: not_done

### 2.6 Proxy Error Isolation

- [ ] **Implement try-catch isolation in proxy** — Wrap all cost recording logic in try-catch. If recording fails (storage error, unexpected response format, missing usage data), emit `console.warn` and return the original response unchanged. Never let chargeback failures break the AI API call. | Status: not_done
- [ ] **Handle missing usage data gracefully** — If the API response does not contain a `usage` field, record cost with zero tokens and emit a warning rather than throwing. | Status: not_done

---

## Phase 3: Report Generation

### 3.1 Aggregation Functions

- [ ] **Implement group-by partitioning** — Create `src/report/aggregator.ts`. Given an array of `CostRecord` and a `groupBy` key array, partition records into groups where each group shares the same values for all groupBy keys. Records missing a groupBy key get grouped under `'(untagged)'` for that dimension. | Status: not_done
- [ ] **Implement sum aggregation per group** — For each group, compute: total cost, total inputTokens, total outputTokens, total calls (count). | Status: not_done
- [ ] **Implement percentage computation** — For each group, compute percentage of total cost: `(group.cost / totalCost) * 100`. Handle zero total cost (all percentages = 0). | Status: not_done
- [ ] **Implement per-model breakdown within groups** — When `includeModelBreakdown` is true, compute per-model aggregates (cost, inputTokens, outputTokens, calls, percentage) within each group. | Status: not_done
- [ ] **Implement sorting** — Sort groups by the specified `sortBy` option: `cost-desc` (default), `cost-asc`, `name-asc`, `name-desc`, `calls-desc`. | Status: not_done
- [ ] **Implement limit** — After sorting, truncate to `limit` groups if specified. | Status: not_done
- [ ] **Implement group display name** — Generate the `name` field by concatenating group tag values with ` / ` separator (e.g., `'search / autocomplete'`). For single-dimension grouping, the name is just the tag value. | Status: not_done

### 3.2 Time Series Bucketing

- [ ] **Implement daily time series bucketing** — Bucket records by day (YYYY-MM-DD). Compute per-day totals: cost, calls, inputTokens, outputTokens. | Status: not_done
- [ ] **Implement weekly time series bucketing** — Bucket records by ISO week (Monday start). Compute per-week totals. | Status: not_done
- [ ] **Implement monthly time series bucketing** — Bucket records by month (YYYY-MM). Compute per-month totals. | Status: not_done
- [ ] **Implement per-group breakdown within time periods** — When groupBy is set, include per-group aggregates (group, cost, calls) within each time series entry. | Status: not_done

### 3.3 Report Generator

- [ ] **Implement `ReportGenerator` class** — Create `src/report/generator.ts`. Accept `CostRecord[]` and `ReportOptions`. Orchestrate: filtering, grouping, aggregation, model breakdown, time series, and produce `ChargebackReport`. | Status: not_done
- [ ] **Implement report metadata generation** — Populate `metadata` with `generatedAt` (current timestamp), `from`, `to`, `groupBy`, `filters` (tags, models, providers), and `totalRecords`. | Status: not_done
- [ ] **Implement overall totals computation** — Compute `CostTotals`: total cost, inputTokens, outputTokens, calls, byModel (per-model aggregates), byProvider (per-provider aggregates). | Status: not_done
- [ ] **Implement report filtering** — Apply filters before aggregation: filter by `filter` (tag values), `models`, `providers`, and `from`/`to` date range. Only matching records are included. | Status: not_done
- [ ] **Implement empty dataset handling** — When no records match filters, return a report with zero totals and empty groups array. | Status: not_done
- [ ] **Wire `tracker.report()` to report generator** — Flush buffer, query records from storage with applicable filters, pass to report generator, return `ChargebackReport`. | Status: not_done

---

## Phase 4: Export Formats and File Storage

### 4.1 JSON Export

- [ ] **Implement JSON export formatter** — Create `src/export/json.ts`. Serialize `ChargebackReport` to a JSON string with `JSON.stringify` (2-space indentation). | Status: not_done

### 4.2 CSV Export

- [ ] **Implement CSV export formatter** — Create `src/export/csv.ts`. Generate header row from groupBy dimensions + metric columns (cost, input_tokens, output_tokens, calls, percentage). One data row per group. | Status: not_done
- [ ] **Implement CSV value escaping** — Escape values containing the delimiter character, double quotes, or newlines by wrapping in double quotes and escaping internal double quotes. | Status: not_done
- [ ] **Implement configurable CSV delimiter** — Support custom delimiter via `csvDelimiter` option (default: `,`). | Status: not_done
- [ ] **Implement CSV header toggle** — Support omitting the header row via `csvHeader: false`. | Status: not_done

### 4.3 Markdown Export

- [ ] **Implement Markdown export formatter** — Create `src/export/markdown.ts`. Generate a Markdown document with: title (configurable via `markdownTitle`), period summary, total cost/calls, and a Markdown table with columns for each groupBy dimension + metrics. | Status: not_done
- [ ] **Implement Markdown summary section** — Include period, total cost, total calls, formatted numbers with commas and currency symbols. | Status: not_done
- [ ] **Implement Markdown per-model breakdown table** — When `includeModelBreakdown` is true, include a second table showing cost by model. | Status: not_done

### 4.4 File-Based Storage

- [ ] **Implement `FileStorageAdapter`** — Create `src/storage/file.ts` implementing `StorageAdapter`. Store records in a JSON file with format: `{ "version": 1, "records": [...] }`. | Status: not_done
- [ ] **Implement file read on creation** — Read the existing JSON file on adapter initialization. If the file does not exist, start with empty records. If the directory does not exist, throw `ChargebackStorageError` with clear message. | Status: not_done
- [ ] **Implement file append with atomic write** — On `append()`, write the updated data to a temporary file, then rename to the target path (atomic rename pattern). Use `node:fs/promises` and `node:path`. | Status: not_done
- [ ] **Implement file query with filter support** — Read all records from the in-memory copy (loaded at init), apply filters, return matching records. | Status: not_done
- [ ] **Implement file purge** — Remove matching records from the in-memory copy and write the updated file atomically. Return count of deleted records. | Status: not_done
- [ ] **Implement file close** — Flush pending data, release file handles. | Status: not_done
- [ ] **Handle empty file gracefully** — If the file exists but is empty, treat as zero records. | Status: not_done
- [ ] **Handle corrupted file** — If the file contains invalid JSON, throw `ChargebackStorageError` with a clear message. | Status: not_done

### 4.5 Storage Types Re-export

- [ ] **Create `src/storage/types.ts`** — Re-export `StorageAdapter` interface for custom adapter implementors who import from a subpath. | Status: not_done

### 4.6 Tracker Export Integration

- [ ] **Implement `tracker.export()` method** — Accept `ExportFormat` and `ExportOptions`. Generate the report, then delegate to the appropriate formatter (JSON, CSV, Markdown). Return the formatted string. | Status: not_done

---

## Phase 5: CLI

### 5.1 CLI Infrastructure

- [ ] **Create `src/cli.ts` entry point** — Implement CLI using `util.parseArgs` from Node.js built-ins. Parse global options: `--storage`, `--version`, `--help`. Dispatch to subcommand handlers. | Status: not_done
- [ ] **Add `bin` field to `package.json`** — Register `"ai-chargeback": "dist/cli.js"` in the `bin` field. Add a hashbang (`#!/usr/bin/env node`) at the top of `cli.ts`. | Status: not_done
- [ ] **Implement `--version` flag** — Read version from `package.json` and print it. | Status: not_done
- [ ] **Implement `--help` flag** — Print usage information for global options and available subcommands. | Status: not_done
- [ ] **Implement exit codes** — Exit 0 for success, 1 for runtime errors, 2 for configuration/argument errors. | Status: not_done

### 5.2 `report` Command

- [ ] **Implement `report` command argument parsing** — Parse all flags: `--storage`, `--group-by` (comma-separated), `--from`, `--to`, `--filter` (repeatable, `key=value`), `--model` (repeatable), `--time-series` (day/week/month), `--format` (table/json/csv/markdown, default table), `--output`, `--no-model-breakdown`, `--limit`, `--sort`. | Status: not_done
- [ ] **Implement human-readable table output** — Format report as a terminal-friendly table with aligned columns, formatted numbers (commas, currency), percentage column. Match the example output in spec section 12. | Status: not_done
- [ ] **Implement `--output` file write** — When `--output` is specified, write report output to the given file path instead of stdout. | Status: not_done
- [ ] **Implement `--format` dispatch** — When format is `json`, `csv`, or `markdown`, use the corresponding export formatter. When `table` (default), use the human-readable table formatter. | Status: not_done

### 5.3 `export` Command

- [ ] **Implement `export` command** — Parse flags: `--storage`, `--format` (json/csv/markdown, required), `--output` (required), `--group-by`, `--from`, `--to`, `--filter`. Create a tracker from the storage file, run `tracker.export()`, write the result to the output file. | Status: not_done

### 5.4 `summary` Command

- [ ] **Implement `summary` command** — Parse flags: `--storage`, `--from`, `--to`. Generate a concise summary output: period, total cost, total calls, total tokens (formatted as in/out), top team, top model, top feature. Match the example output in spec section 12. | Status: not_done

### 5.5 `records` Command

- [ ] **Implement `records` command** — List raw cost records from the storage file for debugging and auditing. Support filtering by `--from`, `--to`, `--filter`. Print records in a readable format (or JSON). | Status: not_done

### 5.6 `purge` Command

- [ ] **Implement `purge` command** — Parse flags: `--storage`, `--before` (date, required), `--filter` (repeatable), `--dry-run`, `--confirm`. Without `--confirm`, prompt for confirmation before deleting. With `--dry-run`, print how many records would be deleted without deleting. | Status: not_done

### 5.7 CLI Error Handling

- [ ] **Implement missing required flags error** — When `--storage` is missing or `--format`/`--output` for export, print a clear error message and exit with code 2. | Status: not_done
- [ ] **Implement invalid date format error** — When `--from` or `--to` cannot be parsed as ISO 8601 or YYYY-MM-DD, print a clear error message and exit with code 2. | Status: not_done
- [ ] **Implement storage file not found error** — When the `--storage` file does not exist for read commands (report, export, summary, records), print a clear error message and exit with code 1. | Status: not_done
- [ ] **Implement `--filter` parsing** — Parse `--filter team=search` as `{ team: 'search' }`. Handle repeatable flag (multiple `--filter` flags). Validate `key=value` format. | Status: not_done

---

## Phase 6: Testing

### 6.1 Tag Merge Tests

- [ ] **Test client-level tags only** — Record a cost with only client-level tags. Verify the cost record contains exactly the client tags. | Status: not_done
- [ ] **Test context-level tags only** — Use `runWithTags` with context tags, record a cost. Verify the cost record contains the context tags. | Status: not_done
- [ ] **Test request-level tags only** — Pass `chargebackTags` in the API call options. Verify the cost record contains the request tags. | Status: not_done
- [ ] **Test all three levels merge** — Set client, context, and request tags. Verify correct precedence: request > context > client. | Status: not_done
- [ ] **Test overlapping keys** — Same key at multiple levels. Verify highest-precedence value wins. | Status: not_done
- [ ] **Test default tags** — Configure default tags on the tracker. Verify they are applied when no other source provides the key. Verify they are overridden by client-level tags. | Status: not_done
- [ ] **Test empty tags** — Record with empty tag set. Verify it is valid and recorded with an empty tag set. | Status: not_done

### 6.2 Tag Validation Tests

- [ ] **Test valid tag key formats** — Verify keys with alphanumeric, underscores, dots, hyphens are accepted. | Status: not_done
- [ ] **Test invalid tag key: empty string** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test invalid tag key: starts with number** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test invalid tag key: special characters** — Verify `ChargebackValidationError` is thrown for keys with spaces, `@`, `#`, etc. | Status: not_done
- [ ] **Test invalid tag key: reserved prefix `_cb_`** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test invalid tag value: empty string** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test invalid tag value: exceeds 256 characters** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test tag value at exactly 256 characters** — Verify it is accepted (boundary case). | Status: not_done
- [ ] **Test tag count: exactly 20 pairs** — Verify accepted. | Status: not_done
- [ ] **Test tag count: 21 pairs** — Verify `ChargebackValidationError` is thrown. | Status: not_done
- [ ] **Test required tag keys enforcement** — Configure `requiredTagKeys: ['team']`. Record without `team` tag. Verify `ChargebackValidationError`. | Status: not_done
- [ ] **Test allowed tag keys enforcement** — Configure `allowedTagKeys: ['team', 'project']`. Record with `feature` tag. Verify `ChargebackValidationError`. | Status: not_done
- [ ] **Test `allowedTagKeys: 'any'`** — Verify any tag key is accepted when set to `'any'`. | Status: not_done

### 6.3 Cost Computation Tests

- [ ] **Test OpenAI usage format** — Verify correct cost from `prompt_tokens` and `completion_tokens`. | Status: not_done
- [ ] **Test Anthropic usage format** — Verify correct cost from `input_tokens` and `output_tokens`. | Status: not_done
- [ ] **Test known model pricing** — Verify GPT-4o, Claude Sonnet, Gemini Flash produce correct dollar costs with the spec's pricing table. | Status: not_done
- [ ] **Test unknown model** — Verify cost is 0.00 and a warning is emitted. | Status: not_done
- [ ] **Test custom pricing override** — Provide custom pricing for a model. Verify custom pricing takes precedence over built-in. | Status: not_done
- [ ] **Test dated model name prefix matching** — Verify `gpt-4o-2024-08-06` matches `gpt-4o` pricing. | Status: not_done
- [ ] **Test zero tokens** — Verify cost is 0.00. | Status: not_done
- [ ] **Test explicit cost override** — Pass `cost` field in `RecordInput`. Verify it bypasses pricing computation. | Status: not_done

### 6.4 CostTracker Tests

- [ ] **Test `record()` creates correct CostRecord** — Verify id (UUID format), timestamp (ISO 8601), computed cost, and merged tags. | Status: not_done
- [ ] **Test `query()` with no filters** — Verify all records are returned. | Status: not_done
- [ ] **Test `query()` with tag filter** — Verify only records matching the tag filter are returned. | Status: not_done
- [ ] **Test `query()` with date range** — Verify only records within the from/to range are returned. | Status: not_done
- [ ] **Test `query()` with model filter** — Verify only records for specified models are returned. | Status: not_done
- [ ] **Test `count()` with and without filters** — Verify correct count is returned. | Status: not_done
- [ ] **Test `flush()` writes buffered records** — Record multiple entries, call `flush()`, verify records are in storage. | Status: not_done
- [ ] **Test `close()` flushes and sets closed flag** — Record entries, call `close()`, verify records are flushed. Call `close()` again, verify it is a no-op. | Status: not_done
- [ ] **Test `record()` after `close()` throws** — Verify an error is thrown when recording after tracker is closed. | Status: not_done
- [ ] **Test `purge()` deletes matching records** — Record entries with different tags, purge by tag, verify only matching records are deleted and correct count is returned. | Status: not_done
- [ ] **Test buffer flush threshold** — Record entries up to `maxRecords` minus one, verify nothing flushed. Record one more, verify buffer is flushed to storage. | Status: not_done
- [ ] **Test buffer interval flush** — Record entries below threshold, wait for `maxIntervalMs`, verify records are flushed. | Status: not_done

### 6.5 Report Generation Tests

- [ ] **Test single-dimension groupBy** — Group by `team`. Verify correct group names, costs, percentages. | Status: not_done
- [ ] **Test multi-dimension groupBy** — Group by `['team', 'project']`. Verify correct cross-tabulation and group names (`team / project`). | Status: not_done
- [ ] **Test per-model breakdown within groups** — Verify correct model-level aggregation with percentages. | Status: not_done
- [ ] **Test time series: daily** — Verify correct day boundaries and per-day aggregation. | Status: not_done
- [ ] **Test time series: weekly** — Verify correct week boundaries (Monday start) and per-week aggregation. | Status: not_done
- [ ] **Test time series: monthly** — Verify correct month boundaries and per-month aggregation. | Status: not_done
- [ ] **Test filtering before grouping** — Filter by tag value, verify only matching records are included in totals and groups. | Status: not_done
- [ ] **Test untagged records** — Records missing a `groupBy` key are grouped under `'(untagged)'`. | Status: not_done
- [ ] **Test empty dataset** — No records match. Verify report with zero totals and empty groups. | Status: not_done
- [ ] **Test sorting: cost-desc (default)** — Verify groups ordered by cost descending. | Status: not_done
- [ ] **Test sorting: cost-asc** — Verify groups ordered by cost ascending. | Status: not_done
- [ ] **Test sorting: name-asc** — Verify groups ordered alphabetically by name. | Status: not_done
- [ ] **Test sorting: calls-desc** — Verify groups ordered by call count descending. | Status: not_done
- [ ] **Test limit** — Set `limit: 3`. Verify only top 3 groups returned after sorting. | Status: not_done
- [ ] **Test groupBy key not present in any record** — All records grouped under `'(untagged)'`. | Status: not_done

### 6.6 Export Format Tests

- [ ] **Test JSON export produces valid JSON** — Verify output can be parsed with `JSON.parse()` and matches `ChargebackReport` structure. | Status: not_done
- [ ] **Test CSV export with correct headers** — Verify header row matches groupBy dimensions + metric columns. | Status: not_done
- [ ] **Test CSV delimiter override** — Use `csvDelimiter: ';'`. Verify semicolons used. | Status: not_done
- [ ] **Test CSV without header** — Use `csvHeader: false`. Verify no header row. | Status: not_done
- [ ] **Test CSV escaping** — Values with commas, quotes, and newlines are properly escaped. | Status: not_done
- [ ] **Test Markdown export** — Verify valid Markdown with title, summary, and table. | Status: not_done
- [ ] **Test Markdown custom title** — Use `markdownTitle: 'Custom Title'`. Verify custom title appears. | Status: not_done

### 6.7 Storage Backend Tests

- [ ] **Test in-memory: append, query, purge, close** — Verify basic CRUD operations on the in-memory adapter. | Status: not_done
- [ ] **Test file-based: records persist across tracker restart** — Create a tracker with file storage, record entries, close it. Create a new tracker with the same file. Verify all records are present. | Status: not_done
- [ ] **Test file-based: atomic write safety** — Verify that partial writes do not corrupt the file (temp file + rename pattern). | Status: not_done
- [ ] **Test file-based: empty file handled** — Start with an empty (or non-existent) file. Verify tracker starts with zero records. | Status: not_done
- [ ] **Test file-based: non-existent directory** — Provide a path in a non-existent directory. Verify `ChargebackStorageError` with clear message. | Status: not_done
- [ ] **Test custom adapter: interface methods called correctly** — Create a mock adapter. Verify `append`, `query`, `purge`, `close` are called with correct arguments. | Status: not_done

### 6.8 AsyncLocalStorage Context Tests

- [ ] **Test concurrent async operations isolation** — Two concurrent `runWithTags` calls with different tags. Verify each records to its own tag set without cross-contamination. | Status: not_done
- [ ] **Test nested contexts** — Outer `runWithTags` with `{ team: 'a' }`, inner with `{ team: 'b' }`. Verify inner context overrides for overlapping keys. | Status: not_done
- [ ] **Test no active context** — Call an API without `runWithTags`. Verify only client-level tags are used. | Status: not_done
- [ ] **Test context isolation between requests** — Verify one request's tags do not leak to another concurrent request. | Status: not_done

### 6.9 CLI Tests

- [ ] **Test all flags parsed correctly** — Verify `--storage`, `--group-by`, `--from`, `--to`, `--filter`, `--model`, `--time-series`, `--format`, `--output`, `--limit`, `--sort` are parsed to correct values. | Status: not_done
- [ ] **Test missing required flags** — Missing `--storage`. Verify error message and exit code 2. | Status: not_done
- [ ] **Test invalid date format** — Invalid `--from` value. Verify error message and exit code 2. | Status: not_done
- [ ] **Test `--filter` parsed as key=value** — `--filter team=search --filter env=prod`. Verify parsed to `{ team: 'search', env: 'prod' }`. | Status: not_done
- [ ] **Test `--group-by` parsed as comma-separated** — `--group-by team,project`. Verify parsed to `['team', 'project']`. | Status: not_done
- [ ] **Test environment variable fallbacks** — Verify `AI_CHARGEBACK_STORAGE_PATH` and other env vars are used when flags are not provided. | Status: not_done

### 6.10 Integration Tests

- [ ] **Test OpenAI SDK wrapping end-to-end** — Wrap an OpenAI client, call a mock HTTP server returning realistic response with usage data. Verify cost record stored with correct tags, tokens, and cost. | Status: not_done
- [ ] **Test Anthropic SDK wrapping end-to-end** — Same as above with Anthropic client and response format. | Status: not_done
- [ ] **Test streaming response end-to-end** — Wrap a client, make a streaming call to mock server. Verify usage captured from stream completion event. | Status: not_done
- [ ] **Test context tagging end-to-end** — Set up `runWithTags`, make API calls within context. Verify records have context-level tags. | Status: not_done
- [ ] **Test multi-level tag merge end-to-end** — Set client, context, and request tags. Make a call. Verify the merged tag set in the stored record. | Status: not_done
- [ ] **Test report round-trip** — Record 100 cost entries with various tags. Generate report grouped by team. Verify correct totals and percentages. | Status: not_done
- [ ] **Test file storage round-trip** — Create tracker with file storage, record entries, close tracker. Create new tracker with same file. Verify all records present. | Status: not_done
- [ ] **Test CLI `report` end-to-end** — Create a cost data file, run CLI `report` command via child process. Verify output format and content. | Status: not_done
- [ ] **Test CLI `export` end-to-end** — Run CLI `export` command with CSV format. Verify output file contains correct data. | Status: not_done

### 6.11 Edge Case Tests

- [ ] **Test cost record with no tags** — Recorded with empty tag set. Appears as `(untagged)` in reports. | Status: not_done
- [ ] **Test tag key at maximum allowed length** — Long but valid tag key is accepted. | Status: not_done
- [ ] **Test tag value at exactly 256 characters** — Accepted (boundary). | Status: not_done
- [ ] **Test 20 tag key-value pairs accepted, 21 rejected** — Boundary test for tag count limit. | Status: not_done
- [ ] **Test `groupBy` key not present in any record** — All records grouped under `'(untagged)'`. | Status: not_done
- [ ] **Test report with date range matching no records** — Empty report with zero totals. | Status: not_done
- [ ] **Test file storage: empty file** — Tracker starts with zero records. | Status: not_done
- [ ] **Test file storage: file created on first flush** — Path does not exist. File created on first flush. | Status: not_done
- [ ] **Test file storage: directory does not exist** — Throw error with clear message. | Status: not_done
- [ ] **Test concurrent `record()` calls** — Multiple async operations record simultaneously. All records captured without data loss. | Status: not_done
- [ ] **Test `close()` called twice** — Second call is a no-op. No error thrown. | Status: not_done
- [ ] **Test `record()` after `close()`** — Throws an error. | Status: not_done

---

## Phase 7: Documentation and Publishing

### 7.1 Documentation

- [ ] **Write README.md** — Create a comprehensive README with: overview, installation, quick start, API reference (tag, runWithTags, getCurrentTags, createTracker), configuration guide (all ChargebackConfig options), CLI usage (all commands and flags), export formats, storage backends, examples (from spec sections 7 and 20), TypeScript types summary. | Status: not_done
- [ ] **Add JSDoc comments to all public exports** — Add JSDoc to `tag()`, `runWithTags()`, `getCurrentTags()`, `createTracker()`, and all exported type definitions. Include parameter descriptions, return types, and usage examples. | Status: not_done

### 7.2 Package Configuration

- [ ] **Update `package.json` with bin field** — Add `"bin": { "ai-chargeback": "dist/cli.js" }` for CLI registration. | Status: not_done
- [ ] **Add peer dependencies** — Add optional `model-price-registry` as a peer dependency: `"peerDependencies": { "model-price-registry": "^0.1.0" }`, `"peerDependenciesMeta": { "model-price-registry": { "optional": true } }`. | Status: not_done
- [ ] **Add dev dependencies** — Add `typescript`, `vitest`, `eslint`, `openai`, `@anthropic-ai/sdk` to `devDependencies`. | Status: not_done
- [ ] **Add keywords to `package.json`** — Add relevant keywords: `ai`, `chargeback`, `cost-allocation`, `cost-tracking`, `llm`, `openai`, `anthropic`, `tagging`, `showback`, `finops`. | Status: not_done
- [ ] **Verify `engines` field** — Ensure `"engines": { "node": ">=18" }` is set. | Status: not_done

### 7.3 Build and Lint

- [ ] **Verify TypeScript compilation** — Run `npm run build`. Ensure all source files compile without errors. Verify `dist/` output includes `.js`, `.d.ts`, and `.d.ts.map` files. | Status: not_done
- [ ] **Configure ESLint** — Set up ESLint configuration for the project if not already present. Ensure `npm run lint` passes. | Status: not_done
- [ ] **Run full test suite** — Execute `npm run test` (vitest run). All unit, integration, and edge case tests must pass. | Status: not_done

### 7.4 Version and Publish Preparation

- [ ] **Bump version appropriately** — Update `package.json` version according to semver based on implemented features (initial release likely `1.0.0` after all phases). | Status: not_done
- [ ] **Final pre-publish verification** — Run `npm run build`, `npm run test`, `npm run lint` in sequence. All must pass. Verify `dist/` contains all expected files. | Status: not_done
