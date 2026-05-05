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
});
