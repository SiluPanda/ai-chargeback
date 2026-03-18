# ai-chargeback -- Specification

## 1. Overview

`ai-chargeback` is a cost allocation library for AI API usage. It tags every AI API call with cost center metadata -- team, project, feature, environment -- accumulates token usage and dollar costs per tag combination, and generates chargeback reports that break down AI spend by any dimension. It answers the question every enterprise AI platform team eventually faces: "Which team, project, or feature is responsible for which portion of our AI API bill?"

The gap this package fills is specific and well-defined. Cloud providers solved cost allocation decades ago: AWS has Cost Allocation Tags, GCP has Labels, and Azure has Tags. These systems let organizations tag cloud resources with metadata (team, project, cost center) and generate per-tag cost reports for internal billing. But AI API costs are different from cloud infrastructure costs. AI costs are per-request, not per-resource. There is no "instance" to tag -- costs accrue from individual API calls, each with a different token count, model, and price. The granularity is fundamentally different: a single feature can make thousands of API calls per hour across multiple models, and the cost of each call depends on the prompt length, output length, and model selected. Existing cloud cost allocation tools cannot attribute AI API costs to the business entities that incurred them because they operate at the wrong abstraction layer.

Several tools in the AI observability space touch cost tracking. Helicone provides per-request cost tracking via a proxy, but it is a hosted platform focused on observability, not internal cost allocation -- it does not produce chargeback reports grouped by arbitrary business dimensions. Langfuse tracks costs per trace and per user, but again as a hosted observability platform, not a library that integrates into application code for cost allocation. OpenAI's usage dashboard shows total spend by API key, but API keys are a crude proxy for cost centers -- organizations cannot issue a separate API key per team-project-feature combination. None of these tools produce the monthly chargeback report that a finance team needs: "Team Search spent $4,200 on AI in March, of which $3,100 was the autocomplete feature using GPT-4o and $1,100 was the ranking feature using Claude Haiku."

`ai-chargeback` provides this missing capability as a lightweight TypeScript library. It operates through three mechanisms: a tagging middleware that wraps AI SDK clients to attach cost center metadata to every call, a cost tracker that accumulates token usage and dollar costs per tag combination, and a report generator that produces per-entity cost breakdowns in multiple formats. The library is designed for production use in server-side Node.js applications where multiple teams, projects, and features share a common AI API account.

The distinction from related packages in this monorepo is precise:

- **`token-fence`** enforces token budgets by truncating or rejecting requests that exceed limits. It is a guardrail that prevents overspending. `ai-chargeback` does not enforce limits -- it observes and reports. Token-fence answers "should this call be allowed?" while ai-chargeback answers "who should pay for this call?"
- **`ai-circuit-breaker`** protects against cascading failures and runaway spend by tripping a circuit when error rates or costs exceed thresholds. It is a safety mechanism. `ai-chargeback` does not trip circuits or block calls -- it records costs for attribution. Circuit-breaker answers "should we stop calling this API?" while ai-chargeback answers "how much did each team spend on this API?"
- **`llm-cost-per-test`** attributes AI costs to test cases within a test runner. It operates in the testing domain with test-scoped lifecycle hooks. `ai-chargeback` operates in the production domain with arbitrary cost center tags and persistent storage. Cost-per-test answers "which test is expensive?" while ai-chargeback answers "which team's production feature is expensive?"
- **`model-price-registry`** provides a pricing database. `ai-chargeback` uses it (or a built-in pricing table) to compute dollar costs from token counts. The registry is a data source; chargeback is a cost attribution system.

`ai-chargeback` provides both a TypeScript/JavaScript API for programmatic use and a CLI for report generation and data export. The API offers SDK client wrapping for automatic cost capture, manual cost recording for custom integrations, flexible report queries with filtering and grouping, and multiple export formats (JSON, CSV, Markdown). The CLI provides commands for generating reports, exporting data, and managing stored cost records.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `tag(client, tags)` middleware function that wraps AI SDK clients (OpenAI, Anthropic) with cost center metadata, automatically recording token usage and cost for every API call with the associated tags.
- Provide a `createTracker(config)` function that creates a cost tracker with configurable storage (in-memory, file-based, or custom adapter), pricing, and retention settings.
- Support arbitrary tag dimensions: `team`, `project`, `feature`, `environment`, and user-defined custom tags. Tags are string key-value pairs with no fixed schema, enabling organizations to define their own cost allocation taxonomy.
- Compute dollar costs from token usage using a built-in model pricing table, with fallback to `model-price-registry` and support for custom pricing overrides.
- Generate chargeback reports grouped by any combination of tag dimensions: per-team, per-project, per-feature, per-model, per-time-period, or any cross-tabulation (e.g., per-team-per-model, per-project-per-month).
- Export reports in JSON, CSV, and Markdown formats for integration with finance systems, spreadsheets, and internal dashboards.
- Provide a CLI (`ai-chargeback`) for generating reports, exporting data, and listing tracked cost records without writing application code.
- Support three storage backends: in-memory (for development and testing), file-based JSON (for single-server deployments), and a custom adapter interface (for databases, cloud storage, or external systems).
- Handle concurrent tag contexts using `AsyncLocalStorage`, so that multiple requests executing simultaneously each attribute costs to their own tag set without cross-contamination.
- Provide time-windowed queries: daily, weekly, monthly, and custom date range cost breakdowns.
- Ship complete TypeScript type definitions for all public APIs, configuration objects, report types, and storage adapter interfaces.
- Keep runtime dependencies at zero beyond Node.js built-ins. AI provider SDKs are peer dependencies used only for type information in the tagging middleware.

### Non-Goals

- **Not a budget enforcement tool.** This package records and reports costs. It does not prevent, throttle, or reject API calls that exceed spending limits. For budget enforcement, use `token-fence` (per-request token limits) or `ai-circuit-breaker` (aggregate spend circuit breaking). Chargeback reports produced by `ai-chargeback` can inform the configuration of those enforcement tools, but enforcement is a separate concern.
- **Not an observability platform.** This package does not provide dashboards, real-time alerting, trace visualization, or time-series storage. It produces point-in-time reports from accumulated cost data. For real-time observability, use Helicone, Langfuse, or OpenLLMetry. `ai-chargeback`'s export formats (JSON, CSV) are designed to feed into external dashboards and alerting systems.
- **Not a billing system.** This package computes estimated costs based on published per-token pricing. It does not integrate with payment processors, generate invoices, or reconcile against actual provider invoices. Cost estimates may differ from invoiced amounts due to volume discounts, committed-use agreements, cached input discounts, batch API pricing, or pricing changes. The costs are estimates for internal allocation, not external billing.
- **Not an API proxy.** This package wraps SDK client objects in the application process. It does not intercept network traffic, run as a sidecar, or require routing API calls through a proxy server. All tagging and cost recording happens in-process via method interception.
- **Not a token counter.** This package reads token counts from API responses (where the provider reports actual usage). It does not tokenize prompts locally. For local token estimation, use `tiktoken` or `@anthropic-ai/tokenizer`.
- **Not a cost optimization recommender.** This package reports what was spent and by whom. It does not recommend model substitutions, prompt changes, or caching strategies. The data it produces informs optimization decisions, but the recommendations are the user's responsibility.

---

## 3. Target Users

### Platform / AI Infrastructure Teams

Teams that manage shared AI API accounts for an organization. They provision API keys, set up model access, and need to attribute costs back to the consuming teams. They configure `ai-chargeback` centrally, define the tag taxonomy (which dimensions are required, which are optional), and generate monthly chargeback reports that feed into the organization's internal billing or showback process.

### Engineering Managers and Tech Leads

Managers who need visibility into their team's AI spend. They do not configure the tracker -- the platform team does -- but they consume the reports. They need to answer questions like: "How much did my team spend on AI last month? Which feature is the most expensive? Is our spend growing or stable? How does our spend compare to last quarter?"

### Finance and FinOps Teams

Teams responsible for cloud cost management and internal billing. They receive chargeback reports from the platform team and use them to allocate AI costs to business units, departments, or cost centers in the organization's financial system. They need reports in CSV or JSON format that can be imported into their existing financial tools and ERP systems. They care about monthly totals by cost center, not per-request details.

### Product Teams with AI Features

Teams building AI-powered features (search, recommendations, content generation, chatbots) who want to understand the cost profile of their features. They tag their API calls with feature-level metadata and use the reports to understand per-feature unit economics: "Our AI search feature costs $0.003 per query" or "content generation costs $0.12 per document."

### Individual Developers During Development

Developers who want to understand the cost impact of their code during development. They use the in-memory tracker to see real-time cost accumulation during local development, understanding how different models, prompts, and conversation patterns affect cost before deploying to production.

---

## 4. Core Concepts

### Cost Centers

A cost center is a business entity to which costs are attributed. In enterprise cloud cost management, cost centers typically correspond to organizational units: teams, departments, business units, or product lines. In `ai-chargeback`, cost centers are defined by tag combinations. A tag set `{ team: 'search', project: 'autocomplete', feature: 'suggestions' }` defines a cost center that represents "the suggestions feature within the autocomplete project owned by the search team." The same API call can belong to exactly one cost center, defined by the tags applied at the time of the call.

Cost centers are not predefined or registered. They emerge from the tag values used in API calls. If a call is tagged with `{ team: 'search' }` and no prior call has used that team value, the cost center is created implicitly. This mirrors how AWS Cost Allocation Tags work: tag values are not predefined in a registry; they are applied to resources (or in this case, API calls) and cost reports are generated by grouping on tag values.

### Tags

Tags are string key-value pairs attached to AI API calls. They carry the cost attribution metadata. `ai-chargeback` recognizes several conventional tag keys and supports arbitrary user-defined keys:

**Conventional tag keys:**

| Key | Purpose | Example Values |
|-----|---------|----------------|
| `team` | The team or organizational unit responsible for the cost | `search`, `platform`, `ml-infra`, `content` |
| `project` | The project or initiative the cost belongs to | `autocomplete`, `chatbot-v2`, `doc-summarizer` |
| `feature` | The specific feature or capability within a project | `suggestions`, `intent-classification`, `rag-retrieval` |
| `environment` | The deployment environment | `production`, `staging`, `development`, `ci` |

