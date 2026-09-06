import type { OpenAPIV3 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-openapi.json';
import { resolveSchema } from '../src/resolver.js';
import { validateOpenApiDocument } from '../src/validator.js';

describe('resolver', () => {
  it('resolves refs from components', () => {
    const document = validateOpenApiDocument(fixture);
    const userSchema = document.components!.schemas!.User as OpenAPIV3.SchemaObject;
    const statusSchema = resolveSchema(document, userSchema.properties!.status);

    expect(statusSchema.enum).toEqual(['active', 'disabled']);
  });
  it('decodes JSON Pointer tokens and follows component aliases', () => {
    const document = validateOpenApiDocument({
      openapi: '3.0.3',
      info: { title: 'Refs' },
      paths: {},
      components: {
        schemas: { 'a/b~c': { type: 'string' }, Alias: { $ref: '#/components/schemas/a~1b~0c' } },
      },
    });
    expect(resolveSchema(document, { $ref: '#/components/schemas/Alias' })).toEqual({
      type: 'string',
    });
  });

  it('rejects alias cycles without overflowing the call stack', () => {
    const document = validateOpenApiDocument({
      openapi: '3.0.3',
      info: { title: 'Refs' },
      paths: {},
      components: {
        schemas: { A: { $ref: '#/components/schemas/B' }, B: { $ref: '#/components/schemas/A' } },
      },
    });
    expect(() => resolveSchema(document, { $ref: '#/components/schemas/A' })).toThrow(
      'Circular component reference',
    );
  });
});
