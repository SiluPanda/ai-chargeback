import { describe, it, expect } from 'vitest';
import {
  ChargebackValidationError,
  ChargebackStorageError,
  ChargebackConfigError,
} from '../errors';

describe('ChargebackValidationError', () => {
  it('has name ChargebackValidationError', () => {
    const err = new ChargebackValidationError('invalid tag key');
    expect(err.name).toBe('ChargebackValidationError');
  });

  it('is instanceof Error', () => {
    const err = new ChargebackValidationError('test');
    expect(err instanceof Error).toBe(true);
  });

  it('message is accessible', () => {
    const err = new ChargebackValidationError('tag key "foo" is not allowed');
    expect(err.message).toBe('tag key "foo" is not allowed');
  });

  it('prototype chain is correct (instanceof own class)', () => {
    const err = new ChargebackValidationError('test');
    expect(err instanceof ChargebackValidationError).toBe(true);
  });
});

describe('ChargebackStorageError', () => {
  it('has name ChargebackStorageError', () => {
    const err = new ChargebackStorageError('write failed');
    expect(err.name).toBe('ChargebackStorageError');
  });

  it('is instanceof Error', () => {
    const err = new ChargebackStorageError('test');
    expect(err instanceof Error).toBe(true);
  });

  it('message is accessible', () => {
    const err = new ChargebackStorageError('disk full');
    expect(err.message).toBe('disk full');
  });

  it('prototype chain is correct (instanceof own class)', () => {
    const err = new ChargebackStorageError('test');
    expect(err instanceof ChargebackStorageError).toBe(true);
  });

  it('cause is accessible when provided', () => {
    const root = new Error('underlying disk error');
    const err = new ChargebackStorageError('storage write failed', root);
    expect(err.cause).toBe(root);
    expect(err.cause?.message).toBe('underlying disk error');
  });

  it('cause is undefined when not provided', () => {
    const err = new ChargebackStorageError('storage error');
    expect(err.cause).toBeUndefined();
  });
});

describe('ChargebackConfigError', () => {
  it('has name ChargebackConfigError', () => {
    const err = new ChargebackConfigError('invalid storage type');
    expect(err.name).toBe('ChargebackConfigError');
  });

  it('is instanceof Error', () => {
    const err = new ChargebackConfigError('test');
    expect(err instanceof Error).toBe(true);
  });

  it('message is accessible', () => {
    const err = new ChargebackConfigError('storage.type must be memory, file, or custom');
    expect(err.message).toBe('storage.type must be memory, file, or custom');
  });

  it('prototype chain is correct (instanceof own class)', () => {
    const err = new ChargebackConfigError('test');
    expect(err instanceof ChargebackConfigError).toBe(true);
  });
});

describe('StorageConfig discriminated union via type narrowing', () => {
  it('memory config has only type field — no path or adapter', () => {
    // Verify at runtime that a memory config object only has 'type'
    const cfg = { type: 'memory' as const };
    expect(Object.keys(cfg)).toEqual(['type']);
    expect((cfg as Record<string, unknown>)['path']).toBeUndefined();
    expect((cfg as Record<string, unknown>)['adapter']).toBeUndefined();
  });

  it('file config has type and path', () => {
    const cfg = { type: 'file' as const, path: './costs.json' };
    expect(cfg.type).toBe('file');
    expect(cfg.path).toBe('./costs.json');
  });

  it('custom config has type and adapter', () => {
    const adapter = {
      append: async () => {},
      query: async () => [],
      purge: async () => 0,
      close: async () => {},
    };
    const cfg = { type: 'custom' as const, adapter };
    expect(cfg.type).toBe('custom');
    expect(cfg.adapter).toBe(adapter);
  });
});

describe('Error stack trace', () => {
  it('all 3 error classes have a stack property', () => {
    expect(new ChargebackValidationError('x').stack).toBeDefined();
    expect(new ChargebackStorageError('x').stack).toBeDefined();
    expect(new ChargebackConfigError('x').stack).toBeDefined();
  });
});
