import type { ModelPricing } from './types';

export const BUILT_IN_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-haiku-3-20250307': { input: 0.80, output: 4.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
};

const DATE_SUFFIX = /-\d{4}-\d{2}-\d{2}$/;

export function getPrice(
  model: string,
  customPricing?: Record<string, ModelPricing>,
): ModelPricing | undefined {
  if (customPricing?.[model]) return customPricing[model];
  if (BUILT_IN_PRICING[model]) return BUILT_IN_PRICING[model];

  const stripped = model.replace(DATE_SUFFIX, '');
  if (stripped !== model) {
    if (customPricing?.[stripped]) return customPricing[stripped];
    if (BUILT_IN_PRICING[stripped]) return BUILT_IN_PRICING[stripped];
  }

  return undefined;
}

export function computeCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  return (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
}
