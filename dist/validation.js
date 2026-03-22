"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTagKey = validateTagKey;
exports.validateTagValue = validateTagValue;
exports.validateTagCount = validateTagCount;
exports.validateAllowedKeys = validateAllowedKeys;
exports.validateRequiredKeys = validateRequiredKeys;
exports.validateTags = validateTags;
const errors_1 = require("./errors");
const TAG_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.\-]*$/;
const RESERVED_PREFIX = '_cb_';
const MAX_TAG_COUNT = 20;
const MAX_VALUE_LENGTH = 256;
function validateTagKey(key) {
    if (!key)
        throw new errors_1.ChargebackValidationError('Tag key must not be empty');
    if (key.startsWith(RESERVED_PREFIX))
        throw new errors_1.ChargebackValidationError(`Tag key "${key}" uses reserved prefix "${RESERVED_PREFIX}"`);
    if (!TAG_KEY_PATTERN.test(key))
        throw new errors_1.ChargebackValidationError(`Tag key "${key}" is invalid. Must start with a letter and contain only alphanumeric, underscore, dot, or hyphen characters.`);
}
function validateTagValue(key, value) {
    if (!value)
        throw new errors_1.ChargebackValidationError(`Tag value for key "${key}" must not be empty`);
    if (value.length > MAX_VALUE_LENGTH)
        throw new errors_1.ChargebackValidationError(`Tag value for key "${key}" exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
}
function validateTagCount(tags) {
    const count = Object.keys(tags).length;
    if (count > MAX_TAG_COUNT)
        throw new errors_1.ChargebackValidationError(`Tag count ${count} exceeds maximum of ${MAX_TAG_COUNT}`);
}
function validateAllowedKeys(tags, allowedTagKeys) {
    if (allowedTagKeys === 'any')
        return;
    const allowedSet = new Set(allowedTagKeys);
    for (const key of Object.keys(tags)) {
        if (!allowedSet.has(key))
            throw new errors_1.ChargebackValidationError(`Tag key "${key}" is not in the allowed list: ${allowedTagKeys.join(', ')}`);
    }
}
function validateRequiredKeys(tags, requiredTagKeys) {
    for (const key of requiredTagKeys) {
        if (!(key in tags))
            throw new errors_1.ChargebackValidationError(`Required tag key "${key}" is missing`);
    }
}
function validateTags(tags, options = {}) {
    validateTagCount(tags);
    for (const [key, value] of Object.entries(tags)) {
        validateTagKey(key);
        validateTagValue(key, value);
    }
    if (options.allowedTagKeys)
        validateAllowedKeys(tags, options.allowedTagKeys);
    if (options.requiredTagKeys)
        validateRequiredKeys(tags, options.requiredTagKeys);
}
//# sourceMappingURL=validation.js.map