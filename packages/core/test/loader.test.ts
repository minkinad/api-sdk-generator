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
});
