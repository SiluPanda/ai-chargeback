import { describe, it, expect } from 'vitest';
import {
  validateTagKey,
  validateTagValue,
  validateTagCount,
  validateAllowedKeys,
  validateRequiredKeys,
  validateTags,
} from '../validation';
import { ChargebackValidationError } from '../errors';

describe('validateTagKey', () => {
  it('accepts valid tag keys', () => {
    expect(() => validateTagKey('team')).not.toThrow();
    expect(() => validateTagKey('project.name')).not.toThrow();
    expect(() => validateTagKey('cost-center')).not.toThrow();
    expect(() => validateTagKey('env_v2')).not.toThrow();
  });

  it('rejects empty tag key', () => {
    expect(() => validateTagKey('')).toThrow(ChargebackValidationError);
    expect(() => validateTagKey('')).toThrow('Tag key must not be empty');
  });

  it('rejects key starting with reserved prefix _cb_', () => {
    expect(() => validateTagKey('_cb_internal')).toThrow(ChargebackValidationError);
    expect(() => validateTagKey('_cb_internal')).toThrow('uses reserved prefix "_cb_"');
  });

  it('rejects key starting with a number', () => {
    expect(() => validateTagKey('1team')).toThrow(ChargebackValidationError);
    expect(() => validateTagKey('1team')).toThrow('is invalid');
  });

  it('rejects key with special characters', () => {
    expect(() => validateTagKey('team@name')).toThrow(ChargebackValidationError);
    expect(() => validateTagKey('cost center')).toThrow(ChargebackValidationError);
    expect(() => validateTagKey('key!')).toThrow(ChargebackValidationError);
  });
});

describe('validateTagValue', () => {
  it('accepts valid tag value', () => {
    expect(() => validateTagValue('team', 'engineering')).not.toThrow();
    expect(() => validateTagValue('env', 'production')).not.toThrow();
  });

  it('rejects empty tag value', () => {
    expect(() => validateTagValue('team', '')).toThrow(ChargebackValidationError);
    expect(() => validateTagValue('team', '')).toThrow('Tag value for key "team" must not be empty');
  });

  it('rejects value exceeding 256 characters', () => {
    const longValue = 'a'.repeat(257);
    expect(() => validateTagValue('team', longValue)).toThrow(ChargebackValidationError);
    expect(() => validateTagValue('team', longValue)).toThrow('exceeds maximum length of 256 characters');
  });

  it('accepts value exactly at 256 characters', () => {
    const exactValue = 'a'.repeat(256);
    expect(() => validateTagValue('team', exactValue)).not.toThrow();
  });
});

describe('validateTagCount', () => {
  it('accepts tag count at or below 20', () => {
    const tags: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      tags[`key${i}`] = `value${i}`;
    }
    expect(() => validateTagCount(tags)).not.toThrow();
  });

  it('rejects tag count above 20', () => {
    const tags: Record<string, string> = {};
    for (let i = 0; i < 21; i++) {
      tags[`key${i}`] = `value${i}`;
    }
    expect(() => validateTagCount(tags)).toThrow(ChargebackValidationError);
    expect(() => validateTagCount(tags)).toThrow('Tag count 21 exceeds maximum of 20');
  });
});

describe('validateAllowedKeys', () => {
  it('accepts tag keys in the allowed list', () => {
    const tags = { team: 'eng', env: 'prod' };
    expect(() => validateAllowedKeys(tags, ['team', 'env', 'project'])).not.toThrow();
  });

  it('rejects tag key not in the allowed list', () => {
    const tags = { team: 'eng', secret: 'value' };
    expect(() => validateAllowedKeys(tags, ['team', 'env'])).toThrow(ChargebackValidationError);
    expect(() => validateAllowedKeys(tags, ['team', 'env'])).toThrow('Tag key "secret" is not in the allowed list: team, env');
  });

  it('allows all keys when allowedTagKeys is "any"', () => {
    const tags = { anything: 'goes', whatever: 'works' };
    expect(() => validateAllowedKeys(tags, 'any')).not.toThrow();
  });
});

describe('validateRequiredKeys', () => {
  it('passes when all required keys are present', () => {
    const tags = { team: 'eng', env: 'prod' };
    expect(() => validateRequiredKeys(tags, ['team', 'env'])).not.toThrow();
  });

  it('throws when a required key is missing', () => {
    const tags = { team: 'eng' };
    expect(() => validateRequiredKeys(tags, ['team', 'env'])).toThrow(ChargebackValidationError);
    expect(() => validateRequiredKeys(tags, ['team', 'env'])).toThrow('Required tag key "env" is missing');
  });
});

describe('validateTags', () => {
  it('passes with a valid full tag set', () => {
    const tags = { team: 'engineering', env: 'production', project: 'alpha' };
    expect(() => validateTags(tags)).not.toThrow();
  });

  it('combines all validations — rejects invalid key', () => {
    const tags = { '1bad': 'value' };
    expect(() => validateTags(tags)).toThrow(ChargebackValidationError);
  });

  it('combines all validations — rejects empty value', () => {
    const tags = { team: '' };
    expect(() => validateTags(tags)).toThrow(ChargebackValidationError);
  });

  it('combines all validations — rejects too many tags', () => {
    const tags: Record<string, string> = {};
    for (let i = 0; i < 21; i++) {
      tags[`key${String.fromCharCode(97 + (i % 26))}${i}`] = `val${i}`;
    }
    expect(() => validateTags(tags)).toThrow(ChargebackValidationError);
  });

  it('enforces allowed keys when provided', () => {
    const tags = { team: 'eng', rogue: 'value' };
    expect(() => validateTags(tags, { allowedTagKeys: ['team'] })).toThrow(ChargebackValidationError);
    expect(() => validateTags(tags, { allowedTagKeys: ['team'] })).toThrow('not in the allowed list');
  });

  it('enforces required keys when provided', () => {
    const tags = { team: 'eng' };
    expect(() => validateTags(tags, { requiredTagKeys: ['team', 'env'] })).toThrow(ChargebackValidationError);
    expect(() => validateTags(tags, { requiredTagKeys: ['team', 'env'] })).toThrow('Required tag key "env" is missing');
  });

  it('passes with allowedTagKeys and requiredTagKeys satisfied', () => {
    const tags = { team: 'eng', env: 'prod' };
    expect(() => validateTags(tags, {
      allowedTagKeys: ['team', 'env', 'project'],
      requiredTagKeys: ['team', 'env'],
    })).not.toThrow();
  });
});
