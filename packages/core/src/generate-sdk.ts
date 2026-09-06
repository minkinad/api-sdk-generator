import path from 'node:path';

import { OutputWriteError } from './errors.js';
import { formatGeneratedFiles } from './formatter.js';
import { generateClientSource } from './generator/client-generator.js';
import { generateIndexSource } from './generator/index-generator.js';
import { generateGeneratedReadme } from './generator/readme-generator.js';
import { generateTypesSource } from './generator/type-generator.js';
import { loadOpenApiDocument } from './loader.js';
import { noopLogger } from './logger.js';
import { parseDocument } from './parser.js';
import type { GenerateSdkOptions, GenerateSdkResult } from './types.js';
import { compareGeneratedFiles, writeGeneratedFiles } from './writer.js';

export async function generateSdk(options: GenerateSdkOptions): Promise<GenerateSdkResult> {
  const logger = options.logger ?? noopLogger;

  if (options.check && options.dryRun) {
    throw new OutputWriteError('The check and dryRun options cannot be combined.');
  }
  if (options.clean && !options.check && !options.dryRun && options.input.file) {
    const relative = path.relative(
      path.resolve(options.outputDir),
      path.resolve(options.input.file),
    );
    if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
      throw new OutputWriteError('Cannot clean an output directory containing the input schema.');
    }
  }

  logger.info('Loading OpenAPI document');
  const document = await loadOpenApiDocument(options.input, {
    fetchImplementation: options.fetchImplementation,
    logger,
  });

  logger.info('Parsing OpenAPI document');
  const parsed = parseDocument(document, {
    baseUrl: options.baseUrl,
    sdkName: options.sdkName,
  });

  logger.info(`Generating SDK for ${parsed.operations.length} operations`);
  const files = await formatGeneratedFiles([
    {
      content: generateTypesSource(parsed),
      path: 'types.ts',
    },
    {
      content: generateClientSource(parsed),
      path: 'client.ts',
    },
    {
      content: generateIndexSource(),
      path: 'index.ts',
    },
    {
      content: generateGeneratedReadme(parsed),
      path: 'README.md',
    },
  ]);

  const changedFiles = options.check ? await compareGeneratedFiles(options.outputDir, files) : [];
  if (!options.check && !options.dryRun) {
    logger.info(`Writing SDK to ${options.outputDir}`);
    await writeGeneratedFiles(options.outputDir, files, options.clean);
  }

  return {
    changedFiles,
    files,
    operations: parsed.operations.length,
    outputDir: options.outputDir,
    sdkName: parsed.sdkName,
  };
}
