export class ChargebackValidationError extends Error {
  readonly name = 'ChargebackValidationError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ChargebackValidationError.prototype);
  }
}

export class ChargebackStorageError extends Error {
  readonly name = 'ChargebackStorageError';
  constructor(message: string, readonly cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, ChargebackStorageError.prototype);
  }
}

export class ChargebackConfigError extends Error {
  readonly name = 'ChargebackConfigError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ChargebackConfigError.prototype);
  }
}
