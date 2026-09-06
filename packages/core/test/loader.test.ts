import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { SchemaLoadError } from '../src/errors.js';
import {
  loadOpenApiDocument,
  loadOpenApiDocumentFromFile,
  loadOpenApiDocumentFromUrl,
} from '../src/loader.js';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/sample-openapi.json');

describe('loader', () => {
  it('rejects cyclic YAML aliases while allowing repeated non-cyclic anchors', async () => {
    const fetchImplementation = (content: string) =>
      vi.fn(() => Promise.resolve(new Response(content)));
    const prefix = 'openapi: 3.0.3\ninfo:\n  title: Aliases\npaths: {}\ncomponents:\n  schemas:\n';
    await expect(
      loadOpenApiDocumentFromUrl(
        'https://example.com/schema',
        fetchImplementation(
          `${prefix}    Node: &node\n      type: object\n      properties:\n        child: *node\n`,
        ),
      ),
    ).rejects.toThrow('Cyclic YAML aliases');
    const document = await loadOpenApiDocumentFromUrl(
      'https://example.com/schema',
      fetchImplementation(`${prefix}    First: &name\n      type: string\n    Second: *name\n`),
    );
    expect(document.components?.schemas?.Second).toEqual({ type: 'string' });
  });
  it('loads schema from file', async () => {
    const document = await loadOpenApiDocumentFromFile(fixturePath);

    expect(document.info.title).toBe('Demo API');
    expect(document.openapi).toBe('3.0.3');
  });

  it('loads schema from url', async () => {
    const fetchImplementation = vi.fn(async () => {
      return new Response(await readFile(fixturePath, 'utf8'), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    });

    const document = await loadOpenApiDocumentFromUrl(
      'https://example.com/openapi.json',
      fetchImplementation,
    );

    expect(document.paths['/users']).toBeDefined();
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it('requires exactly one source', async () => {
    await expect(loadOpenApiDocument({})).rejects.toBeInstanceOf(SchemaLoadError);
    await expect(
      loadOpenApiDocument({ file: 'a.json', url: 'https://example.com/openapi.json' }),
    ).rejects.toBeInstanceOf(SchemaLoadError);
  });
  it('loads YAML from a URL without relying on its extension or content type', async () => {
    const document = await loadOpenApiDocumentFromUrl(
      'https://example.com/schema',
      vi.fn(() =>
        Promise.resolve(
          new Response(`
openapi: 3.0.3
info:
  title: YAML API
paths: {}
`),
        ),
      ),
    );
    expect(document.info.title).toBe('YAML API');
  });

  it('rejects malformed YAML and duplicate keys with actionable errors', async () => {
    for (const content of ['paths: [', 'openapi: 3.0.3\nopenapi: 3.0.0']) {
      await expect(
        loadOpenApiDocumentFromUrl(
          'https://example.com/schema',
          vi.fn(() => Promise.resolve(new Response(content))),
        ),
      ).rejects.toThrow('Invalid JSON or YAML');
    }
  });

  it('preserves schema validation errors', async () => {
    await expect(
      loadOpenApiDocumentFromUrl(
        'https://example.com/schema',
        vi.fn(() => Promise.resolve(new Response('openapi: 2.0'))),
      ),
    ).rejects.toMatchObject({ code: 'SCHEMA_VALIDATION_ERROR' });
  });
  it('aborts a stalled schema download at the configured deadline', async () => {
    const fetchImplementation = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason as Error), {
            once: true,
          });
        }),
    );
    await expect(
      loadOpenApiDocument(
        { url: 'https://example.com/schema' },
        { fetchImplementation, timeoutMs: 20 },
      ),
    ).rejects.toThrow('Timed out loading OpenAPI schema after 20 milliseconds');
    expect(fetchImplementation.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('honors an already aborted caller signal before fetching', async () => {
    const fetchImplementation = vi.fn();
    await expect(
      loadOpenApiDocument(
        { url: 'https://example.com/schema' },
        { fetchImplementation, signal: AbortSignal.abort(new Error('cancelled')) },
      ),
    ).rejects.toMatchObject({ cause: { message: 'cancelled' } });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('rejects non-HTTP URLs and invalid timeouts without fetching', async () => {
    const fetchImplementation = vi.fn();
    await expect(
      loadOpenApiDocument({ url: 'file:///tmp/schema' }, { fetchImplementation }),
    ).rejects.toThrow('HTTP or HTTPS');
    for (const timeoutMs of [0, -1, NaN, Infinity, 2 ** 32]) {
      await expect(
        loadOpenApiDocument(
          { url: 'https://example.com/schema' },
          { fetchImplementation, timeoutMs },
        ),
      ).rejects.toThrow('Schema timeout');
    }
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
