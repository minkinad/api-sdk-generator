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
}

function parseSchema(content: string): OpenApiDocument {
  // JSON is a YAML subset. Limit aliases and reject duplicate keys rather than
  // silently replacing definitions in an API contract.
  const parsed = parseYamlDocument(content, { uniqueKeys: true });
  if (parsed.errors.length > 0) {
    throw new SchemaLoadError(`Invalid JSON or YAML: ${parsed.errors[0].message}`);
  }
  return validateOpenApiDocument(parsed.toJS({ maxAliasCount: 100 }) as unknown);
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

  return loadOpenApiDocumentFromUrl(input.url!, options.fetchImplementation, options.logger);
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
): Promise<OpenApiDocument> {
  const runtimeFetch = fetchImplementation ?? globalThis.fetch;

  if (!runtimeFetch) {
    throw new SchemaLoadError('Fetch API is not available in the current runtime.');
  }

  try {
    logger?.debug(`Loading OpenAPI schema from URL: ${url}`);
    const response = await runtimeFetch(url);

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

    throw new SchemaLoadError(`Failed to load OpenAPI schema from URL "${url}".`, error);
  }
}
