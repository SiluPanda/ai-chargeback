import type { Tags } from './types';
export declare function validateTagKey(key: string): void;
export declare function validateTagValue(key: string, value: string): void;
export declare function validateTagCount(tags: Tags): void;
export declare function validateAllowedKeys(tags: Tags, allowedTagKeys: string[] | 'any'): void;
export declare function validateRequiredKeys(tags: Tags, requiredTagKeys: string[]): void;
export declare function validateTags(tags: Tags, options?: {
    allowedTagKeys?: string[] | 'any';
    requiredTagKeys?: string[];
}): void;
//# sourceMappingURL=validation.d.ts.map