**User-defined tag keys:** Any string key-value pair beyond the conventional keys. Examples: `costCenter: 'CC-4420'`, `businessUnit: 'consumer'`, `region: 'us-east'`, `customer: 'acme-corp'`. User-defined tags are first-class: they participate in grouping, filtering, and reporting exactly like conventional tags.

Tags are immutable once attached to a cost record. They are recorded at the time of the API call and cannot be modified retroactively. This ensures audit integrity: the cost attribution reflects the state at the time the cost was incurred.

### Tagging Strategy

Tagging can be applied at multiple levels, and tags from different levels are merged:

- **Client-level tags**: Applied when wrapping an SDK client with `tag()`. Every call through the wrapped client inherits these tags. Suitable for service-level attribution where an entire service runs under one team/project.
- **Request-level tags**: Applied per API call, overriding or extending client-level tags. Suitable for feature-level attribution where a single service handles multiple features.
- **Context-level tags**: Applied via `AsyncLocalStorage` context, automatically inherited by all API calls within the context. Suitable for request-scoped attribution in web servers where the team/project/feature is determined by the incoming HTTP request.

When tags from multiple levels apply to the same call, they are merged with this precedence (highest to lowest): request-level > context-level > client-level. If the same key appears at multiple levels, the highest-precedence value wins.

### Cost Records

A cost record is the atomic unit of cost data. Each record represents one AI API call and contains:

- **Timestamp**: When the call was made (ISO 8601).
- **Tags**: The merged tag set for this call.
- **Model**: The AI model used (e.g., `gpt-4o`, `claude-sonnet-4-20250514`).
- **Provider**: The AI provider (e.g., `openai`, `anthropic`).
- **Token usage**: Input tokens, output tokens, and total tokens.
- **Cost**: The computed dollar cost for this call.
- **Metadata**: Optional additional data (request ID, latency, etc.).

Cost records are append-only. They are never modified or deleted through the normal API. A separate `tracker.purge()` method exists for retention management.

### Chargeback vs. Showback

In enterprise cost management, chargeback and showback are two approaches to cost attribution:

- **Chargeback**: Costs are formally billed back to the consuming business unit. The AI platform team "charges" the search team $4,200 for March AI usage, and that amount appears in the search team's budget. This requires financial system integration and organizational buy-in.
- **Showback**: Costs are reported to consuming teams for visibility, but no formal billing occurs. The search team sees they used $4,200 of AI in March, but the cost is absorbed by the platform team's central budget. This is an informational mechanism to drive cost awareness.

`ai-chargeback` supports both models. The reports it generates can be used for formal chargeback (exported to financial systems) or informational showback (displayed in dashboards). The package is named "chargeback" because it provides the data infrastructure needed for chargeback -- which is the more demanding use case. Showback is a subset of chargeback that simply does not feed into the billing system.

### Cost Allocation

Cost allocation is the process of distributing shared costs to the entities that consumed them. In `ai-chargeback`, allocation is direct: each API call is tagged with exactly one set of cost center tags, and the entire cost of that call is attributed to that cost center. There is no fractional allocation, weighted distribution, or shared cost pools. This is a deliberate simplification -- direct allocation based on explicit tagging is auditable, understandable, and sufficient for the overwhelming majority of AI cost attribution needs.

If an API call cannot be attributed (no tags are set), it is recorded with an empty tag set and appears in reports as "untagged" or "unattributed" cost. This serves as an accountability mechanism: untagged costs indicate gaps in the tagging implementation that should be addressed.

---

## 5. Tagging Strategy

### Client-Level Tagging with `tag()`

The primary tagging mechanism is the `tag()` function, which wraps an AI SDK client with cost center tags. Every API call made through the wrapped client is automatically recorded with the specified tags.

```typescript
import OpenAI from 'openai';
import { tag, createTracker } from 'ai-chargeback';

const tracker = createTracker({ storage: { type: 'file', path: './costs.json' } });
const openai = new OpenAI();

// Wrap the client with cost center tags
const taggedClient = tag(openai, {
  tags: { team: 'search', project: 'autocomplete', feature: 'suggestions' },
  tracker,
});

// Every call through taggedClient is tagged and cost-tracked
const response = await taggedClient.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Complete this search query: ...' }],
});
// Cost recorded: { team: 'search', project: 'autocomplete', feature: 'suggestions',
//                  model: 'gpt-4o', inputTokens: 45, outputTokens: 12, cost: 0.000233 }
```

The wrapped client behaves identically to the original. Return values, errors, streaming behavior, and TypeScript types are all preserved. The wrapping is transparent to the calling code.

### Request-Level Tag Overrides

Individual API calls can override or extend client-level tags by passing tag metadata via the `tag()` wrapper's options:

```typescript
import { tag, createTracker } from 'ai-chargeback';
import Anthropic from '@anthropic-ai/sdk';

const tracker = createTracker();
const anthropic = new Anthropic();

const taggedClient = tag(anthropic, {
  tags: { team: 'content', project: 'cms' },
  tracker,
});

// Override the feature tag per request
const response = await taggedClient.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Summarize this article: ...' }],
}, {
  chargebackTags: { feature: 'summarization', environment: 'production' },
});
// Cost recorded: { team: 'content', project: 'cms', feature: 'summarization',
//                  environment: 'production', model: 'claude-sonnet-4-20250514', ... }
```

### Context-Level Tagging with `runWithTags()`

For web servers and request handlers, `runWithTags()` establishes an `AsyncLocalStorage` context that automatically tags all API calls made within that context:

```typescript
import { runWithTags, tag, createTracker } from 'ai-chargeback';
import OpenAI from 'openai';

const tracker = createTracker({ storage: { type: 'file', path: './costs.json' } });
const openai = tag(new OpenAI(), { tracker });

// In an Express route handler:
app.post('/api/search', async (req, res) => {
  await runWithTags(
    { team: 'search', project: 'autocomplete', feature: req.body.feature },
    async () => {
      // All OpenAI calls within this context inherit the tags
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: req.body.query }],
      });
      res.json(result);
    },
  );
});
```

`AsyncLocalStorage` ensures that concurrent requests each carry their own tag context. Two requests handled simultaneously -- one for `feature: 'suggestions'` and one for `feature: 'intent-detection'` -- correctly attribute costs to their respective features, even if they share the same `OpenAI` client instance.

### Tag Merge Precedence

When tags are set at multiple levels, they merge with this precedence:

```
Request-level tags  (highest priority)
    ↓ overrides
Context-level tags  (AsyncLocalStorage)
    ↓ overrides
Client-level tags   (lowest priority)
```

Example:

```typescript
// Client-level: { team: 'search', environment: 'production' }
const client = tag(openai, {
  tags: { team: 'search', environment: 'production' },
  tracker,
});

await runWithTags({ project: 'autocomplete', environment: 'staging' }, async () => {
  // Context adds project, overrides environment
  // Effective: { team: 'search', project: 'autocomplete', environment: 'staging' }

  await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '...' }],
  }, {
    chargebackTags: { feature: 'suggestions', environment: 'canary' },
  });
  // Request-level adds feature, overrides environment again
  // Final: { team: 'search', project: 'autocomplete', feature: 'suggestions', environment: 'canary' }
});
```

### Tag Validation

Tags are validated at recording time. Validation rules:

- Tag keys must be non-empty strings matching `/^[a-zA-Z][a-zA-Z0-9_.-]*$/` (alphanumeric with underscores, dots, hyphens, starting with a letter).
- Tag values must be non-empty strings, maximum 256 characters.
- Maximum 20 tag key-value pairs per cost record.
- Reserved key prefix `_cb_` is reserved for internal use by the tracker.

Invalid tags cause a `ChargebackValidationError` to be thrown at the point of recording. This is a loud failure by design: silent tag corruption would undermine the reliability of cost attribution data.

---

## 6. Cost Tracking

### Token Usage Extraction

`ai-chargeback` extracts token usage from AI API responses. Each provider reports usage in a different format:

**OpenAI** (chat completions, completions):
```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 42,
    "total_tokens": 192
  }
}
```

**Anthropic** (messages):
```json
{
  "usage": {
    "input_tokens": 150,
    "output_tokens": 42
  }
}
```

All provider formats are normalized into a canonical `{ inputTokens, outputTokens }` pair for storage and cost computation.

### Streaming Responses

For streaming responses, token usage is captured from the stream completion event:

- **OpenAI**: When `stream_options: { include_usage: true }` is set, the final stream chunk includes a `usage` field. `ai-chargeback` detects this final chunk and records the usage. If `include_usage` is not set, the cost is recorded with zero tokens and a warning is emitted.
- **Anthropic**: Usage data is split across events. `input_tokens` appears in the `message_start` event, and `output_tokens` appears in the `message_delta` event with `stop_reason`. Both are accumulated.

### Cost Computation

Cost is computed from token usage and model pricing:

```
cost = (inputTokens / 1_000_000 * inputPricePerMTok) + (outputTokens / 1_000_000 * outputPricePerMTok)
```

The pricing lookup order is:

1. **Custom pricing** provided in tracker configuration (`config.pricing`).
2. **Built-in pricing table** covering commonly used models (same table as `llm-cost-per-test`).
3. **`model-price-registry`** peer dependency (if installed) for models not in the built-in table.
4. **Zero cost with warning** if the model is not found in any pricing source.

Model names are matched with prefix normalization: `gpt-4o-2024-08-06` matches the `gpt-4o` entry. Dated model suffixes are stripped during lookup.

### Built-In Pricing Table

| Model | Input ($/MTok) | Output ($/MTok) |
|-------|----------------|-----------------|
| `gpt-4o` | $2.50 | $10.00 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `gpt-4-turbo` | $10.00 | $30.00 |
| `gpt-4` | $30.00 | $60.00 |
| `gpt-3.5-turbo` | $0.50 | $1.50 |
| `o1` | $15.00 | $60.00 |
| `o1-mini` | $3.00 | $12.00 |
| `o3-mini` | $1.10 | $4.40 |
| `claude-opus-4-20250514` | $15.00 | $75.00 |
| `claude-sonnet-4-20250514` | $3.00 | $15.00 |
| `claude-haiku-3-20250307` | $0.80 | $4.00 |
| `claude-3-5-sonnet-20241022` | $3.00 | $15.00 |
| `claude-3-haiku-20240307` | $0.25 | $1.25 |
| `gemini-1.5-pro` | $1.25 | $5.00 |
| `gemini-1.5-flash` | $0.075 | $0.30 |
| `gemini-2.0-flash` | $0.10 | $0.40 |

