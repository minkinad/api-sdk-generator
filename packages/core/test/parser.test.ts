import { describe, expect, it } from 'vitest';

import { parseDocument } from '../src/parser.js';
import { validateOpenApiDocument } from '../src/validator.js';

describe('parser', () => {
  it('prefers operation-level parameters over path-level parameters', () => {
    const document = validateOpenApiDocument({
      info: {
        title: 'Example API',
      },
      openapi: '3.0.3',
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            parameters: [
              {
                in: 'query',
                name: 'page',
                required: true,
                schema: {
                  type: 'integer',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Users',
              },
            },
          },
          parameters: [
            {
              in: 'query',
              name: 'page',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
        },
      },
    });

    const parsed = parseDocument(document);
    const operation = parsed.operations[0];

    expect(operation.queryParameters).toHaveLength(1);
    expect(operation.queryParameters[0]).toMatchObject({
      name: 'page',
      required: true,
    });
    expect(operation.queryParameters[0].schema).toMatchObject({
      type: 'integer',
    });
  });
  it('rejects operation names that normalize to the same identifier', () => {
    const operation = (operationId: string) => ({
      operationId,
      responses: { '204': { description: 'Empty' } },
    });
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Names' },
          paths: {
            '/a': { get: operation('get-user') },
            '/b': { get: operation('get_user') },
          },
        }),
      ),
    ).toThrow('Duplicate generated operation name');
  });

  it('parses HEAD and OPTIONS operations', () => {
    const operation = { responses: { '204': { description: 'Empty' } } };
    const parsed = parseDocument(
      validateOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Methods' },
        paths: {
          '/status': { head: operation, options: operation },
        },
      }),
    );
    expect(parsed.operations.map((operation) => operation.method)).toEqual(['head', 'options']);
  });

  it('rejects missing path parameters', () => {
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Path' },
          paths: {
            '/users/{id}': { get: { responses: { '204': { description: 'Empty' } } } },
          },
        }),
      ),
    ).toThrow('Missing path parameter "id"');
  });
});
