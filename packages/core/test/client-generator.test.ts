import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

import fixture from './fixtures/sample-openapi.json';
import { generateClientSource } from '../src/generator/client-generator.js';
import { parseDocument } from '../src/parser.js';
import { validateOpenApiDocument } from '../src/validator.js';

interface GeneratedClientModule {
  createClient(config: { baseUrl?: string; fetch?: typeof fetch; headers?: HeadersInit }): unknown;
}

async function importGeneratedClient(source: string): Promise<GeneratedClientModule> {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;

  return (await import(moduleUrl)) as GeneratedClientModule;
}

describe('client generator', () => {
  it('renders a fetch-based typed client', () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateClientSource(parsed);

    expect(source).toContain('export function createClient');
    expect(source).toContain(
      'async getUserById(request, init?: RequestInit): Promise<GetUserByIdResponse>',
    );
    expect(source).toContain('searchParams.set("page", String(request.page));');
    expect(source).toContain('headers.set("content-type", "application/json");');
  });

  it('preserves base URL paths when resolving operation paths', async () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateClientSource(parsed);
    const generatedModule = await importGeneratedClient(source);
    const requestedUrls: string[] = [];
    const fetchImplementation = vi.fn((input: string | URL | Request) => {
      requestedUrls.push(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      );
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as typeof fetch;
    const client = generatedModule.createClient({
      baseUrl: 'https://example.com/api/v1',
      fetch: fetchImplementation,
    }) as {
      getUserById(request: { id: string }): Promise<void>;
    };

    await client.getUserById({ id: 'user/123' });

    expect(requestedUrls).toEqual(['https://example.com/api/v1/users/user%2F123']);
  });

  it('uses the declared vendor JSON content type and parses empty JSON responses', async () => {
    const vendorFixture = structuredClone(fixture);
    const createUser = vendorFixture.paths['/users'].post;
    const requestContent = createUser.requestBody.content as Record<
      string,
      { schema: { $ref: string } }
    >;
    requestContent['application/vnd.api+json'] = requestContent['application/json'];
    delete requestContent['application/json'];
    const parsed = parseDocument(validateOpenApiDocument(vendorFixture));
    const source = generateClientSource(parsed);
    const generatedModule = await importGeneratedClient(source);
    const requests: RequestInit[] = [];
    const fetchImplementation = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      requests.push(init ?? {});
      return Promise.resolve(
        new Response('', {
          headers: { 'content-type': 'Application/Vnd.Api+Json; charset=utf-8' },
          status: 200,
        }),
      );
    }) as typeof fetch;
    const client = generatedModule.createClient({ fetch: fetchImplementation }) as {
      createUser(request: { body: { email: string } }): Promise<unknown>;
    };

    const response = await client.createUser({ body: { email: 'user@example.com' } });
    const headers = new Headers(requests[0].headers);

    expect(headers.get('content-type')).toBe('application/vnd.api+json');
    expect(response).toBeUndefined();
  });

  it('treats vendor JSON response content types as JSON', () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateClientSource(parsed);

    expect(source).toContain(
      'return mediaType === "application/json" || mediaType.endsWith("+json");',
    );
  });
});
