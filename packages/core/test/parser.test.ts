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
});
