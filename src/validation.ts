import type { Tags } from './types';
import { ChargebackValidationError } from './errors';

const TAG_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.\-]*$/;
const RESERVED_PREFIX = '_cb_';
const MAX_TAG_COUNT = 20;
const MAX_VALUE_LENGTH = 256;

export function validateTagKey(key: string): void {
  if (!key) throw new ChargebackValidationError('Tag key must not be empty');
  if (key.startsWith(RESERVED_PREFIX)) throw new ChargebackValidationError(`Tag key "${key}" uses reserved prefix "${RESERVED_PREFIX}"`);
  if (!TAG_KEY_PATTERN.test(key)) throw new ChargebackValidationError(`Tag key "${key}" is invalid. Must start with a letter and contain only alphanumeric, underscore, dot, or hyphen characters.`);
}

export function validateTagValue(key: string, value: string): void {
  if (!value) throw new ChargebackValidationError(`Tag value for key "${key}" must not be empty`);
  if (value.length > MAX_VALUE_LENGTH) throw new ChargebackValidationError(`Tag value for key "${key}" exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
}

export function validateTagCount(tags: Tags): void {
  const count = Object.keys(tags).length;
  if (count > MAX_TAG_COUNT) throw new ChargebackValidationError(`Tag count ${count} exceeds maximum of ${MAX_TAG_COUNT}`);
}

export function validateAllowedKeys(tags: Tags, allowedTagKeys: string[] | 'any'): void {
  if (allowedTagKeys === 'any') return;
  const allowedSet = new Set(allowedTagKeys);
  for (const key of Object.keys(tags)) {
    if (!allowedSet.has(key)) throw new ChargebackValidationError(`Tag key "${key}" is not in the allowed list: ${allowedTagKeys.join(', ')}`);
  }
}

export function validateRequiredKeys(tags: Tags, requiredTagKeys: string[]): void {
  for (const key of requiredTagKeys) {
    if (!(key in tags)) throw new ChargebackValidationError(`Required tag key "${key}" is missing`);
  }
}

export function validateTags(
  tags: Tags,
  options: { allowedTagKeys?: string[] | 'any'; requiredTagKeys?: string[] } = {},
): void {
  validateTagCount(tags);
  for (const [key, value] of Object.entries(tags)) {
    validateTagKey(key);
    validateTagValue(key, value);
  }
  if (options.allowedTagKeys) validateAllowedKeys(tags, options.allowedTagKeys);
  if (options.requiredTagKeys) validateRequiredKeys(tags, options.requiredTagKeys);
}
