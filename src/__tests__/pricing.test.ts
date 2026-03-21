import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRICING, getPrice, computeCost } from '../pricing';
import type { ModelPricing } from '../types';

describe('BUILT_IN_PRICING', () => {
  it('contains exactly 16 models', () => {
    expect(Object.keys(BUILT_IN_PRICING)).toHaveLength(16);
  });

  it('gpt-4o pricing is correct', () => {
    expect(BUILT_IN_PRICING['gpt-4o']).toEqual({ input: 2.50, output: 10.00 });
  });

  it('gpt-4o-mini pricing is correct', () => {
    expect(BUILT_IN_PRICING['gpt-4o-mini']).toEqual({ input: 0.15, output: 0.60 });
  });

  it('gpt-4-turbo pricing is correct', () => {
    expect(BUILT_IN_PRICING['gpt-4-turbo']).toEqual({ input: 10.00, output: 30.00 });
  });

  it('gpt-4 pricing is correct', () => {
    expect(BUILT_IN_PRICING['gpt-4']).toEqual({ input: 30.00, output: 60.00 });
  });

  it('gpt-3.5-turbo pricing is correct', () => {
    expect(BUILT_IN_PRICING['gpt-3.5-turbo']).toEqual({ input: 0.50, output: 1.50 });
  });

  it('o1 pricing is correct', () => {
    expect(BUILT_IN_PRICING['o1']).toEqual({ input: 15.00, output: 60.00 });
  });

  it('o1-mini pricing is correct', () => {
    expect(BUILT_IN_PRICING['o1-mini']).toEqual({ input: 3.00, output: 12.00 });
  });

  it('o3-mini pricing is correct', () => {
    expect(BUILT_IN_PRICING['o3-mini']).toEqual({ input: 1.10, output: 4.40 });
  });

  it('claude-opus-4-20250514 pricing is correct', () => {
    expect(BUILT_IN_PRICING['claude-opus-4-20250514']).toEqual({ input: 15.00, output: 75.00 });
  });

  it('claude-sonnet-4-20250514 pricing is correct', () => {
    expect(BUILT_IN_PRICING['claude-sonnet-4-20250514']).toEqual({ input: 3.00, output: 15.00 });
  });

  it('claude-haiku-3-20250307 pricing is correct', () => {
    expect(BUILT_IN_PRICING['claude-haiku-3-20250307']).toEqual({ input: 0.80, output: 4.00 });
  });

  it('claude-3-5-sonnet-20241022 pricing is correct', () => {
    expect(BUILT_IN_PRICING['claude-3-5-sonnet-20241022']).toEqual({ input: 3.00, output: 15.00 });
  });

  it('claude-3-haiku-20240307 pricing is correct', () => {
    expect(BUILT_IN_PRICING['claude-3-haiku-20240307']).toEqual({ input: 0.25, output: 1.25 });
  });

  it('gemini-1.5-pro pricing is correct', () => {
    expect(BUILT_IN_PRICING['gemini-1.5-pro']).toEqual({ input: 1.25, output: 5.00 });
  });

  it('gemini-1.5-flash pricing is correct', () => {
    expect(BUILT_IN_PRICING['gemini-1.5-flash']).toEqual({ input: 0.075, output: 0.30 });
  });

  it('gemini-2.0-flash pricing is correct', () => {
    expect(BUILT_IN_PRICING['gemini-2.0-flash']).toEqual({ input: 0.10, output: 0.40 });
  });
});

