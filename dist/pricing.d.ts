import type { ModelPricing } from './types';
export declare const BUILT_IN_PRICING: Record<string, ModelPricing>;
export declare function getPrice(model: string, customPricing?: Record<string, ModelPricing>): ModelPricing | undefined;
export declare function computeCost(inputTokens: number, outputTokens: number, pricing: ModelPricing): number;
//# sourceMappingURL=pricing.d.ts.map