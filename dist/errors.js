"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargebackConfigError = exports.ChargebackStorageError = exports.ChargebackValidationError = void 0;
class ChargebackValidationError extends Error {
    name = 'ChargebackValidationError';
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, ChargebackValidationError.prototype);
    }
}
exports.ChargebackValidationError = ChargebackValidationError;
class ChargebackStorageError extends Error {
    cause;
    name = 'ChargebackStorageError';
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        Object.setPrototypeOf(this, ChargebackStorageError.prototype);
    }
}
exports.ChargebackStorageError = ChargebackStorageError;
class ChargebackConfigError extends Error {
    name = 'ChargebackConfigError';
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, ChargebackConfigError.prototype);
    }
}
exports.ChargebackConfigError = ChargebackConfigError;
//# sourceMappingURL=errors.js.map