### Manual Cost Recording

For integrations where automatic interception is not possible -- custom LLM providers, non-standard APIs, calls routed through message queues, or pre-aggregated usage data -- the tracker provides a manual recording API:

```typescript
const tracker = createTracker();

tracker.record({
  tags: { team: 'search', project: 'autocomplete' },
  model: 'gpt-4o',
  provider: 'openai',
  inputTokens: 500,
  outputTokens: 150,
});

// Or with explicit cost (bypasses pricing lookup):
tracker.record({
  tags: { team: 'content', project: 'cms' },
  model: 'custom-fine-tuned-model',
  provider: 'openai',
  inputTokens: 1000,
  outputTokens: 200,
  cost: 0.05,
});
```

### Accumulation

Cost records are accumulated in the configured storage backend. Each `tracker.record()` call appends a new cost record. Records are never aggregated or compacted in storage -- they are stored at full granularity to support arbitrary post-hoc grouping and filtering. Aggregation happens at query time when reports are generated.

For high-throughput production systems, the tracker batches writes to storage. Records are buffered in memory and flushed to storage periodically (configurable, default: every 100 records or every 5 seconds, whichever comes first). An explicit `tracker.flush()` method forces an immediate write. The `tracker.close()` method flushes remaining records and releases storage resources.

---

## 7. API Surface

### Installation

```bash
npm install ai-chargeback
```

### Core Exports

```typescript
import {
  // Tagging
  tag,
  runWithTags,
  getCurrentTags,

  // Tracker
  createTracker,

  // Types (re-exported for convenience)
  type ChargebackConfig,
  type Tags,
  type CostRecord,
  type TaggedClientOptions,
  type TrackerOptions,
  type ReportOptions,
  type ChargebackReport,
  type CostBreakdown,
  type TimeSeriesEntry,
  type StorageAdapter,
  type ExportFormat,
} from 'ai-chargeback';
```

### `tag(client, options)`

Wraps an AI SDK client with cost center tags and a tracker. Returns a proxied client that records cost data for every API call.

```typescript
function tag<T extends object>(client: T, options: TaggedClientOptions): T;
```

**Type preservation**: `tag(client: OpenAI, ...)` returns `OpenAI`. The proxy preserves all TypeScript types. The caller experiences no type changes and no behavioral changes beyond silent cost recording.

**Supported SDK clients**:

| SDK | Intercepted Methods | Usage Location in Response |
|-----|---------------------|---------------------------|
| OpenAI | `chat.completions.create` | `response.usage.prompt_tokens`, `response.usage.completion_tokens` |
| OpenAI | `completions.create` | `response.usage.prompt_tokens`, `response.usage.completion_tokens` |
| OpenAI | `embeddings.create` | `response.usage.prompt_tokens`, `response.usage.total_tokens` |
| Anthropic | `messages.create` | `response.usage.input_tokens`, `response.usage.output_tokens` |
| Anthropic | `messages.stream` | Final message's `usage.input_tokens`, `usage.output_tokens` |

### `runWithTags(tags, fn)`

Runs an async function within an `AsyncLocalStorage` context that applies the given tags to all cost records created within that context.

```typescript
function runWithTags<T>(tags: Tags, fn: () => T | Promise<T>): Promise<T>;
```

Tags set via `runWithTags` are inherited by all `tag()`-wrapped clients called within the function. They merge with client-level tags (context tags take precedence over client-level tags). Contexts can be nested -- inner contexts override outer contexts for overlapping keys.

### `getCurrentTags()`

Returns the current tag set from `AsyncLocalStorage`, or `null` if called outside a `runWithTags` context.

```typescript
function getCurrentTags(): Tags | null;
```

### `createTracker(config?)`

Creates a cost tracker instance. The tracker is the central component that accumulates cost records and generates reports.

```typescript
function createTracker(config?: ChargebackConfig): CostTracker;
```

### Type Definitions

```typescript
// ── Tags ─────────────────────────────────────────────────────────────

/** A set of cost center tags. Keys and values are strings. */
type Tags = Record<string, string>;

// ── Tagging Options ──────────────────────────────────────────────────

interface TaggedClientOptions {
  /** Cost center tags to attach to every call through this client. */
  tags?: Tags;

  /** The tracker instance to record costs to.
   *  If not provided, uses the default global tracker (if set). */
  tracker?: CostTracker;
}

// ── Cost Record ──────────────────────────────────────────────────────

/** A single cost record representing one AI API call. */
interface CostRecord {
  /** Unique identifier for this record. */
  id: string;

  /** ISO 8601 timestamp of when the call was made. */
  timestamp: string;

  /** The merged tag set for this call. */
  tags: Tags;

  /** The AI model used (e.g., 'gpt-4o'). */
  model: string;

  /** The AI provider (e.g., 'openai', 'anthropic'). */
  provider: string;

  /** Number of input/prompt tokens. */
  inputTokens: number;

  /** Number of output/completion tokens. */
  outputTokens: number;

  /** Total tokens (inputTokens + outputTokens). */
  totalTokens: number;

  /** Computed cost in USD. */
  cost: number;

  /** Optional metadata. */
  metadata?: Record<string, unknown>;
}

// ── Manual Recording Input ───────────────────────────────────────────

interface RecordInput {
  /** Cost center tags for this record. */
  tags: Tags;

  /** Model name. */
  model: string;

  /** Provider name. Default: inferred from model name. */
  provider?: string;

  /** Input tokens. */
  inputTokens: number;

  /** Output tokens. */
  outputTokens: number;

  /** Override the computed cost with an explicit dollar amount. */
  cost?: number;

  /** Optional metadata to attach to the record. */
  metadata?: Record<string, unknown>;
}

// ── Tracker Configuration ────────────────────────────────────────────

interface ChargebackConfig {
  /** Storage backend configuration. Default: { type: 'memory' }. */
  storage?: StorageConfig;

  /** Custom model pricing ($/MTok). Merges with built-in pricing. */
  pricing?: Record<string, ModelPricing>;

  /** Write buffer configuration. */
  buffer?: {
    /** Maximum number of records to buffer before flushing. Default: 100. */
    maxRecords?: number;

    /** Maximum time in milliseconds before flushing. Default: 5000. */
    maxIntervalMs?: number;
  };

  /** Default tags applied to all records (lowest precedence). */
  defaultTags?: Tags;

  /** Tag key validation. When set to an array, only these tag keys are
   *  accepted. When set to 'any', all keys are accepted. Default: 'any'. */
  allowedTagKeys?: string[] | 'any';

  /** Required tag keys. Records without these tags are rejected with
   *  a ChargebackValidationError. Default: []. */
  requiredTagKeys?: string[];
}

/** Pricing for a single model in USD per million tokens. */
interface ModelPricing {
  /** Price per million input tokens. */
  input: number;

  /** Price per million output tokens. */
  output: number;
}

// ── Storage Configuration ────────────────────────────────────────────

type StorageConfig =
  | { type: 'memory' }
  | { type: 'file'; path: string }
  | { type: 'custom'; adapter: StorageAdapter };

/** Interface for custom storage backends. */
interface StorageAdapter {
  /** Append one or more cost records. */
  append(records: CostRecord[]): Promise<void>;

  /** Query cost records matching the given filters. */
  query(filters: QueryFilters): Promise<CostRecord[]>;

  /** Delete cost records matching the given filters (for retention). */
  purge(filters: QueryFilters): Promise<number>;

  /** Release resources. Called on tracker.close(). */
  close(): Promise<void>;
}

interface QueryFilters {
  /** Filter by date range (inclusive). */
  from?: string; // ISO 8601
  to?: string;   // ISO 8601

  /** Filter by tag values. Records must match all specified tags. */
  tags?: Tags;

  /** Filter by model name(s). */
  models?: string[];

  /** Filter by provider name(s). */
  providers?: string[];
}

// ── Tracker Instance ─────────────────────────────────────────────────

interface CostTracker {
  /** Record a single cost entry manually. */
  record(input: RecordInput): void;

  /** Generate a chargeback report. */
  report(options?: ReportOptions): Promise<ChargebackReport>;

  /** Export cost data in the specified format. */
  export(format: ExportFormat, options?: ExportOptions): Promise<string>;

  /** Query raw cost records. */
  query(filters?: QueryFilters): Promise<CostRecord[]>;

  /** Flush buffered records to storage immediately. */
  flush(): Promise<void>;

  /** Purge records matching the given filters (for retention management). */
  purge(filters: QueryFilters): Promise<number>;

  /** Close the tracker, flushing remaining records and releasing resources. */
  close(): Promise<void>;

  /** Get the total number of records in storage. */
  count(filters?: QueryFilters): Promise<number>;
}

// ── Report Options ───────────────────────────────────────────────────

interface ReportOptions {
  /** Date range for the report. */
  from?: string; // ISO 8601
  to?: string;   // ISO 8601

  /** Group results by these dimensions.
   *  Example: ['team', 'project'] produces a report grouped by team, then project.
   *  Default: all tag keys present in the data. */
  groupBy?: string[];

  /** Filter to specific tag values before grouping.
   *  Example: { team: 'search' } produces a report only for the search team. */
  filter?: Tags;

  /** Filter to specific models. */
  models?: string[];

  /** Filter to specific providers. */
  providers?: string[];

  /** Include time series breakdown at this granularity.
   *  Default: undefined (no time series). */
  timeSeries?: 'day' | 'week' | 'month';

  /** Include per-model breakdown within each group. Default: true. */
  includeModelBreakdown?: boolean;

  /** Maximum number of groups to return (sorted by cost descending).
   *  Default: unlimited. */
  limit?: number;

  /** Sort order for groups. Default: 'cost-desc'. */
  sortBy?: 'cost-desc' | 'cost-asc' | 'name-asc' | 'name-desc' | 'calls-desc';
}

// ── Report Types ─────────────────────────────────────────────────────

interface ChargebackReport {
  /** Report metadata. */
  metadata: {
    /** ISO 8601 timestamp of when the report was generated. */
    generatedAt: string;

    /** The date range covered by this report. */
    from: string;
    to: string;

    /** The dimensions used for grouping. */
    groupBy: string[];

    /** Filters applied to the report. */
    filters: {
      tags?: Tags;
      models?: string[];
      providers?: string[];
    };

    /** Total number of cost records included. */
    totalRecords: number;
  };

  /** Overall totals for the report. */
  totals: CostTotals;

  /** Cost breakdown by group. */
  groups: CostBreakdown[];

  /** Time series data, if requested. */
  timeSeries?: TimeSeriesEntry[];
}

interface CostTotals {
  /** Total cost in USD. */
  cost: number;

  /** Total input tokens. */
  inputTokens: number;

  /** Total output tokens. */
  outputTokens: number;

  /** Total API calls. */
  calls: number;

  /** Cost breakdown by model. */
  byModel: Record<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    calls: number;
  }>;

  /** Cost breakdown by provider. */
  byProvider: Record<string, {
    cost: number;
    calls: number;
  }>;
}

interface CostBreakdown {
  /** The tag values that define this group.
   *  Example: { team: 'search', project: 'autocomplete' }. */
  group: Tags;

  /** Display name for this group (concatenation of tag values). */
  name: string;

  /** Total cost for this group. */
  cost: number;

  /** Percentage of overall cost. */
  percentage: number;

  /** Total input tokens for this group. */
  inputTokens: number;

  /** Total output tokens for this group. */
  outputTokens: number;

  /** Total API calls for this group. */
  calls: number;

  /** Per-model breakdown within this group (if includeModelBreakdown is true). */
  byModel?: Record<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    calls: number;
    percentage: number;
  }>;
}

interface TimeSeriesEntry {
  /** The start of this time period (ISO 8601). */
  period: string;

  /** Granularity label (e.g., '2026-03-01' for monthly, '2026-03-15' for daily). */
  label: string;

  /** Total cost in this period. */
  cost: number;

  /** Total API calls in this period. */
  calls: number;

  /** Total input tokens in this period. */
  inputTokens: number;

  /** Total output tokens in this period. */
  outputTokens: number;

  /** Per-group breakdown within this period.
   *  Only populated if groupBy is set in ReportOptions. */
  groups?: Array<{
    group: Tags;
    cost: number;
    calls: number;
  }>;
}

// ── Export ────────────────────────────────────────────────────────────

type ExportFormat = 'json' | 'csv' | 'markdown';

interface ExportOptions extends ReportOptions {
  /** For CSV: delimiter character. Default: ','. */
  csvDelimiter?: string;

  /** For CSV: whether to include a header row. Default: true. */
  csvHeader?: boolean;

  /** For Markdown: report title. Default: 'AI Cost Chargeback Report'. */
  markdownTitle?: string;
}
```

