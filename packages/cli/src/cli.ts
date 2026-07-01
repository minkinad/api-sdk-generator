import { ApiSdkGeneratorError } from '@minkinad/api-sdk-generator-core';
import { Command } from 'commander';
import pc from 'picocolors';

import { CliUsageError } from './errors.js';
import { runGenerateCommand } from './index.js';

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('api-sdk-generator')
    .description('Generate a TypeScript fetch SDK from an OpenAPI 3.x schema.')
    .showHelpAfterError()
    .version('0.1.0');

  program
    .command('generate')
    .description('Generate SDK files from an OpenAPI schema URL or local file')
    .option('--url <url>', 'OpenAPI schema URL')
    .option('--file <path>', 'Local path to an OpenAPI schema JSON file')
    .requiredOption('--output <path>', 'Output directory for the generated SDK')
    .option('--name <sdkName>', 'Override the generated SDK name')
    .option('--base-url <baseUrl>', 'Override the generated client base URL')
    .option('--clean', 'Delete the output directory before writing files')
    .option('--verbose', 'Enable verbose logs')
    .action(async (options) => {
      await runGenerateCommand(options);
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(pc.red(error.message));
      process.exitCode = error.exitCode;
      return;
    }

    if (error instanceof ApiSdkGeneratorError) {
      console.error(pc.red(`${error.code}: ${error.message}`));
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      console.error(pc.red(error.message));
      process.exitCode = 1;
      return;
    }

    console.error(pc.red('Unknown error during CLI execution.'));
    process.exitCode = 1;
  }
}

void main();
