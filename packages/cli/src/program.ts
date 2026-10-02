import { Command } from 'commander';

import packageMetadata from '../package.json' with { type: 'json' };
import { runGenerateCommand } from './index.js';

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name('api-sdk-generator')
    .description('Generate a TypeScript fetch SDK from an OpenAPI 3.x schema.')
    .showHelpAfterError()
    .version(packageMetadata.version);

  program
    .command('generate')
    .description('Generate SDK files from an OpenAPI schema URL or local file')
    .option('--url <url>', 'OpenAPI schema URL')
    .option('--timeout <ms>', 'Schema download timeout in milliseconds', '30000')
    .option('--file <path>', 'Local path to an OpenAPI schema JSON or YAML file')
    .requiredOption('--output <path>', 'Output directory for the generated SDK')
    .option('--name <sdkName>', 'Override the generated SDK name')
    .option('--base-url <baseUrl>', 'Override the generated client base URL')
    .option('--clean', 'Delete the output directory before writing files')
    .option('--dry-run', 'Validate and preview generation without writing files')
    .option(
      '--check',
      'Check for outdated generated files without writing (exit code 2 on changes)',
    )
    .option('--verbose', 'Enable verbose logs')
    .action(runGenerateCommand);

  return program;
}