### Example: Basic Tagging and Reporting

```typescript
import OpenAI from 'openai';
import { tag, createTracker } from 'ai-chargeback';

// Create a tracker with file storage
const tracker = createTracker({
  storage: { type: 'file', path: './ai-costs.json' },
});

// Tag an OpenAI client
const openai = tag(new OpenAI(), {
  tags: { team: 'search', project: 'autocomplete' },
  tracker,
});

// Make tagged API calls
await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Suggest completions for: "how to"' }],
});

// Generate a report
const report = await tracker.report({
  groupBy: ['team', 'project'],
  from: '2026-03-01T00:00:00Z',
  to: '2026-03-31T23:59:59Z',
});

console.log(report.totals.cost);           // 0.000045
console.log(report.groups[0].name);         // 'search / autocomplete'
console.log(report.groups[0].cost);         // 0.000045
console.log(report.groups[0].percentage);   // 100

// Export as CSV
const csv = await tracker.export('csv', {
  groupBy: ['team'],
  from: '2026-03-01T00:00:00Z',
  to: '2026-03-31T23:59:59Z',
});
console.log(csv);
// team,cost,input_tokens,output_tokens,calls,percentage
// search,0.000045,45,12,1,100.00
```

### Example: Multi-Team Production Service

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { tag, runWithTags, createTracker } from 'ai-chargeback';

const tracker = createTracker({
  storage: { type: 'file', path: '/var/data/ai-costs.json' },
  requiredTagKeys: ['team', 'environment'],
  defaultTags: { environment: 'production' },
});

const openai = tag(new OpenAI(), { tracker });
const anthropic = tag(new Anthropic(), { tracker });

// Request handler that determines tags from the incoming request
async function handleRequest(req: Request) {
  const team = req.headers.get('x-team') ?? 'unknown';
  const feature = req.url.split('/')[2]; // e.g., /api/search -> 'search'

  await runWithTags({ team, feature }, async () => {
    // All AI calls within this context are tagged with team + feature
    if (feature === 'search') {
      await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: req.body.query }],
      });
    } else if (feature === 'summarize') {
      await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: req.body.text }],
      });
    }
  });
}

// Monthly chargeback report generation (run via cron)
async function generateMonthlyReport() {
  const report = await tracker.report({
    groupBy: ['team'],
    from: '2026-03-01T00:00:00Z',
    to: '2026-03-31T23:59:59Z',
    includeModelBreakdown: true,
    timeSeries: 'week',
  });

  const csv = await tracker.export('csv', {
    groupBy: ['team', 'feature'],
    from: '2026-03-01T00:00:00Z',
    to: '2026-03-31T23:59:59Z',
  });

  // Send to finance team
  await sendToFinanceSystem(csv);
}
```

### Example: Context-Level Tagging in Express Middleware

```typescript
import express from 'express';
import { runWithTags, tag, createTracker } from 'ai-chargeback';
import OpenAI from 'openai';

const tracker = createTracker({
  storage: { type: 'file', path: './costs.json' },
  requiredTagKeys: ['team'],
});

const openai = tag(new OpenAI(), { tracker });

// Middleware that sets cost center tags from request metadata
function chargebackMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tags = {
    team: req.headers['x-team'] as string ?? 'untagged',
    project: req.headers['x-project'] as string ?? 'default',
    environment: process.env.NODE_ENV ?? 'development',
  };

  runWithTags(tags, async () => {
    next();
  });
}

const app = express();
app.use(chargebackMiddleware);

app.post('/api/chat', async (req, res) => {
  // Tags are automatically applied from the middleware context
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: req.body.messages,
  });
  res.json(response);
});
```

---

## 8. Report Generation

### Grouping and Aggregation

Reports aggregate cost records by one or more tag dimensions. The `groupBy` parameter determines the grouping columns. Records are partitioned into groups where each group shares the same values for all `groupBy` keys. Within each group, costs, tokens, and call counts are summed.

**Single-dimension grouping** (`groupBy: ['team']`):

```
Team          Cost        Calls   Input Tok   Output Tok   %
──────────────────────────────────────────────────────────────
search        $4,200.00   28,400  12,500,000  3,200,000   42.0%
content       $3,100.00   15,200   8,900,000  2,100,000   31.0%
platform      $1,800.00   12,800   6,200,000  1,500,000   18.0%
ml-infra        $900.00    6,400   3,100,000    800,000    9.0%
──────────────────────────────────────────────────────────────
Total        $10,000.00   62,800  30,700,000  7,600,000  100.0%
```

**Multi-dimension grouping** (`groupBy: ['team', 'project']`):

```
Team / Project              Cost        Calls     %
───────────────────────────────────────────────────
search / autocomplete       $3,100.00   22,000   31.0%
search / ranking            $1,100.00    6,400   11.0%
content / cms               $2,400.00   10,800   24.0%
content / marketing         $700.00      4,400    7.0%
platform / internal-tools   $1,800.00   12,800   18.0%
ml-infra / training-eval    $900.00      6,400    9.0%
───────────────────────────────────────────────────
Total                      $10,000.00   62,800  100.0%
```

### Time-Based Reports

The `timeSeries` option adds a temporal dimension to the report. Supported granularities are `day`, `week`, and `month`. Each time period contains its own cost totals and, if grouping is set, per-group breakdowns within that period.

**Monthly time series** (`timeSeries: 'month'`):

```
Period       Cost        Calls   Input Tok     Output Tok
────────────────────────────────────────────────────────────
2026-01     $8,200.00   51,000   24,000,000    6,200,000
2026-02     $9,100.00   58,000   27,500,000    6,800,000
2026-03    $10,000.00   62,800   30,700,000    7,600,000
────────────────────────────────────────────────────────────
Total      $27,300.00  171,800   82,200,000   20,600,000
```

**Monthly time series with per-team grouping** (`timeSeries: 'month', groupBy: ['team']`):

```
Period       Team        Cost        Calls     %
────────────────────────────────────────────────
2026-01      search      $3,400.00   21,000   41.5%
2026-01      content     $2,600.00   12,800   31.7%
2026-01      platform    $1,500.00   10,200   18.3%
2026-01      ml-infra      $700.00    7,000    8.5%
────────────────────────────────────────────────
2026-02      search      $3,800.00   24,000   41.8%
...
```

### Per-Model Breakdown

When `includeModelBreakdown` is true (the default), each cost group includes a breakdown by model. This reveals which models each team or project is using and their relative cost contribution:

```
Team: search ($4,200.00)
  Model                           Cost        Calls     %
  ─────────────────────────────────────────────────────────
  gpt-4o                          $3,100.00   18,000   73.8%
  gpt-4o-mini                       $800.00    8,000   19.0%
  claude-haiku-3-20250307            $300.00    2,400    7.1%
```

### Filtering

Reports can be filtered before grouping, narrowing the data to specific teams, projects, models, or time ranges:

```typescript
// Report for only the search team
const report = await tracker.report({
  filter: { team: 'search' },
  groupBy: ['project', 'feature'],
  from: '2026-03-01T00:00:00Z',
  to: '2026-03-31T23:59:59Z',
});

