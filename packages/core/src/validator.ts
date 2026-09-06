import type { OpenAPIV3 } from 'openapi-types';

import { SchemaValidationError } from './errors.js';
import type { OpenApiDocument } from './types.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateOpenApiDocument(value: unknown): OpenApiDocument {
  if (!isObject(value)) {
    throw new SchemaValidationError('OpenAPI document must be a JSON object.');
  }

  if (typeof value.openapi !== 'string' || !value.openapi.startsWith('3.')) {
    throw new SchemaValidationError('Only OpenAPI 3.x documents are supported.');
  }

  if (!isObject(value.info) || typeof value.info.title !== 'string') {
    throw new SchemaValidationError('OpenAPI document must contain info.title.');
  }

  if (!isObject(value.paths)) {
    throw new SchemaValidationError('OpenAPI document must contain a paths object.');
  }

  return value as unknown as OpenApiDocument;
}

export function isSchemaObject(value: unknown): value is OpenAPIV3.SchemaObject {
  return isObject(value) && !('$ref' in value);
}
