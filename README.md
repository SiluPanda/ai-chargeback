# ai-chargeback

Tag and allocate AI API costs by team, project, or feature.

## Installation

```bash
npm install ai-chargeback
```

## Quick Start

```typescript
import { createTracker } from 'ai-chargeback';

// Coming soon: createTracker is not yet implemented.
// When available, usage will look like:

const tracker = createTracker({
  storage: { type: 'memory' },
  defaultTags: { environment: 'production' },
});

// Record a cost entry
await tracker.record({
  tags: { team: 'search', project: 'autocomplete' },
  model: 'gpt-4o',
  inputTokens: 1500,
  outputTokens: 400,
});

// Generate a report
const report = await tracker.report({
  groupBy: ['team'],
  timeSeries: 'month',
});
```

## Available Exports

### Types

All core type definitions are exported for TypeScript consumers:

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

### Error Classes

```typescript
import {
  ChargebackValidationError,
  ChargebackStorageError,
  ChargebackConfigError,
} from 'ai-chargeback';
```

### Pricing API

```typescript
import { BUILT_IN_PRICING, getPrice, computeCost } from 'ai-chargeback';
```

## Pricing API

### `BUILT_IN_PRICING`

A `Record<string, ModelPricing>` containing pricing data (USD per million tokens) for 16 popular models across OpenAI, Anthropic, and Google:

| Model | Input ($/MTok) | Output ($/MTok) |
|---|---|---|
| gpt-4o | 2.50 | 10.00 |
| gpt-4o-mini | 0.15 | 0.60 |
| gpt-4-turbo | 10.00 | 30.00 |
| gpt-4 | 30.00 | 60.00 |
| gpt-3.5-turbo | 0.50 | 1.50 |
| o1 | 15.00 | 60.00 |
| o1-mini | 3.00 | 12.00 |
| o3-mini | 1.10 | 4.40 |
| claude-opus-4-20250514 | 15.00 | 75.00 |
| claude-sonnet-4-20250514 | 3.00 | 15.00 |
| claude-haiku-3-20250307 | 0.80 | 4.00 |
| claude-3-5-sonnet-20241022 | 3.00 | 15.00 |
| claude-3-haiku-20240307 | 0.25 | 1.25 |
| gemini-1.5-pro | 1.25 | 5.00 |
| gemini-1.5-flash | 0.075 | 0.30 |
| gemini-2.0-flash | 0.10 | 0.40 |

### `getPrice(model, customPricing?)`

Look up pricing for a model by name. Checks custom pricing first (if provided), then the built-in table. Automatically strips dated suffixes (e.g., `gpt-4o-2024-08-06` resolves to `gpt-4o`).

```typescript
const pricing = getPrice('gpt-4o');
// { input: 2.50, output: 10.00 }

const dated = getPrice('gpt-4o-2024-08-06');
// { input: 2.50, output: 10.00 }

const custom = getPrice('my-model', { 'my-model': { input: 1.00, output: 2.00 } });
// { input: 1.00, output: 2.00 }

const unknown = getPrice('unknown-model');
// undefined
```

### `computeCost(inputTokens, outputTokens, pricing)`

Compute the dollar cost given token counts and pricing.

Formula: `(inputTokens / 1,000,000 * pricing.input) + (outputTokens / 1,000,000 * pricing.output)`

```typescript
const cost = computeCost(1500, 400, { input: 2.50, output: 10.00 });
// 0.00775
```

## License

MIT