// Report for only GPT-4o usage
const report = await tracker.report({
  models: ['gpt-4o'],
  groupBy: ['team'],
});
```

Filtering happens before aggregation. Only records matching all filter criteria are included in the report totals and group breakdowns.

### Untagged Costs

API calls made without tags (or with an incomplete tag set when `requiredTagKeys` is not configured) are recorded with whatever tags were present. When generating a report, records missing a `groupBy` key are grouped under the value `(untagged)`. This makes untagged costs visible in the report rather than silently excluding them:

```
Team          Cost        Calls     %
──────────────────────────────────────
search        $4,200.00   28,400   42.0%
content       $3,100.00   15,200   31.0%
(untagged)    $2,700.00   19,200   27.0%
──────────────────────────────────────
Total        $10,000.00   62,800  100.0%
```

---

## 9. Export Formats

### JSON

Machine-readable format for integration with dashboards, APIs, and downstream processing tools. The output is the `ChargebackReport` object serialized as JSON:

```json
{
  "metadata": {
    "generatedAt": "2026-03-31T12:00:00.000Z",
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-31T23:59:59.000Z",
    "groupBy": ["team"],
    "filters": {},
    "totalRecords": 62800
  },
  "totals": {
    "cost": 10000.00,
    "inputTokens": 30700000,
    "outputTokens": 7600000,
    "calls": 62800,
    "byModel": {
      "gpt-4o": { "cost": 7200.00, "inputTokens": 22000000, "outputTokens": 5500000, "calls": 42000 },
      "gpt-4o-mini": { "cost": 1800.00, "inputTokens": 6000000, "outputTokens": 1500000, "calls": 15000 },
      "claude-haiku-3-20250307": { "cost": 1000.00, "inputTokens": 2700000, "outputTokens": 600000, "calls": 5800 }
    },
    "byProvider": {
      "openai": { "cost": 9000.00, "calls": 57000 },
      "anthropic": { "cost": 1000.00, "calls": 5800 }
    }
  },
  "groups": [
    {
      "group": { "team": "search" },
      "name": "search",
      "cost": 4200.00,
      "percentage": 42.0,
      "inputTokens": 12500000,
      "outputTokens": 3200000,
      "calls": 28400
    }
  ]
}
```

### CSV

Tabular format for spreadsheet import, finance system integration, and data analysis tools. Each row represents one cost group:

```csv
team,cost,input_tokens,output_tokens,calls,percentage
search,4200.00,12500000,3200000,28400,42.00
content,3100.00,8900000,2100000,15200,31.00
platform,1800.00,6200000,1500000,12800,18.00
ml-infra,900.00,3100000,800000,6400,9.00
```

Multi-dimension grouping adds columns for each dimension:

```csv
team,project,cost,input_tokens,output_tokens,calls,percentage
search,autocomplete,3100.00,9200000,2400000,22000,31.00
search,ranking,1100.00,3300000,800000,6400,11.00
content,cms,2400.00,7100000,1600000,10800,24.00
```

### Markdown

Formatted Markdown tables suitable for Slack messages, GitHub issues, internal documentation, or wiki pages:

```markdown
# AI Cost Chargeback Report

**Period**: 2026-03-01 to 2026-03-31
**Total Cost**: $10,000.00 | **Total Calls**: 62,800

## Cost by Team

| Team | Cost | Calls | Input Tokens | Output Tokens | % |
|------|------|-------|-------------|--------------|---|
| search | $4,200.00 | 28,400 | 12,500,000 | 3,200,000 | 42.0% |
| content | $3,100.00 | 15,200 | 8,900,000 | 2,100,000 | 31.0% |
| platform | $1,800.00 | 12,800 | 6,200,000 | 1,500,000 | 18.0% |
| ml-infra | $900.00 | 6,400 | 3,100,000 | 800,000 | 9.0% |
| **Total** | **$10,000.00** | **62,800** | **30,700,000** | **7,600,000** | **100%** |

## Cost by Model

| Model | Cost | Calls | % |
|-------|------|-------|---|
| gpt-4o | $7,200.00 | 42,000 | 72.0% |
| gpt-4o-mini | $1,800.00 | 15,000 | 18.0% |
| claude-haiku-3-20250307 | $1,000.00 | 5,800 | 10.0% |
```

---

## 10. Storage

### In-Memory Storage

The default storage backend. Cost records are stored in a JavaScript array in process memory. All data is lost when the process exits. Suitable for development, testing, and short-lived scripts where persistence is not needed.

```typescript
const tracker = createTracker(); // in-memory by default
// or explicitly:
const tracker = createTracker({ storage: { type: 'memory' } });
```

**Characteristics:**
- Zero configuration.
- No I/O overhead.
- Data is lost on process restart.
- Memory usage grows linearly with record count. At ~500 bytes per record, 1 million records consume ~500MB.

### File-Based Storage

Stores cost records as a JSON file on disk. Suitable for single-server deployments, local development with persistent tracking, and small-to-medium-scale production use.

```typescript
const tracker = createTracker({
  storage: { type: 'file', path: './ai-costs.json' },
});
```

**File format:**

```json
{
  "version": 1,
  "records": [
    {
      "id": "rec_a1b2c3d4",
      "timestamp": "2026-03-15T14:30:00.000Z",
      "tags": { "team": "search", "project": "autocomplete" },
      "model": "gpt-4o",
      "provider": "openai",
      "inputTokens": 150,
      "outputTokens": 42,
      "totalTokens": 192,
      "cost": 0.000795
    }
  ]
}
```

**Characteristics:**
- Simple setup: one config parameter (file path).
- Data persists across process restarts.
- File is read on tracker creation and written on flush/close.
- Concurrent writes from multiple processes are not safe. Use a custom storage adapter for multi-process deployments.
- File size grows linearly with record count. At ~200 bytes per record (compressed JSON), 100,000 records produce a ~20MB file.

**File locking:** The file storage backend uses `fs.writeFile` with atomic rename (`write to temp file, then rename`) to prevent corruption from partial writes. It does not implement cross-process file locking. For multi-process safety, use a custom storage adapter backed by a database.

### Custom Storage Adapter

For production deployments that require database storage, cloud storage, or integration with existing data infrastructure, the `StorageAdapter` interface allows plugging in any backend:

```typescript
import { createTracker, StorageAdapter, CostRecord, QueryFilters } from 'ai-chargeback';

class PostgresAdapter implements StorageAdapter {
  constructor(private pool: Pool) {}

