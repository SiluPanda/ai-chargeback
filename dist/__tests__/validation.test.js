"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validation_1 = require("../validation");
const errors_1 = require("../errors");
(0, vitest_1.describe)('validateTagKey', () => {
    (0, vitest_1.it)('accepts valid tag keys', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('team')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('project.name')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('cost-center')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('env_v2')).not.toThrow();
    });
    (0, vitest_1.it)('rejects empty tag key', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('')).toThrow('Tag key must not be empty');
    });
    (0, vitest_1.it)('rejects key starting with reserved prefix _cb_', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('_cb_internal')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('_cb_internal')).toThrow('uses reserved prefix "_cb_"');
    });
    (0, vitest_1.it)('rejects key starting with a number', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('1team')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('1team')).toThrow('is invalid');
    });
    (0, vitest_1.it)('rejects key with special characters', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('team@name')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('cost center')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagKey)('key!')).toThrow(errors_1.ChargebackValidationError);
    });
});
(0, vitest_1.describe)('validateTagValue', () => {
    (0, vitest_1.it)('accepts valid tag value', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', 'engineering')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('env', 'production')).not.toThrow();
    });
    (0, vitest_1.it)('rejects empty tag value', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', '')).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', '')).toThrow('Tag value for key "team" must not be empty');
    });
    (0, vitest_1.it)('rejects value exceeding 256 characters', () => {
        const longValue = 'a'.repeat(257);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', longValue)).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', longValue)).toThrow('exceeds maximum length of 256 characters');
    });
    (0, vitest_1.it)('accepts value exactly at 256 characters', () => {
        const exactValue = 'a'.repeat(256);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagValue)('team', exactValue)).not.toThrow();
    });
});
(0, vitest_1.describe)('validateTagCount', () => {
    (0, vitest_1.it)('accepts tag count at or below 20', () => {
        const tags = {};
        for (let i = 0; i < 20; i++) {
            tags[`key${i}`] = `value${i}`;
        }
        (0, vitest_1.expect)(() => (0, validation_1.validateTagCount)(tags)).not.toThrow();
    });
    (0, vitest_1.it)('rejects tag count above 20', () => {
        const tags = {};
        for (let i = 0; i < 21; i++) {
            tags[`key${i}`] = `value${i}`;
        }
        (0, vitest_1.expect)(() => (0, validation_1.validateTagCount)(tags)).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTagCount)(tags)).toThrow('Tag count 21 exceeds maximum of 20');
    });
});
(0, vitest_1.describe)('validateAllowedKeys', () => {
    (0, vitest_1.it)('accepts tag keys in the allowed list', () => {
        const tags = { team: 'eng', env: 'prod' };
        (0, vitest_1.expect)(() => (0, validation_1.validateAllowedKeys)(tags, ['team', 'env', 'project'])).not.toThrow();
    });
    (0, vitest_1.it)('rejects tag key not in the allowed list', () => {
        const tags = { team: 'eng', secret: 'value' };
        (0, vitest_1.expect)(() => (0, validation_1.validateAllowedKeys)(tags, ['team', 'env'])).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateAllowedKeys)(tags, ['team', 'env'])).toThrow('Tag key "secret" is not in the allowed list: team, env');
    });
    (0, vitest_1.it)('allows all keys when allowedTagKeys is "any"', () => {
        const tags = { anything: 'goes', whatever: 'works' };
        (0, vitest_1.expect)(() => (0, validation_1.validateAllowedKeys)(tags, 'any')).not.toThrow();
    });
});
(0, vitest_1.describe)('validateRequiredKeys', () => {
    (0, vitest_1.it)('passes when all required keys are present', () => {
        const tags = { team: 'eng', env: 'prod' };
        (0, vitest_1.expect)(() => (0, validation_1.validateRequiredKeys)(tags, ['team', 'env'])).not.toThrow();
    });
    (0, vitest_1.it)('throws when a required key is missing', () => {
        const tags = { team: 'eng' };
        (0, vitest_1.expect)(() => (0, validation_1.validateRequiredKeys)(tags, ['team', 'env'])).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateRequiredKeys)(tags, ['team', 'env'])).toThrow('Required tag key "env" is missing');
    });
});
(0, vitest_1.describe)('validateTags', () => {
    (0, vitest_1.it)('passes with a valid full tag set', () => {
        const tags = { team: 'engineering', env: 'production', project: 'alpha' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags)).not.toThrow();
    });
    (0, vitest_1.it)('combines all validations — rejects invalid key', () => {
        const tags = { '1bad': 'value' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags)).toThrow(errors_1.ChargebackValidationError);
    });
    (0, vitest_1.it)('combines all validations — rejects empty value', () => {
        const tags = { team: '' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags)).toThrow(errors_1.ChargebackValidationError);
    });
    (0, vitest_1.it)('combines all validations — rejects too many tags', () => {
        const tags = {};
        for (let i = 0; i < 21; i++) {
            tags[`key${String.fromCharCode(97 + (i % 26))}${i}`] = `val${i}`;
        }
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags)).toThrow(errors_1.ChargebackValidationError);
    });
    (0, vitest_1.it)('enforces allowed keys when provided', () => {
        const tags = { team: 'eng', rogue: 'value' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags, { allowedTagKeys: ['team'] })).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags, { allowedTagKeys: ['team'] })).toThrow('not in the allowed list');
    });
    (0, vitest_1.it)('enforces required keys when provided', () => {
        const tags = { team: 'eng' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags, { requiredTagKeys: ['team', 'env'] })).toThrow(errors_1.ChargebackValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags, { requiredTagKeys: ['team', 'env'] })).toThrow('Required tag key "env" is missing');
    });
    (0, vitest_1.it)('passes with allowedTagKeys and requiredTagKeys satisfied', () => {
        const tags = { team: 'eng', env: 'prod' };
        (0, vitest_1.expect)(() => (0, validation_1.validateTags)(tags, {
            allowedTagKeys: ['team', 'env', 'project'],
            requiredTagKeys: ['team', 'env'],
        })).not.toThrow();
    });
});
//# sourceMappingURL=validation.test.js.map