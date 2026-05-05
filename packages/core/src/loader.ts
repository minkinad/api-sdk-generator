import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { SchemaLoadError } from './errors.js';
import type { Logger } from './logger.js';
import type { GenerateSdkInput, OpenApiDocument } from './types.js';
import { validateOpenApiDocument } from './validator.js';

export interface LoadSchemaOptions {
  fetchImplementation?: typeof fetch;
  logger?: Logger;
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
    const document = JSON.parse(content) as unknown;
    return validateOpenApiDocument(document);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SchemaLoadError(
        `Failed to parse JSON from file "${path.resolve(filePath)}".`,
        error,
      );
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

    const document = (await response.json()) as unknown;
    return validateOpenApiDocument(document);
  } catch (error) {
    if (error instanceof SchemaLoadError) {
      throw error;
    }

    throw new SchemaLoadError(`Failed to load OpenAPI schema from URL "${url}".`, error);
  }
}