  async append(records: CostRecord[]): Promise<void> {
    const query = `
      INSERT INTO ai_cost_records (id, timestamp, tags, model, provider, input_tokens, output_tokens, total_tokens, cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    for (const record of records) {
      await this.pool.query(query, [
        record.id, record.timestamp, JSON.stringify(record.tags),
        record.model, record.provider, record.inputTokens,
        record.outputTokens, record.totalTokens, record.cost,
      ]);
    }
  }

  async query(filters: QueryFilters): Promise<CostRecord[]> {
    // Build and execute SQL query from filters
    // ...
  }

  async purge(filters: QueryFilters): Promise<number> {
    // Delete matching records, return count
    // ...
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

const tracker = createTracker({
  storage: { type: 'custom', adapter: new PostgresAdapter(pool) },
});
```

The `StorageAdapter` interface is minimal by design. It requires four methods: `append` (write records), `query` (read records with filters), `purge` (delete records for retention), and `close` (release resources). This interface is sufficient for any storage backend -- SQL databases, NoSQL databases, cloud object storage, message queues, or external APIs.

---

## 11. Configuration

### All Options with Defaults

```typescript
const defaults: ChargebackConfig = {
  storage: { type: 'memory' },       // In-memory storage
  pricing: {},                        // No custom pricing (uses built-in table)
  buffer: {
    maxRecords: 100,                  // Flush after 100 buffered records
    maxIntervalMs: 5_000,             // Flush every 5 seconds
  },
  defaultTags: {},                    // No default tags
  allowedTagKeys: 'any',             // Accept any tag keys
  requiredTagKeys: [],                // No required tags
};
```

### Environment Variables

| Variable | Purpose | Values |
|----------|---------|--------|
| `AI_CHARGEBACK_STORAGE_PATH` | Override file storage path | File path (e.g., `./costs.json`) |
| `AI_CHARGEBACK_DEFAULT_TEAM` | Set default `team` tag | Team name |
| `AI_CHARGEBACK_DEFAULT_ENV` | Set default `environment` tag | Environment name |
| `AI_CHARGEBACK_BUFFER_SIZE` | Override buffer max records | Integer (e.g., `200`) |
| `AI_CHARGEBACK_BUFFER_INTERVAL` | Override buffer flush interval | Milliseconds (e.g., `10000`) |

Environment variables override programmatic configuration. This enables deployment-specific overrides without changing application code.

### Configuration Resolution Order

1. **Built-in defaults** (lowest priority).
2. **Programmatic configuration** passed to `createTracker()`.
3. **Environment variables** (highest priority).

---

## 12. CLI

### Installation and Invocation

```bash
# Global install
npm install -g ai-chargeback
ai-chargeback report --storage ./ai-costs.json --group-by team

# npx (no install)
npx ai-chargeback report --storage ./ai-costs.json --group-by team,project

# Package script
# package.json: { "scripts": { "chargeback": "ai-chargeback report --storage ./ai-costs.json" } }
npm run chargeback
```

### CLI Binary Name

`ai-chargeback`

### Commands

```
ai-chargeback <command> [options]

Commands:
  report        Generate a chargeback report from stored cost data.
  export        Export cost data to a file in the specified format.
  summary       Print a quick cost summary (total cost, total calls, top groups).
  records       List raw cost records (for debugging and auditing).
  purge         Delete cost records matching the given filters.

Global options:
  --storage <path>         Path to the cost data file. Required for all commands.
  --version                Print version and exit.
  --help                   Print help and exit.
```

### `report` Command

```
ai-chargeback report [options]

Options:
  --storage <path>         Path to the cost data file. Required.
  --group-by <keys>        Comma-separated tag keys to group by (e.g., team,project).
                           Default: all tag keys present in the data.
  --from <date>            Start date (ISO 8601 or YYYY-MM-DD). Default: no lower bound.
  --to <date>              End date (ISO 8601 or YYYY-MM-DD). Default: no upper bound.
  --filter <key=value>     Filter by tag value (repeatable).
                           Example: --filter team=search --filter environment=production
  --model <name>           Filter by model name (repeatable).
  --time-series <gran>     Add time series breakdown. Values: day, week, month.
  --format <format>        Output format. Values: table, json, csv, markdown. Default: table.
  --output <path>          Write report to file instead of stdout.
  --no-model-breakdown     Omit per-model breakdown within groups.
  --limit <n>              Show only top N groups by cost.
  --sort <order>           Sort order. Values: cost-desc, cost-asc, name-asc, calls-desc.
                           Default: cost-desc.
```

### `export` Command

```
ai-chargeback export [options]

Options:
  --storage <path>         Path to the cost data file. Required.
  --format <format>        Export format. Values: json, csv, markdown. Required.
  --output <path>          Output file path. Required.
  --group-by <keys>        Comma-separated tag keys to group by.
  --from <date>            Start date.
  --to <date>              End date.
  --filter <key=value>     Filter by tag value (repeatable).
```

### `summary` Command

```
ai-chargeback summary [options]

Options:
  --storage <path>         Path to the cost data file. Required.
  --from <date>            Start date.
  --to <date>              End date.
```

Prints a concise summary:

```
AI Chargeback Summary
═══════════════════════════════════
  Period:        2026-03-01 to 2026-03-31
  Total cost:    $10,000.00
  Total calls:   62,800
  Total tokens:  38,300,000 (30.7M in / 7.6M out)
  Top team:      search ($4,200.00, 42.0%)
  Top model:     gpt-4o ($7,200.00, 72.0%)
  Top feature:   autocomplete ($3,100.00, 31.0%)
```

### `purge` Command

```
ai-chargeback purge [options]

Options:
  --storage <path>         Path to the cost data file. Required.
  --before <date>          Delete records before this date. Required.
  --filter <key=value>     Only delete records matching these tags (repeatable).
  --dry-run                Print how many records would be deleted without deleting.
  --confirm                Skip the confirmation prompt.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. Report generated, export written, or purge completed. |
| `1` | Error. Storage file not found, invalid arguments, or I/O failure. |
| `2` | Configuration error. Missing required flags or invalid flag values. |

### Human-Readable Report Output Example

```
$ ai-chargeback report --storage ./ai-costs.json --group-by team --from 2026-03-01 --to 2026-03-31

  ai-chargeback v0.1.0

  Period: 2026-03-01 to 2026-03-31
  Records: 62,800

  Cost by team
  ──────────────────────────────────────────────────────────────────────
  Team          Cost          Calls    Input Tok    Output Tok      %
  ──────────────────────────────────────────────────────────────────────
  search        $4,200.00    28,400   12,500,000    3,200,000   42.0%
    gpt-4o      $3,100.00    18,000                             73.8%
    gpt-4o-mini   $800.00     8,000                             19.0%
    claude-hai    $300.00     2,400                              7.1%
  content       $3,100.00    15,200    8,900,000    2,100,000   31.0%
    gpt-4o      $2,800.00    13,000                             90.3%
    gpt-4o-mini   $300.00     2,200                              9.7%
  platform      $1,800.00    12,800    6,200,000    1,500,000   18.0%
  ml-infra        $900.00     6,400    3,100,000      800,000    9.0%
  ──────────────────────────────────────────────────────────────────────
  Total        $10,000.00    62,800   30,700,000    7,600,000  100.0%
```

---

## 13. Integration with the npm-master Ecosystem

### model-price-registry

`model-price-registry` provides an auto-updating registry of LLM pricing across providers. When installed as a peer dependency, `ai-chargeback` uses it as a fallback pricing source for models not in the built-in table:

```typescript
import { getPrice } from 'model-price-registry';

// Internal: ai-chargeback checks built-in table first,
// falls back to model-price-registry
const price = builtInPrices[model] ?? getPrice(model) ?? { input: 0, output: 0 };
```

This ensures that new models (released after the last `ai-chargeback` update) have accurate pricing without requiring a package update.

### token-fence

`token-fence` enforces token budgets by truncating or rejecting requests. `ai-chargeback` complements `token-fence` by providing the cost data that informs budget decisions. A typical workflow:

1. Use `ai-chargeback` to track costs per team for a month.
2. Review the chargeback report and identify teams with high spend.
3. Configure `token-fence` with per-team token budgets informed by the chargeback data.
4. Continue tracking with `ai-chargeback` to verify that budgets are having the desired effect.

The two packages can share the same `tag()` wrapping layer: `tag(fence(client, budgetConfig), chargebackConfig)` applies both budget enforcement and cost tracking to the same client.

### ai-circuit-breaker

`ai-circuit-breaker` trips a circuit when error rates or aggregate costs exceed thresholds. `ai-chargeback` provides the historical cost data that informs circuit breaker thresholds. If the chargeback report shows that a feature typically costs $100/day, the circuit breaker can be configured to trip at $150/day (50% overage). Without chargeback data, circuit breaker thresholds are guesses.

### llm-cost-per-test

`llm-cost-per-test` tracks per-test-case costs in CI. `ai-chargeback` tracks per-team/project costs in production. They operate in different environments and have different lifecycles, but produce complementary data. A team can use `llm-cost-per-test` to understand eval suite costs during development and `ai-chargeback` to understand production costs after deployment.

### tool-cost-estimator

`tool-cost-estimator` estimates the cost of MCP tool calls before execution. `ai-chargeback` records actual costs after execution. Estimates from `tool-cost-estimator` can be compared against actual costs from `ai-chargeback` to validate estimation accuracy.

---

## 14. Testing Strategy

### Unit Tests

**Tag merge tests:**
- Client-level tags only: cost record contains client tags.
- Context-level tags only: cost record contains context tags.
- Request-level tags only: cost record contains request tags.
- All three levels: correct precedence applied (request > context > client).
- Overlapping keys: highest-precedence value wins.
- Default tags: applied when no other source provides the key.
- Empty tags: valid, recorded as empty tag set.

**Tag validation tests:**
- Valid tag key formats: alphanumeric, underscores, dots, hyphens.
- Invalid tag key: empty string, starts with number, special characters, reserved prefix `_cb_`.
- Invalid tag value: empty string, exceeds 256 characters.
- Too many tags: exceeds 20 key-value pairs.
- Required tag keys: record rejected when required key is missing.
- Allowed tag keys: record rejected when key is not in allowed list.

**Cost computation tests:**
- OpenAI usage format: correct cost from `prompt_tokens` and `completion_tokens`.
- Anthropic usage format: correct cost from `input_tokens` and `output_tokens`.
- Known model pricing: GPT-4o, Claude Sonnet, Gemini Flash all produce correct costs.
- Unknown model: cost is 0.00 with a warning.
- Custom pricing: overrides built-in pricing.
- Dated model names: `gpt-4o-2024-08-06` matches `gpt-4o` pricing.
- Zero tokens: cost is 0.00.
- Explicit cost override: `cost` field in `RecordInput` bypasses computation.

**CostTracker tests:**
- `record()`: appends a cost record with correct id, timestamp, and computed cost.
- `query()` with no filters: returns all records.
- `query()` with tag filter: returns only matching records.
- `query()` with date range: returns only records within range.
- `query()` with model filter: returns only records for specified models.
- `count()`: returns correct record count with and without filters.
- `flush()`: writes buffered records to storage.
- `close()`: flushes and releases resources.
- `purge()`: deletes matching records, returns count.

**Report generation tests:**
- Single-dimension groupBy: correct group names, costs, percentages.
- Multi-dimension groupBy: correct cross-tabulation.
- Per-model breakdown within groups: correct model-level aggregation.
- Time series (day, week, month): correct period boundaries and aggregation.
- Filtering before grouping: only matching records included.
- Untagged records: grouped under `(untagged)`.
- Empty data set: report with zero totals and empty groups array.
- Sorting: groups ordered by cost-desc (default), cost-asc, name-asc, calls-desc.
- Limit: only top N groups returned.

**Export format tests:**
- JSON export: produces valid JSON matching `ChargebackReport` schema.
- CSV export: correct headers, delimiter, escaping of values with commas/quotes.
- Markdown export: valid Markdown with tables and correct formatting.
- Custom CSV delimiter: uses specified delimiter.
- CSV without header: omits header row.

**Storage backend tests:**
- In-memory: append, query, purge, close all work correctly.
- File-based: records written to disk, readable after tracker restart.
- File-based: atomic write (no corruption on partial write).
- Custom adapter: interface methods called with correct arguments.
- Buffer: records accumulated until maxRecords threshold.
- Buffer: records flushed on maxIntervalMs timeout.
- Buffer: flush() forces immediate write.

**AsyncLocalStorage context tests:**
- Two concurrent async operations: each records to its own tag set.
- Nested contexts: inner context overrides outer context for overlapping keys.
- No active context: tags from client-level only.
- Context isolation: one request's tags do not leak to another.

**CLI parsing tests:**
- All flags parsed correctly.
- Missing required flags: error with clear message.
- Invalid date format: error with clear message.
- `--filter` flag parsed as key=value pairs.
- `--group-by` flag parsed as comma-separated list.
- Environment variable fallbacks.

### Integration Tests

- **SDK wrapping end-to-end**: Wrap an OpenAI client, make a call to a mock HTTP server that returns a realistic response with usage data, verify the cost record is stored with correct tags, tokens, and cost.
- **Anthropic SDK end-to-end**: Same as above with Anthropic client and response format.
- **Streaming response**: Wrap a client, make a streaming call to a mock server, verify usage is captured from the stream completion event.
- **Context tagging end-to-end**: Set up `runWithTags`, make API calls within the context, verify records have context-level tags.
- **Multi-level tag merge**: Set client tags, context tags, and request tags, make a call, verify the merged tag set.
- **Report round-trip**: Record 100 cost entries with various tags, generate a report grouped by team, verify correct totals and percentages.
- **File storage round-trip**: Create a tracker with file storage, record entries, close the tracker, create a new tracker with the same file, verify all records are present.
- **CLI report end-to-end**: Create a cost data file, run the CLI `report` command, verify output format and content.
- **CLI export end-to-end**: Run the CLI `export` command with CSV format, verify the output file contains correct data.

### Edge Cases

- Cost record with no tags: recorded with empty tag set, appears as `(untagged)` in reports.
- Tag key with maximum allowed length: accepted.
- Tag value with exactly 256 characters: accepted.
- 20 tag key-value pairs: accepted. 21 pairs: rejected.
- Report with `groupBy` key that no records have: all records grouped under `(untagged)`.
- Report with date range that includes no records: empty report with zero totals.
- File storage with empty file: tracker starts with zero records.
- File storage path that does not exist: file created on first flush.
- File storage path in a directory that does not exist: error with clear message.
- Concurrent `record()` calls from multiple async operations: all records captured without data loss.
- `close()` called twice: second call is a no-op.
- `record()` called after `close()`: throws an error.

### Test Framework

Tests use Vitest, matching the project's existing `vitest run` configuration in `package.json`. Integration tests that simulate AI API responses use a local HTTP server (`node:http`) that returns canned responses with realistic `usage` fields.

---

## 15. Performance Considerations

### Recording Overhead

The performance overhead of cost recording is negligible relative to AI API call latency:

| Operation | Overhead |
|-----------|----------|
| `AsyncLocalStorage.getStore()` per intercepted call | < 0.01ms |
| Tag merge (3 levels, 10 keys total) | < 0.01ms |
| Cost computation (pricing lookup + arithmetic) | < 0.01ms |
| `CostRecord` creation (object allocation, ID generation) | < 0.05ms |
| Buffer append (in-memory array push) | < 0.01ms |

Total per-call overhead is under 0.1ms, which is negligible compared to typical AI API call latency of 100-5000ms.

### Storage Performance

| Backend | Append (per record) | Query (10,000 records) | Report Generation (10,000 records, 3 group dimensions) |
|---------|--------------------|-----------------------|-------------------------------------------------------|
| In-memory | < 0.01ms | < 10ms | < 50ms |
| File-based | < 1ms (buffered) | < 100ms | < 200ms |
| Custom (database) | Depends on DB | Depends on DB | Depends on DB |

File-based storage reads the entire file into memory on tracker creation. For files with 100,000+ records, this may take 1-2 seconds. For large-scale production use, a custom database adapter is recommended.

### Memory Usage

Each `CostRecord` in memory is approximately 500 bytes (including tag strings and metadata). Memory usage:

| Record Count | Memory |
|-------------|--------|
| 10,000 | ~5 MB |
| 100,000 | ~50 MB |
| 1,000,000 | ~500 MB |

For long-running production services, use the `purge()` method or a custom storage adapter with server-side aggregation to manage memory and storage growth.

### Buffer Tuning

The write buffer trades latency for throughput:

- **Small buffer** (`maxRecords: 10, maxIntervalMs: 1000`): Low latency, more I/O operations. Suitable for development and low-volume production.
- **Large buffer** (`maxRecords: 1000, maxIntervalMs: 30000`): Higher latency, fewer I/O operations. Suitable for high-volume production where flushing overhead matters.
- **No buffer** (`maxRecords: 1, maxIntervalMs: 0`): Every record is written immediately. Maximum durability, maximum I/O overhead. Suitable only for very low-volume use cases.

If the process crashes before a flush, buffered records are lost. For maximum durability, set `maxRecords: 1` or call `tracker.flush()` after critical cost records.

---

## 16. Dependencies

### Runtime Dependencies

None. `ai-chargeback` uses only Node.js built-in APIs:

| API | Purpose |
|-----|---------|
| `node:async_hooks` (`AsyncLocalStorage`) | Context-level tag propagation across async calls |
| `node:fs/promises` | File-based storage read/write |
| `node:path` | File path construction |
| `node:crypto` (`randomUUID`) | Cost record ID generation |

### Peer Dependencies (Optional)

| Package | Version | Purpose | When Required |
|---------|---------|---------|---------------|
| `model-price-registry` | `^0.1.0` | Fallback pricing for unknown models | When a model is not in the built-in pricing table |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler |
| `vitest` | Test runner |
| `eslint` | Linter |
| `openai` | Used in integration tests for OpenAI SDK interception testing |
| `@anthropic-ai/sdk` | Used in integration tests for Anthropic SDK interception testing |

### Compatibility

- Node.js >= 18 (requires `AsyncLocalStorage`, `crypto.randomUUID`, ES2022).
- TypeScript >= 5.0.
- Compatible with OpenAI SDK >= 4.0 and Anthropic SDK >= 0.20.0 for automatic interception.
- Any other AI SDK can be used with manual recording via `tracker.record()`.

---

## 17. Error Handling

### Error Types

| Error | When | Behavior |
|-------|------|----------|
| `ChargebackValidationError` | Invalid tag key/value, too many tags, missing required tag, disallowed tag key | Thrown synchronously from `record()` or the SDK proxy. The API call still executes (the error is from the chargeback layer, not the AI API). |
| `ChargebackStorageError` | File I/O failure, custom adapter throws | Thrown from `flush()`, `query()`, `report()`, `export()`, `purge()`, or `close()`. Buffered records are retained in memory for retry. |
| `ChargebackConfigError` | Invalid configuration (e.g., non-existent storage path directory, invalid buffer values) | Thrown synchronously from `createTracker()`. |

### Error Philosophy

`ai-chargeback` follows a "fail loud for configuration, fail soft for recording" philosophy:

- **Configuration errors** (invalid config, missing storage directory) throw immediately. Bad configuration should be caught at startup, not after hours of production traffic.
- **Tag validation errors** throw immediately. Silent tag corruption would undermine cost attribution reliability. Developers must fix tagging issues when they occur.
- **Storage write failures** in the automatic SDK proxy do not throw to the caller. The AI API call succeeds, and the cost recording failure is logged via `console.warn`. This prevents chargeback infrastructure from breaking application functionality. The failed record is retained in the buffer for the next flush attempt.
- **Storage read failures** (in `query()`, `report()`, `export()`) throw to the caller, since these are explicit operations where the caller expects data.

### `tag()` Proxy Error Isolation

The SDK proxy created by `tag()` never causes an AI API call to fail. If cost recording fails (storage error, unexpected response format, missing usage data), the original API response is returned to the caller unchanged, and a warning is emitted. The proxy catches all internal errors in a `try/catch` around the recording logic:

```typescript
// Internal behavior of the tag() proxy:
try {
  const response = await originalMethod(...args);
  try {
    recordCost(response, mergedTags); // may fail
  } catch (recordError) {
    console.warn(`[ai-chargeback] Failed to record cost: ${recordError.message}`);
    // Swallow the error -- do not break the caller
  }
  return response;
} catch (apiError) {
  throw apiError; // API errors propagate normally
}
```

---

## 18. File Structure

```
ai-chargeback/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                    Main entry point. Exports tag, runWithTags,
                                getCurrentTags, createTracker, and all types.
    types.ts                    All TypeScript interfaces and type definitions:
                                Tags, CostRecord, RecordInput, ChargebackConfig,
                                TaggedClientOptions, ReportOptions, ChargebackReport,
                                CostBreakdown, CostTotals, TimeSeriesEntry,
                                StorageAdapter, StorageConfig, ExportFormat,
                                ExportOptions, ModelPricing, QueryFilters.
    tracker.ts                  CostTracker class. Record buffering, flush
                                scheduling, report generation orchestration,
                                export formatting delegation, query execution.
                                createTracker() factory function.
    tagging/
      tag.ts                    tag() function. Proxy-based SDK wrapping for
                                OpenAI and Anthropic clients. Method interception,
                                usage extraction, tag merge with context and
                                request-level overrides.
      context.ts                AsyncLocalStorage setup. runWithTags(),
                                getCurrentTags(), getContextTags() (internal).
      merge.ts                  Tag merge logic. Three-level precedence merge.
                                Tag validation (key format, value length, count,
                                reserved prefixes, allowed keys, required keys).
    pricing.ts                  Built-in model pricing table. Price lookup by
                                model name with prefix matching. Custom pricing
                                merge. model-price-registry fallback.
    storage/
      memory.ts                 In-memory storage adapter. Array-based storage
                                with filter-based query and purge.
      file.ts                   File-based storage adapter. JSON file read/write
                                with atomic rename. Buffer-aware flushing.
      types.ts                  StorageAdapter interface re-export (for custom
                                adapter implementors who import from subpath).
    report/
      generator.ts              Report generation logic. Groups records by
                                dimensions, computes aggregates, percentages,
                                per-model breakdowns, time series bucketing.
      aggregator.ts             Aggregation functions. Sum costs, tokens, calls
                                by group. Compute percentages. Sort and limit.
    export/
      json.ts                   JSON export formatter. Serializes ChargebackReport.
      csv.ts                    CSV export formatter. Header generation, value
                                escaping, delimiter configuration.
      markdown.ts               Markdown export formatter. Table generation,
                                summary sections, title configuration.
    cli.ts                      CLI entry point. Argument parsing (util.parseArgs),
                                command dispatch, output formatting, exit codes.
  src/__tests__/
    tag.test.ts                 SDK wrapping and tag application tests.
    context.test.ts             AsyncLocalStorage context tests.
    merge.test.ts               Tag merge and validation tests.
    tracker.test.ts             CostTracker unit tests.
    pricing.test.ts             Price lookup and calculation tests.
    storage/
      memory.test.ts            In-memory storage adapter tests.
      file.test.ts              File-based storage adapter tests.
    report/
      generator.test.ts         Report generation tests.
      aggregator.test.ts        Aggregation function tests.
    export/
      json.test.ts              JSON export tests.
      csv.test.ts               CSV export tests.
      markdown.test.ts          Markdown export tests.
    cli.test.ts                 CLI argument parsing and command tests.
    integration.test.ts         End-to-end tests with mock HTTP server.
```

The `src/index.ts` exports:

```typescript
// Tagging
export { tag } from './tagging/tag';
export { runWithTags, getCurrentTags } from './tagging/context';

// Tracker
export { createTracker } from './tracker';

// Types
export type {
  Tags,
  CostRecord,
  RecordInput,
  ChargebackConfig,
  TaggedClientOptions,
  ReportOptions,
  ChargebackReport,
  CostBreakdown,
  CostTotals,
  TimeSeriesEntry,
  StorageAdapter,
  StorageConfig,
  QueryFilters,
  ExportFormat,
  ExportOptions,
  ModelPricing,
} from './types';
```

---

## 19. Implementation Roadmap

### Phase 1: Core Infrastructure (v0.1.0)

Deliver the foundational types, pricing, storage, and manual recording capability.

**Order of implementation:**

1. **Types** (`types.ts`): Define all public types -- `Tags`, `CostRecord`, `RecordInput`, `ChargebackConfig`, `StorageAdapter`, `QueryFilters`, `ReportOptions`, `ChargebackReport`, `CostBreakdown`, `CostTotals`.
2. **Pricing** (`pricing.ts`): Built-in model pricing table. `getPrice(model)` function with prefix matching. Custom pricing merge.
3. **In-memory storage** (`storage/memory.ts`): `MemoryStorageAdapter` implementing `StorageAdapter`. Array-based storage with filter-based query.
4. **Tracker** (`tracker.ts`): `CostTracker` class with `record()`, `query()`, `flush()`, `close()`, `count()`, `purge()`. Write buffering. `createTracker()` factory.
5. **Tag validation** (`tagging/merge.ts`): Tag key/value validation. Required and allowed key enforcement.
6. **Entry point** (`index.ts`): Public exports.

### Phase 2: SDK Tagging and Context (v0.2.0)

Add the `tag()` middleware and `AsyncLocalStorage` context support.

1. **Context** (`tagging/context.ts`): `AsyncLocalStorage<Tags>` singleton. `runWithTags()`, `getCurrentTags()`.
2. **Tag merge** (`tagging/merge.ts`): Three-level precedence merge logic.
3. **SDK wrapping** (`tagging/tag.ts`): `tag()` function with Proxy-based wrapping for OpenAI client. Non-streaming first. Usage extraction from responses.
4. **Anthropic support**: Proxy wrapping for Anthropic `messages.create`.
5. **Streaming support**: Intercept streaming responses for both OpenAI and Anthropic.

### Phase 3: Report Generation (v0.3.0)

Add report generation with grouping, aggregation, and time series.

1. **Aggregator** (`report/aggregator.ts`): Group-by logic, sum aggregation, percentage computation, sorting, limiting.
2. **Report generator** (`report/generator.ts`): Orchestrate query, aggregation, model breakdown, time series bucketing. Produce `ChargebackReport`.
3. **`tracker.report()`**: Wire report generation into the tracker.

### Phase 4: Export Formats and File Storage (v0.4.0)

Add export formats and persistent storage.

1. **JSON export** (`export/json.ts`): Serialize `ChargebackReport` to JSON.
2. **CSV export** (`export/csv.ts`): Header generation, value escaping, delimiter support.
3. **Markdown export** (`export/markdown.ts`): Table generation, summary sections.
4. **File storage** (`storage/file.ts`): JSON file read/write with atomic rename.
5. **`tracker.export()`**: Wire export into the tracker.

### Phase 5: CLI (v0.5.0)

Add the command-line interface.

1. **CLI** (`cli.ts`): Argument parsing with `util.parseArgs`. Command dispatch for `report`, `export`, `summary`, `records`, `purge`.
2. **Human-readable table output**: Terminal table formatter for the `report` command.
3. **`bin` field** in `package.json`: Register `ai-chargeback` binary.

### Phase 6: Testing and Documentation (v1.0.0)

Production-ready release with comprehensive tests and documentation.

1. Unit tests for all modules as described in section 14.
2. Integration tests with mock HTTP server.
3. README with quick start, configuration guide, API reference, and examples.
4. JSDoc comments on all public exports.

---

## 20. Example Use Cases

### Example 1: Monthly Team Chargeback

A platform team manages a shared OpenAI account used by four engineering teams. Each month, they generate a chargeback report and send it to finance for internal billing.

```typescript
import OpenAI from 'openai';
import { tag, createTracker } from 'ai-chargeback';

const tracker = createTracker({
  storage: { type: 'file', path: '/var/data/ai-chargeback.json' },
  requiredTagKeys: ['team', 'environment'],
  defaultTags: { environment: 'production' },
});

// Each team's service wraps its client with its team tag
// Search team's service:
const searchClient = tag(new OpenAI(), {
  tags: { team: 'search', project: 'autocomplete' },
  tracker,
});

// Content team's service:
const contentClient = tag(new OpenAI(), {
  tags: { team: 'content', project: 'cms' },
  tracker,
});

// Monthly cron job generates the chargeback report
async function monthlyChargeback() {
  const lastMonth = getLastMonthRange(); // { from: '2026-02-01', to: '2026-02-28' }

  const csv = await tracker.export('csv', {
    groupBy: ['team'],
    from: lastMonth.from,
    to: lastMonth.to,
  });

  await fs.writeFile('/reports/chargeback-2026-02.csv', csv);
  await sendToFinance('/reports/chargeback-2026-02.csv');
}
```

The finance team receives:
```csv
team,cost,input_tokens,output_tokens,calls,percentage
search,4200.00,12500000,3200000,28400,42.00
content,3100.00,8900000,2100000,15200,31.00
platform,1800.00,6200000,1500000,12800,18.00
ml-infra,900.00,3100000,800000,6400,9.00
```

### Example 2: Feature-Level Unit Economics

A product team wants to understand the per-query cost of their AI search feature compared to their AI summarization feature, to make pricing decisions.

```typescript
import { tag, runWithTags, createTracker } from 'ai-chargeback';
import OpenAI from 'openai';

const tracker = createTracker({
  storage: { type: 'file', path: './costs.json' },
});

const openai = tag(new OpenAI(), {
  tags: { team: 'search' },
  tracker,
});

app.post('/api/search', async (req, res) => {
  await runWithTags({ feature: 'search', project: 'discovery' }, async () => {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: req.body.query }],
    });
    res.json(result);
  });
});

