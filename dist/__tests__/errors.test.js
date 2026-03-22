"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errors_1 = require("../errors");
(0, vitest_1.describe)('ChargebackValidationError', () => {
    (0, vitest_1.it)('has name ChargebackValidationError', () => {
        const err = new errors_1.ChargebackValidationError('invalid tag key');
        (0, vitest_1.expect)(err.name).toBe('ChargebackValidationError');
    });
    (0, vitest_1.it)('is instanceof Error', () => {
        const err = new errors_1.ChargebackValidationError('test');
        (0, vitest_1.expect)(err instanceof Error).toBe(true);
    });
    (0, vitest_1.it)('message is accessible', () => {
        const err = new errors_1.ChargebackValidationError('tag key "foo" is not allowed');
        (0, vitest_1.expect)(err.message).toBe('tag key "foo" is not allowed');
    });
    (0, vitest_1.it)('prototype chain is correct (instanceof own class)', () => {
        const err = new errors_1.ChargebackValidationError('test');
        (0, vitest_1.expect)(err instanceof errors_1.ChargebackValidationError).toBe(true);
    });
});
(0, vitest_1.describe)('ChargebackStorageError', () => {
    (0, vitest_1.it)('has name ChargebackStorageError', () => {
        const err = new errors_1.ChargebackStorageError('write failed');
        (0, vitest_1.expect)(err.name).toBe('ChargebackStorageError');
    });
    (0, vitest_1.it)('is instanceof Error', () => {
        const err = new errors_1.ChargebackStorageError('test');
        (0, vitest_1.expect)(err instanceof Error).toBe(true);
    });
    (0, vitest_1.it)('message is accessible', () => {
        const err = new errors_1.ChargebackStorageError('disk full');
        (0, vitest_1.expect)(err.message).toBe('disk full');
    });
    (0, vitest_1.it)('prototype chain is correct (instanceof own class)', () => {
        const err = new errors_1.ChargebackStorageError('test');
        (0, vitest_1.expect)(err instanceof errors_1.ChargebackStorageError).toBe(true);
    });
    (0, vitest_1.it)('cause is accessible when provided', () => {
        const root = new Error('underlying disk error');
        const err = new errors_1.ChargebackStorageError('storage write failed', root);
        (0, vitest_1.expect)(err.cause).toBe(root);
        (0, vitest_1.expect)(err.cause?.message).toBe('underlying disk error');
    });
    (0, vitest_1.it)('cause is undefined when not provided', () => {
        const err = new errors_1.ChargebackStorageError('storage error');
        (0, vitest_1.expect)(err.cause).toBeUndefined();
    });
});
(0, vitest_1.describe)('ChargebackConfigError', () => {
    (0, vitest_1.it)('has name ChargebackConfigError', () => {
        const err = new errors_1.ChargebackConfigError('invalid storage type');
        (0, vitest_1.expect)(err.name).toBe('ChargebackConfigError');
    });
    (0, vitest_1.it)('is instanceof Error', () => {
        const err = new errors_1.ChargebackConfigError('test');
        (0, vitest_1.expect)(err instanceof Error).toBe(true);
    });
    (0, vitest_1.it)('message is accessible', () => {
        const err = new errors_1.ChargebackConfigError('storage.type must be memory, file, or custom');
        (0, vitest_1.expect)(err.message).toBe('storage.type must be memory, file, or custom');
    });
    (0, vitest_1.it)('prototype chain is correct (instanceof own class)', () => {
        const err = new errors_1.ChargebackConfigError('test');
        (0, vitest_1.expect)(err instanceof errors_1.ChargebackConfigError).toBe(true);
    });
});
(0, vitest_1.describe)('StorageConfig discriminated union via type narrowing', () => {
    (0, vitest_1.it)('memory config has only type field — no path or adapter', () => {
        // Verify at runtime that a memory config object only has 'type'
        const cfg = { type: 'memory' };
        (0, vitest_1.expect)(Object.keys(cfg)).toEqual(['type']);
        (0, vitest_1.expect)(cfg['path']).toBeUndefined();
        (0, vitest_1.expect)(cfg['adapter']).toBeUndefined();
    });
    (0, vitest_1.it)('file config has type and path', () => {
        const cfg = { type: 'file', path: './costs.json' };
        (0, vitest_1.expect)(cfg.type).toBe('file');
        (0, vitest_1.expect)(cfg.path).toBe('./costs.json');
    });
    (0, vitest_1.it)('custom config has type and adapter', () => {
        const adapter = {
            append: async () => { },
            query: async () => [],
            purge: async () => 0,
            close: async () => { },
        };
        const cfg = { type: 'custom', adapter };
        (0, vitest_1.expect)(cfg.type).toBe('custom');
        (0, vitest_1.expect)(cfg.adapter).toBe(adapter);
    });
});
(0, vitest_1.describe)('Error stack trace', () => {
    (0, vitest_1.it)('all 3 error classes have a stack property', () => {
        (0, vitest_1.expect)(new errors_1.ChargebackValidationError('x').stack).toBeDefined();
        (0, vitest_1.expect)(new errors_1.ChargebackStorageError('x').stack).toBeDefined();
        (0, vitest_1.expect)(new errors_1.ChargebackConfigError('x').stack).toBeDefined();
    });
});
//# sourceMappingURL=errors.test.js.map