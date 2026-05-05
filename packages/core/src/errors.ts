export class ApiSdkGeneratorError extends Error {
  public readonly code: string;

  public constructor(message: string, code = 'API_SDK_GENERATOR_ERROR', cause?: unknown) {
    super(message, cause instanceof Error ? { cause } : undefined);
    this.name = new.target.name;
    this.code = code;
  }
}

export class SchemaLoadError extends ApiSdkGeneratorError {
  public constructor(message: string, cause?: unknown) {
    super(message, 'SCHEMA_LOAD_ERROR', cause);
  }
}

export class SchemaValidationError extends ApiSdkGeneratorError {
  public constructor(message: string, cause?: unknown) {
    super(message, 'SCHEMA_VALIDATION_ERROR', cause);
  }
}

export class UnsupportedSchemaError extends ApiSdkGeneratorError {
  public constructor(message: string, cause?: unknown) {
    super(message, 'UNSUPPORTED_SCHEMA_ERROR', cause);
  }
}

export class OutputWriteError extends ApiSdkGeneratorError {
  public constructor(message: string, cause?: unknown) {
    super(message, 'OUTPUT_WRITE_ERROR', cause);
  }
}
