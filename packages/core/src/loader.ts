import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument as parseYamlDocument } from 'yaml';

import { ApiSdkGeneratorError, SchemaLoadError } from './errors.js';
import type { Logger } from './logger.js';
import type { GenerateSdkInput, OpenApiDocument } from './types.js';
import { validateOpenApiDocument } from './validator.js';

export interface LoadSchemaOptions {
  fetchImplementation?: typeof fetch;
  logger?: Logger;
  signal?: AbortSignal;
  /** Maximum time for fetching a schema, including reading its body. */
  timeoutMs?: number;
}

function parseSchema(content: string): OpenApiDocument {
  // JSON is a YAML subset. Limit aliases and reject duplicate keys rather than
  // silently replacing definitions in an API contract.
  const parsed = parseYamlDocument(content, { uniqueKeys: true });
  if (parsed.errors.length > 0) {
    throw new SchemaLoadError(`Invalid JSON or YAML: ${parsed.errors[0].message}`);
  }
  const document = parsed.toJS({ maxAliasCount: 100 }) as unknown;
  rejectAliasCycles(document);
  return validateOpenApiDocument(document);
}

function rejectAliasCycles(
  value: unknown,
  active = new WeakSet<object>(),
  seen = new WeakSet<object>(),
): void {
  if (typeof value !== 'object' || value === null) return;
  if (active.has(value))
    throw new SchemaLoadError(
      'Cyclic YAML aliases are unsupported. Use OpenAPI $ref for recursive models.',
    );
  if (seen.has(value)) return;
  active.add(value);
  for (const child of Object.values(value)) rejectAliasCycles(child, active, seen);
  active.delete(value);
  seen.add(value);
}

export async function loadOpenApiDocument(
  input: GenerateSdkInput,
  options: LoadSchemaOptions = {},
): Promise<OpenApiDocument> {
  const sources = [input.file, input.url].filter(Boolean);

  if (sources.length !== 1) {
    throw new SchemaLoadError('Exactly one input source must be provided: either file or url.');
  }

  if (input.file) {
    return loadOpenApiDocumentFromFile(input.file, options.logger);
  }

  return loadOpenApiDocumentFromUrl(
    input.url!,
    options.fetchImplementation,
    options.logger,
    options,
  );
}

export async function loadOpenApiDocumentFromFile(
  filePath: string,
  logger?: Logger,
): Promise<OpenApiDocument> {
  try {
    logger?.debug(`Loading OpenAPI schema from file: ${filePath}`);
    const content = await readFile(filePath, 'utf8');
    return parseSchema(content);
  } catch (error) {
    if (error instanceof ApiSdkGeneratorError) {
      throw error;
    }

    throw new SchemaLoadError(
      `Failed to load OpenAPI schema from file "${path.resolve(filePath)}".`,
      error,
    );
  }
}

export async function loadOpenApiDocumentFromUrl(
  url: string,
  fetchImplementation?: typeof fetch,
  logger?: Logger,
  options: Pick<LoadSchemaOptions, 'signal' | 'timeoutMs'> = {},
): Promise<OpenApiDocument> {
  const runtimeFetch = fetchImplementation ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new SchemaLoadError(
      'Schema timeout must be a positive integer no greater than 2147483647 milliseconds.',
    );
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  if (!runtimeFetch) {
    throw new SchemaLoadError('Fetch API is not available in the current runtime.');
  }

  try {
    if (!['http:', 'https:'].includes(new URL(url).protocol)) {
      throw new SchemaLoadError('Schema URLs must use HTTP or HTTPS.');
    }
    signal.throwIfAborted();
    logger?.debug(`Loading OpenAPI schema from URL: ${url}`);
    const response = await runtimeFetch(url, { signal });

    if (!response.ok) {
      throw new SchemaLoadError(
        `Failed to fetch OpenAPI schema from "${url}". HTTP ${response.status}.`,
      );
    }

    return parseSchema(await response.text());
  } catch (error) {
    if (error instanceof ApiSdkGeneratorError) {
      throw error;
    }

    if (timeoutSignal.aborted && !options.signal?.aborted) {
      throw new SchemaLoadError(
        `Timed out loading OpenAPI schema after ${timeoutMs} milliseconds.`,
        error,
      );
    }

    throw new SchemaLoadError(`Failed to load OpenAPI schema from URL "${url}".`, error);
  }
}
