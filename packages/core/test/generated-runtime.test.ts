import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

import { generateSdk } from '../src/generate-sdk.js';

interface RuntimeClient {
  getItem(request: { id: string; tags?: string[] | null; limit?: number | null }): Promise<unknown>;
  createItem(request: { body: { name: string } }): Promise<unknown>;
  deleteItem(): Promise<unknown>;
  getText(): Promise<string>;
  getBinary(): Promise<ArrayBuffer>;
}

interface RuntimeModule {
  createClient(config: {
    baseUrl: string;
    fetch: typeof fetch;
    headers?: HeadersInit;
  }): RuntimeClient;
  ApiError: new (...args: never[]) => Error & { status: number; body: unknown };
}

async function runtimeModule(): Promise<RuntimeModule> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sdk-runtime-'));
  try {
    const schemaPath = path.join(root, 'schema.json');
    await writeFile(
      schemaPath,
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Runtime' },
        paths: {
          '/items/{id}': {
            get: {
              operationId: 'getItem',
              parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                { in: 'query', name: 'tags', schema: { type: 'array', items: { type: 'string' } } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } },
              ],
              responses: {
                '200': {
                  description: 'Item',
                  content: { 'application/json': { schema: { type: 'object' } } },
                },
              },
            },
          },
          '/items': {
            post: {
              operationId: 'createItem',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { name: { type: 'string' } },
                      required: ['name'],
                    },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'Created',
                  content: { 'application/json': { schema: { type: 'object' } } },
                },
              },
            },
            delete: { operationId: 'deleteItem', responses: { '204': { description: 'Deleted' } } },
          },
          '/text': {
            get: {
              operationId: 'getText',
              responses: {
                '200': {
                  description: 'Text',
                  content: { 'text/plain': { schema: { type: 'string' } } },
                },
              },
            },
          },
          '/binary': {
            get: {
              operationId: 'getBinary',
              responses: {
                '200': {
                  description: 'Binary',
                  content: {
                    'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
                  },
                },
              },
            },
          },
        },
      }),
    );
    const result = await generateSdk({
      input: { file: schemaPath },
      outputDir: path.join(root, 'output'),
      dryRun: true,
    });
    const source = result.files.find((file) => file.path === 'client.ts')?.content;
    if (!source) throw new Error('Generated client is missing');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const compiledPath = path.join(root, 'client.cjs');
    await writeFile(compiledPath, code);
    const loaded = (await import(pathToFileURL(compiledPath).href)) as { default: RuntimeModule };
    return loaded.default;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('generated client runtime', () => {
  it('encodes path and query values, omits nulls, and parses JSON', async () => {
    const runtime = await runtimeModule();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }),
      );
    const client = runtime.createClient({ baseUrl: 'https://example.com/api', fetch: fetchMock });
    await expect(client.getItem({ id: 'a/b', tags: ['one', 'two'], limit: null })).resolves.toEqual(
      { ok: true },
    );
    const [url] = fetchMock.mock.calls[0];
    expect(url instanceof URL ? url.href : typeof url === 'string' ? url : url.url).toBe(
      'https://example.com/api/items/a%2Fb?tags=one&tags=two',
    );
  });

  it('sends JSON and preserves HTTP errors while leaving 204 unread', async () => {
    const runtime = await runtimeModule();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('{"id":1}', { status: 201, headers: { 'content-type': 'application/json' } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response('{"reason":"bad"}', {
          status: 422,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const client = runtime.createClient({ baseUrl: 'https://example.com', fetch: fetchMock });
    await expect(client.createItem({ body: { name: 'x' } })).resolves.toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"name":"x"}');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('content-type')).toBe(
      'application/json',
    );
    await expect(client.deleteItem()).resolves.toBeUndefined();
    await expect(client.deleteItem()).rejects.toMatchObject({
      status: 422,
      body: { reason: 'bad' },
    });
    expect(runtime.ApiError.name).toBe('ApiError');
  });

  it('returns text and binary responses in their declared types', async () => {
    const runtime = await runtimeModule();
    const bytes = Uint8Array.from([0, 255, 1]);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('hello', { headers: { 'content-type': 'text/plain' } }))
      .mockResolvedValueOnce(
        new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }),
      );
    const client = runtime.createClient({ baseUrl: 'https://example.com', fetch: fetchMock });
    await expect(client.getText()).resolves.toBe('hello');
    const binary = await client.getBinary();
    expect(binary).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(binary))).toEqual([0, 255, 1]);
  });
});
