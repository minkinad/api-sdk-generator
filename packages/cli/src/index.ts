import { generateSdk } from '@minkinad/api-sdk-generator-core';

import { CliUsageError } from './errors.js';
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
    check: options.check,
    dryRun: options.dryRun,
    input: options.input,
    logger,
    outputDir: options.outputDir,
    sdkName: options.sdkName,
    schemaTimeoutMs: options.schemaTimeoutMs,
  });

  if (options.check) {
    if (result.changedFiles.length > 0) {
      throw new CliUsageError(`Generated SDK is out of date: ${result.changedFiles.join(', ')}`, 2);
    }
    logger.info('Generated SDK is up to date');
    return;
  }
  if (options.dryRun) {
    logger.info(
      `Would generate ${result.files.length} files for ${result.operations} operations: ${result.files.map((file) => file.path).join(', ')}`,
    );
    return;
  }
  logger.info(
    `Generated ${result.files.length} files for ${result.operations} operations in ${result.outputDir}`,
  );
}
