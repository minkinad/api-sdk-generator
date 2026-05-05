import { describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-openapi.json';
import { generateTypesSource } from '../src/generator/type-generator.js';
import { parseDocument } from '../src/parser.js';
import { validateOpenApiDocument } from '../src/validator.js';

describe('type generator', () => {
  it('renders component and operation types', () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateTypesSource(parsed);

    expect(source).toContain('export interface User');
    expect(source).toContain('status: UserStatus;');
    expect(source).toContain('country?: string | null;');
    expect(source).toContain('export type UserStatus = "active" | "disabled";');
    expect(source).toContain('export interface GetUserByIdRequest');
  });
});
