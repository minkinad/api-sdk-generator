import { describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-openapi.json';
import { generateClientSource } from '../src/generator/client-generator.js';
import { parseDocument } from '../src/parser.js';
import { validateOpenApiDocument } from '../src/validator.js';

describe('client generator', () => {
  it('renders a fetch-based typed client', () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateClientSource(parsed);

    expect(source).toContain('export function createClient');
    expect(source).toContain(
      'async getUserById(request, init?: RequestInit): Promise<GetUserByIdResponse>',
    );
    expect(source).toContain('searchParams.set("page", String(request.page));');
    expect(source).toContain("headers.set('content-type', 'application/json');");
  });

  it('treats vendor JSON response content types as JSON', () => {
    const parsed = parseDocument(validateOpenApiDocument(fixture));
    const source = generateClientSource(parsed);

    expect(source).toContain('const body = isJsonContentType(contentType) ? await response.json() : await response.text();');
    expect(source).toContain('if (isJsonContentType(contentType)) {');
    expect(source).toContain(
      'return contentType.includes("application/json") || contentType.includes("+json");',
    );
  });
});
