import { generateSdk } from '@minkinpackages/api-sdk-generator-core';

import { createCliLogger } from './logger.js';
import {
  normalizeGenerateCommandOptions,
  type GenerateCommandOptionsInput,
  type NormalizedGenerateCommandOptions,
} from './options.js';

export type { GenerateCommandOptionsInput, NormalizedGenerateCommandOptions } from './options.js';
export { CliUsageError } from './errors.js';
export { normalizeGenerateCommandOptions } from './options.js';

export async function runGenerateCommand(input: GenerateCommandOptionsInput): Promise<void> {
  const options = normalizeGenerateCommandOptions(input);
  await executeGenerateCommand(options);
}

export async function executeGenerateCommand(
  options: NormalizedGenerateCommandOptions,
): Promise<void> {
  const logger = createCliLogger(options.verbose);
  logger.info('Starting SDK generation');

  const result = await generateSdk({
    baseUrl: options.baseUrl,
    clean: options.clean,
    input: options.input,
    logger,
    outputDir: options.outputDir,
    sdkName: options.sdkName,
  });

  logger.info(
    `Generated ${result.files.length} files for ${result.operations} operations in ${result.outputDir}`,
  );
}
