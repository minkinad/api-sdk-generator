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

  return decodePointerToken(match[1]);
}

export function resolveSchema(
  document: OpenApiDocument,
  schema: SchemaLike,
): OpenAPIV3.SchemaObject {
  if (!isReferenceObject(schema)) {
    return schema;
  }

  return resolveLocalComponent<OpenAPIV3.SchemaObject>(
    schema,
    document.components?.schemas,
    'schemas',
  );
}

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Follow local component aliases while rejecting dangling or cyclic references. */
export function resolveLocalComponent<T extends object>(
  reference: OpenAPIV3.ReferenceObject,
  collection: Record<string, T | OpenAPIV3.ReferenceObject> | undefined,
  section: string,
): T {
  const seen = new Set<string>();
  let current = reference;
  const prefix = `#/components/${section}/`;
  for (;;) {
    if (!current.$ref.startsWith(prefix)) {
      throw new SchemaValidationError(
        `Only local ${section} refs are supported. Received "${current.$ref}".`,
      );
    }
    if (seen.has(current.$ref)) {
      throw new SchemaValidationError(`Circular component reference "${current.$ref}".`);
    }
    seen.add(current.$ref);
    const name = decodePointerToken(current.$ref.slice(prefix.length));
    const resolved = collection && Object.hasOwn(collection, name) ? collection[name] : undefined;
    if (!resolved) {
      throw new SchemaValidationError(`Unable to resolve ${section} reference "${current.$ref}".`);
    }
    if ('$ref' in resolved) {
      current = resolved;
    } else {
      return resolved;
    }
  }
}