app.post('/api/summarize', async (req, res) => {
  await runWithTags({ feature: 'summarize', project: 'discovery' }, async () => {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: `Summarize: ${req.body.text}` }],
    });
    res.json(result);
  });
});

// After a week of traffic, generate a per-feature report
const report = await tracker.report({
  groupBy: ['feature'],
  filter: { team: 'search' },
  from: '2026-03-01T00:00:00Z',
  to: '2026-03-07T23:59:59Z',
  includeModelBreakdown: true,
});

// report.groups:
// [
//   { group: { feature: 'search' }, cost: 120.00, calls: 80000, ... },
//   { group: { feature: 'summarize' }, cost: 450.00, calls: 5000, ... },
// ]
// Per-query cost: search = $120/80,000 = $0.0015/query
//                 summarize = $450/5,000 = $0.09/query
```

### Example 3: Multi-Environment Cost Comparison

A team wants to compare AI costs across production, staging, and CI environments to identify opportunities for cheaper models in non-production environments.

```typescript
const report = await tracker.report({
  groupBy: ['environment', 'model'],
  from: '2026-03-01T00:00:00Z',
  to: '2026-03-31T23:59:59Z',
});

// Reveals that staging uses the same expensive models as production:
// production / gpt-4o:     $4,200.00  42,000 calls
// staging / gpt-4o:        $800.00     8,000 calls  <-- could use gpt-4o-mini
// ci / gpt-4o:             $200.00     2,000 calls  <-- could use gpt-4o-mini
// production / gpt-4o-mini: $600.00   40,000 calls
```

### Example 4: Cost Trend Analysis

A manager wants to see how their team's AI spend has changed over the last quarter.

```bash
$ ai-chargeback report \
    --storage /var/data/ai-chargeback.json \
    --group-by team \
    --filter team=search \
    --from 2026-01-01 \
    --to 2026-03-31 \
    --time-series month

  ai-chargeback v0.1.0

  Period: 2026-01-01 to 2026-03-31
  Filter: team=search

  Monthly Cost Trend
  ──────────────────────────────────────────────────
  Period       Cost          Calls    Change
  ──────────────────────────────────────────────────
  2026-01      $3,400.00    21,000    --
  2026-02      $3,800.00    24,000    +11.8%
  2026-03      $4,200.00    28,400    +10.5%
  ──────────────────────────────────────────────────
  Total       $11,400.00    73,400