describe('getPrice', () => {
  it('returns pricing for an exact model name', () => {
    expect(getPrice('gpt-4o')).toEqual({ input: 2.50, output: 10.00 });
  });

  it('returns pricing for a model with a dated suffix', () => {
    expect(getPrice('gpt-4o-2024-08-06')).toEqual({ input: 2.50, output: 10.00 });
  });

  it('returns pricing for gpt-4-turbo with dated suffix', () => {
    expect(getPrice('gpt-4-turbo-2024-04-09')).toEqual({ input: 10.00, output: 30.00 });
  });

  it('returns pricing for claude model with dated suffix stripping', () => {
    expect(getPrice('claude-3-5-sonnet-20241022')).toEqual({ input: 3.00, output: 15.00 });
  });

  it('returns undefined for an unknown model', () => {
    expect(getPrice('totally-unknown-model')).toBeUndefined();
  });

  it('returns undefined for an unknown model even with a date suffix', () => {
    expect(getPrice('unknown-model-2024-01-01')).toBeUndefined();
  });

  it('uses custom pricing when provided', () => {
    const custom: Record<string, ModelPricing> = {
      'my-custom-model': { input: 5.00, output: 20.00 },
    };
    expect(getPrice('my-custom-model', custom)).toEqual({ input: 5.00, output: 20.00 });
  });

  it('custom pricing takes precedence over built-in', () => {
    const custom: Record<string, ModelPricing> = {
      'gpt-4o': { input: 1.00, output: 5.00 },
    };
    expect(getPrice('gpt-4o', custom)).toEqual({ input: 1.00, output: 5.00 });
  });

  it('falls back to built-in when model not in custom pricing', () => {
    const custom: Record<string, ModelPricing> = {
      'my-custom-model': { input: 5.00, output: 20.00 },
    };
    expect(getPrice('gpt-4o', custom)).toEqual({ input: 2.50, output: 10.00 });
  });

  it('custom pricing works with dated suffix stripping', () => {
    const custom: Record<string, ModelPricing> = {
      'my-model': { input: 7.00, output: 14.00 },
    };
    expect(getPrice('my-model-2025-01-15', custom)).toEqual({ input: 7.00, output: 14.00 });
  });

  it('dated suffix custom pricing takes precedence over built-in base name', () => {
    const custom: Record<string, ModelPricing> = {
      'gpt-4o': { input: 99.00, output: 99.00 },
    };
    expect(getPrice('gpt-4o-2024-08-06', custom)).toEqual({ input: 99.00, output: 99.00 });
  });
});

describe('computeCost', () => {
  it('computes cost with known values', () => {
    const pricing: ModelPricing = { input: 2.50, output: 10.00 };
    // 1000 input tokens + 500 output tokens
    // (1000 / 1_000_000) * 2.50 + (500 / 1_000_000) * 10.00
    // = 0.0025 + 0.005 = 0.0075
    const cost = computeCost(1000, 500, pricing);
    expect(cost).toBeCloseTo(0.0075, 10);
  });

  it('computes cost with zero input tokens', () => {
    const pricing: ModelPricing = { input: 2.50, output: 10.00 };
    const cost = computeCost(0, 1000, pricing);
    expect(cost).toBeCloseTo(0.01, 10);
  });

  it('computes cost with zero output tokens', () => {
    const pricing: ModelPricing = { input: 2.50, output: 10.00 };
    const cost = computeCost(1000, 0, pricing);
    expect(cost).toBeCloseTo(0.0025, 10);
  });

  it('computes cost with zero tokens for both input and output', () => {
    const pricing: ModelPricing = { input: 2.50, output: 10.00 };
    const cost = computeCost(0, 0, pricing);
    expect(cost).toBe(0);
  });

  it('computes cost correctly for 1 million tokens', () => {
    const pricing: ModelPricing = { input: 2.50, output: 10.00 };
    const cost = computeCost(1_000_000, 1_000_000, pricing);
    expect(cost).toBeCloseTo(12.50, 10);
  });

  it('formula: (inputTokens / 1M * input) + (outputTokens / 1M * output)', () => {
    const pricing: ModelPricing = { input: 15.00, output: 75.00 };
    const inputTokens = 250_000;
    const outputTokens = 50_000;
    const expected =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;
    expect(computeCost(inputTokens, outputTokens, pricing)).toBeCloseTo(expected, 10);
  });

  it('handles fractional pricing correctly (gemini-1.5-flash)', () => {
    const pricing: ModelPricing = { input: 0.075, output: 0.30 };
    const cost = computeCost(10_000_000, 5_000_000, pricing);
    // (10M / 1M) * 0.075 + (5M / 1M) * 0.30 = 0.75 + 1.50 = 2.25
    expect(cost).toBeCloseTo(2.25, 10);
  });
});
