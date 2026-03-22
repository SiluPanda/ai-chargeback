"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTracker = createTracker;
const node_crypto_1 = require("node:crypto");
const errors_1 = require("./errors");
const memory_1 = require("./storage/memory");
const pricing_1 = require("./pricing");
const validation_1 = require("./validation");
function inferProvider(model) {
    if (/^(gpt-|o1|o3|o4)/.test(model))
        return 'openai';
    if (/^claude-/.test(model))
        return 'anthropic';
    if (/^gemini-/.test(model))
        return 'google';
    return 'unknown';
}
function createTracker(config) {
    const storage = config?.storage?.type === 'custom' ? config.storage.adapter
        : new memory_1.MemoryStorageAdapter();
    const customPricing = config?.pricing ?? {};
    const defaultTags = config?.defaultTags ?? {};
    const allowedTagKeys = config?.allowedTagKeys ?? 'any';
    const requiredTagKeys = config?.requiredTagKeys ?? [];
    const maxRecords = config?.buffer?.maxRecords ?? 100;
    const maxIntervalMs = config?.buffer?.maxIntervalMs ?? 5000;
    let buffer = [];
    let closed = false;
    let flushTimer = null;
    // Start flush interval
    if (maxIntervalMs > 0) {
        flushTimer = setInterval(() => { flushBuffer().catch(() => { }); }, maxIntervalMs);
        if (flushTimer.unref)
            flushTimer.unref();
    }
    async function flushBuffer() {
        if (buffer.length === 0)
            return;
        const toFlush = buffer;
        buffer = [];
        await storage.append(toFlush);
    }
    const tracker = {
        async record(input) {
            if (closed)
                throw new errors_1.ChargebackConfigError('Tracker is closed');
            if (input.inputTokens < 0 || input.outputTokens < 0) {
                throw new errors_1.ChargebackValidationError('Token counts must not be negative');
            }
            const mergedTags = { ...defaultTags, ...input.tags };
            (0, validation_1.validateTags)(mergedTags, { allowedTagKeys, requiredTagKeys });
            const provider = input.provider ?? inferProvider(input.model);
            let cost = input.cost;
            if (cost === undefined) {
                const pricing = (0, pricing_1.getPrice)(input.model, customPricing);
                cost = pricing ? (0, pricing_1.computeCost)(input.inputTokens, input.outputTokens, pricing) : 0;
            }
            const record = {
                id: (0, node_crypto_1.randomUUID)(),
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
            if (buffer.length >= maxRecords)
                await flushBuffer();
            return record;
        },
        async flush() {
            await flushBuffer();
        },
        async query(filters) {
            await flushBuffer();
            return storage.query(filters ?? {});
        },
        async count(filters) {
            const records = await tracker.query(filters);
            return records.length;
        },
        async purge(filters) {
            await flushBuffer();
            return storage.purge(filters);
        },
        async close() {
            if (closed)
                return;
            closed = true;
            if (flushTimer) {
                clearInterval(flushTimer);
                flushTimer = null;
            }
            await flushBuffer();
            await storage.close();
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async report(options) {
            throw new Error('Report generation not yet implemented');
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async export(format, options) {
            throw new Error('Export not yet implemented');
        },
    };
    return tracker;
}
//# sourceMappingURL=tracker.js.map