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
  it('resolves operation names that normalize to the same identifier', () => {
    const operation = (operationId: string) => ({
      operationId,
      responses: { '204': { description: 'Empty' } },
    });
    expect(
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Names' },
          paths: {
            '/a': { get: operation('get-user') },
            '/b': { get: operation('get_user') },
          },
        }),
      ).operations.map((item) => item.functionName),
    ).toEqual(['getUser', 'getUser2']);
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

  it('rejects parameter locations that would silently disappear from requests', () => {
    for (const location of ['header', 'cookie']) {
      expect(() =>
        parseDocument(
          validateOpenApiDocument({
            openapi: '3.0.3',
            info: { title: 'Parameters' },
            paths: {
              '/items': {
                get: {
                  parameters: [{ in: location, name: 'token', schema: { type: 'string' } }],
                  responses: { '204': { description: 'Done' } },
                },
              },
            },
          }),
        ),
      ).toThrow(`Unsupported ${location} parameter`);
    }
  });

  it('does not model an error response as a successful return value', () => {
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Responses' },
          paths: { '/items': { get: { responses: { '404': { description: 'Missing' } } } } },
        }),
      ),
    ).toThrow('successful response');
  });

  it('rejects parameter serialization options the runtime cannot honor', () => {
    const parameter = (extra: Record<string, unknown>) => ({
      in: 'query',
      name: 'q',
      schema: { type: 'string' },
      ...extra,
    });
    for (const extra of [{ allowReserved: true }, { style: 'deepObject' }]) {
      expect(() =>
        parseDocument(
          validateOpenApiDocument({
            openapi: '3.0.3',
            info: { title: 'Serialization' },
            paths: {
              '/items': {
                get: {
                  parameters: [parameter(extra)],
                  responses: { '204': { description: 'Done' } },
                },
              },
            },
          }),
        ),
      ).toThrow('Unsupported query serialization');
    }
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Serialization' },
          paths: {
            '/items/{id}': {
              get: {
                parameters: [
                  {
                    in: 'path',
                    name: 'id',
                    required: true,
                    style: 'matrix',
                    schema: { type: 'string' },
                  },
                ],
                responses: { '204': { description: 'Done' } },
              },
            },
          },
        }),
      ),
    ).toThrow('Unsupported path serialization');
  });

  it('reports malformed operations and unsupported OpenAPI versions clearly', () => {
    expect(() =>
      validateOpenApiDocument({ openapi: '3.2.0', info: { title: 'Future' }, paths: {} }),
    ).toThrow('Only OpenAPI 3.0 and 3.1');
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Malformed' },
          paths: { '/items': { get: { responses: { '200': null } } } },
        }),
      ),
    ).toThrow('Invalid response');
    expect(() =>
      validateOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Path' },
        paths: { '': { get: { responses: { '204': { description: 'Done' } } } } },
      }),
    ).toThrow('Path keys must start with');
  });

  it('reports malformed media and references as validation errors', () => {
    const operation = (response: unknown) => ({ responses: { '200': response } });
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Malformed' },
          paths: {
            '/items': {
              get: operation({ description: 'OK', content: { 'application/json': null } }),
            },
          },
        }),
      ),
    ).toThrow('Invalid application/json response');
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Malformed' },
          paths: { '/items': { get: operation({ $ref: null }) } },
        }),
      ),
    ).toThrow('Invalid reference');
  });

  it('rejects responses with multiple media variants that cannot share one return type', () => {
    expect(() =>
      parseDocument(
        validateOpenApiDocument({
          openapi: '3.0.3',
          info: { title: 'Media' },
          paths: {
            '/items': {
              get: {
                responses: {
                  '200': {
                    description: 'Item',
                    content: {
                      'application/json': { schema: { type: 'object' } },
                      'text/plain': { schema: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        }),
      ),
    ).toThrow('Multiple response media types');
  });
});