```

### Example 5: Custom Storage with Database

A platform team uses PostgreSQL to store cost records for long-term retention, complex querying, and multi-server aggregation.

```typescript
import { createTracker, StorageAdapter, CostRecord, QueryFilters } from 'ai-chargeback';
import { Pool } from 'pg';

class PostgresAdapter implements StorageAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async append(records: CostRecord[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        await client.query(
          `INSERT INTO ai_costs (id, timestamp, tags, model, provider, input_tokens, output_tokens, total_tokens, cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [r.id, r.timestamp, JSON.stringify(r.tags), r.model, r.provider,
           r.inputTokens, r.outputTokens, r.totalTokens, r.cost],
        );
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  async query(filters: QueryFilters): Promise<CostRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.from) {
      conditions.push(`timestamp >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`timestamp <= $${idx++}`);
      params.push(filters.to);
    }
    if (filters.tags) {
      for (const [key, value] of Object.entries(filters.tags)) {
        conditions.push(`tags->>$${idx++} = $${idx++}`);
        params.push(key, value);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(`SELECT * FROM ai_costs ${where} ORDER BY timestamp`, params);
    return result.rows.map(this.rowToRecord);
  }

  async purge(filters: QueryFilters): Promise<number> {
    // Similar to query but with DELETE
    // ...
    return 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private rowToRecord(row: any): CostRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      tags: row.tags,
      model: row.model,
      provider: row.provider,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      cost: row.cost,
    };
  }
}

const tracker = createTracker({
  storage: {
    type: 'custom',
    adapter: new PostgresAdapter(process.env.DATABASE_URL!),
  },
  requiredTagKeys: ['team', 'environment'],
});
```

### Example 6: Showback Dashboard Integration

A team exports chargeback data as JSON and feeds it into a Grafana dashboard for real-time cost visibility.

```typescript
import { createTracker } from 'ai-chargeback';
import express from 'express';

const tracker = createTracker({
  storage: { type: 'file', path: '/var/data/ai-costs.json' },
});

const dashboardApp = express();

// Grafana JSON API data source endpoint
dashboardApp.post('/api/cost-data', async (req, res) => {
  const { from, to, groupBy } = req.body;

  const report = await tracker.report({
    groupBy: groupBy ?? ['team'],
    from,
    to,
    timeSeries: 'day',
    includeModelBreakdown: true,
  });

  res.json(report);
});

dashboardApp.listen(9090);
```
