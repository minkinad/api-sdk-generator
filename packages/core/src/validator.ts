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

  if (typeof value.openapi !== 'string' || !/^3\.(?:0|1)\.\d+$/.test(value.openapi)) {
    throw new SchemaValidationError('Only OpenAPI 3.0 and 3.1 documents are supported.');
  }

  if (!isObject(value.info) || typeof value.info.title !== 'string') {
    throw new SchemaValidationError('OpenAPI document must contain info.title.');
  }

  if (!isObject(value.paths)) {
    throw new SchemaValidationError('OpenAPI document must contain a paths object.');
  }

  if (value.components !== undefined) {
    if (
      !isObject(value.components) ||
      (value.components.schemas !== undefined && !isObject(value.components.schemas))
    ) {
      throw new SchemaValidationError('OpenAPI components.schemas must be an object.');
    }
    if (isObject(value.components.schemas)) {
      for (const [name, schema] of Object.entries(value.components.schemas)) {
        if (!isObject(schema))
          throw new SchemaValidationError(`Invalid schema "${name}": expected an object.`);
      }
    }
  }
  for (const [path, pathItem] of Object.entries(value.paths)) {
    if (!path.startsWith('/')) {
      throw new SchemaValidationError(`Path keys must start with "/": "${path}".`);
    }
    if (!isObject(pathItem))
      throw new SchemaValidationError(`Invalid path "${path}": expected an object.`);
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']) {
      if (!(method in pathItem)) continue;
      const operation = pathItem[method];
      if (!isObject(operation))
        throw new SchemaValidationError(
          `Invalid operation ${method.toUpperCase()} ${path}: expected an object.`,
        );
      if (!isObject(operation.responses))
        throw new SchemaValidationError(
          `Invalid responses in ${method.toUpperCase()} ${path}: expected an object.`,
        );
      for (const [status, response] of Object.entries(operation.responses)) {
        if (!isObject(response))
          throw new SchemaValidationError(
            `Invalid response ${status} in ${method.toUpperCase()} ${path}: expected an object.`,
          );
      }
    }
  }

  return value as unknown as OpenApiDocument;
}

export function isSchemaObject(value: unknown): value is OpenAPIV3.SchemaObject {
  return isObject(value) && !('$ref' in value);
}
