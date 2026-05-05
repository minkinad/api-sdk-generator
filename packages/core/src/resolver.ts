import type { OpenAPIV3 } from 'openapi-types';

import { SchemaValidationError } from './errors.js';
import type { OpenApiDocument, SchemaLike } from './types.js';

export function isReferenceObject(schema: SchemaLike): schema is OpenAPIV3.ReferenceObject {
  return '$ref' in schema;
}

export function getReferenceName(ref: string): string {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);

  if (!match) {
    throw new SchemaValidationError(
      `Only local component schema refs are supported. Received "${ref}".`,
    );
  }

  return match[1];
}

export function resolveSchema(
  document: OpenApiDocument,
  schema: SchemaLike,
): OpenAPIV3.SchemaObject {
  if (!isReferenceObject(schema)) {
    return schema;
  }

  const schemaName = getReferenceName(schema.$ref);
  const resolved = document.components?.schemas?.[schemaName];

  if (!resolved) {
    throw new SchemaValidationError(`Unable to resolve schema reference "${schema.$ref}".`);
  }

  if (isReferenceObject(resolved)) {
    return resolveSchema(document, resolved);
  }

  return resolved;
}
