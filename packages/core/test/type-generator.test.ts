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

  it('renders OpenAPI 3.1 nullable type arrays', () => {
    const parsed = parseDocument(
      validateOpenApiDocument({
        openapi: '3.1.0',
        info: { title: 'Nullable' },
        paths: {},
        components: {
          schemas: {
            OptionalName: { type: ['string', 'null'] },
            Status: { type: ['string', 'null'], enum: ['active', null] },
          },
        },
      }),
    );
    expect(generateTypesSource(parsed)).toContain('export type OptionalName = string | null;');
    expect(generateTypesSource(parsed)).toContain('export type Status = "active" | null;');
  });

  it('includes every successful response type, including no-content statuses', () => {
    const parsed = parseDocument(
      validateOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Responses' },
        paths: {
          '/items': {
            get: {
              responses: {
                '200': {
                  description: 'Item',
                  content: { 'application/json': { schema: { type: 'string' } } },
                },
                '204': { description: 'Empty' },
              },
            },
          },
        },
      }),
    );
    expect(generateTypesSource(parsed)).toContain('export type GetItemsResponse = string | void;');
  });

  it('uses unknown for JSON responses without a schema instead of void', () => {
    const parsed = parseDocument(
      validateOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Unknown' },
        paths: {
          '/items': {
            get: {
              responses: {
                '200': {
                  description: 'Item',
                  content: { 'application/json': {} },
                },
              },
            },
          },
        },
      }),
    );
    expect(generateTypesSource(parsed)).toContain('export type GetItemsResponse = unknown;');
  });

  it('rejects unsupported negation instead of silently emitting unknown', () => {
    const parsed = parseDocument(
      validateOpenApiDocument({
        openapi: '3.1.0',
        info: { title: 'Negation' },
        paths: {},
        components: { schemas: { NotString: { not: { type: 'string' } } } },
      }),
    );
    expect(() => generateTypesSource(parsed)).toThrow('not schemas are unsupported');
  });

  it('reports invalid component schemas without a runtime TypeError', () => {
    expect(() =>
      validateOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Invalid' },
        paths: {},
        components: { schemas: { Broken: null } },
      }),
    ).toThrow('Invalid schema');
  });
});
