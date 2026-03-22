export declare class ChargebackValidationError extends Error {
    readonly name = "ChargebackValidationError";
    constructor(message: string);
}
export declare class ChargebackStorageError extends Error {
    readonly cause?: Error | undefined;
    readonly name = "ChargebackStorageError";
    constructor(message: string, cause?: Error | undefined);
}
export declare class ChargebackConfigError extends Error {
    readonly name = "ChargebackConfigError";
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map