import path from 'node:path';

import { CliUsageError } from './errors.js';

export interface GenerateCommandOptionsInput {
  timeout?: string;
  baseUrl?: string;
  clean?: boolean;
  check?: boolean;
  dryRun?: boolean;
  file?: string;
  name?: string;
  output?: string;
  url?: string;
  verbose?: boolean;
}

export interface NormalizedGenerateCommandOptions {
  schemaTimeoutMs: number;
  baseUrl?: string;
  clean: boolean;
  check: boolean;
  dryRun: boolean;
  input: {
    file?: string;
    url?: string;
  };
  outputDir: string;
  sdkName?: string;
  verbose: boolean;
}

export function normalizeGenerateCommandOptions(
  options: GenerateCommandOptionsInput,
): NormalizedGenerateCommandOptions {
  const workingDirectory = process.env.INIT_CWD ?? process.cwd();
  const schemaTimeoutMs = Number(options.timeout ?? 30_000);
  if (
    !Number.isSafeInteger(schemaTimeoutMs) ||
    schemaTimeoutMs <= 0 ||
    schemaTimeoutMs > 2_147_483_647
  ) {
    throw new CliUsageError(
      'The --timeout option must be a positive integer no greater than 2147483647 milliseconds.',
    );
  }

  if (options.check && options.dryRun) {
    throw new CliUsageError('Use either --check or --dry-run, not both.');
  }

  if (!options.output) {
    throw new CliUsageError('The --output option is required.');
  }

  const hasFile = typeof options.file === 'string' && options.file.length > 0;
  const hasUrl = typeof options.url === 'string' && options.url.length > 0;

  if (hasFile === hasUrl) {
    throw new CliUsageError('Provide exactly one input source: either --file or --url.');
  }

  if (options.url) {
    try {
      if (!['http:', 'https:'].includes(new URL(options.url).protocol)) throw new Error();
    } catch {
      throw new CliUsageError(`Invalid --url value: "${options.url}".`);
    }
  }

  if (options.baseUrl) {
    try {
      if (!['http:', 'https:'].includes(new URL(options.baseUrl).protocol)) throw new Error();
    } catch {
      throw new CliUsageError(`Invalid --base-url value: "${options.baseUrl}".`);
    }
  }

  return {
    schemaTimeoutMs,
    baseUrl: options.baseUrl,
    clean: options.clean ?? false,
    check: options.check ?? false,
    dryRun: options.dryRun ?? false,
    input: {
      file: options.file ? path.resolve(workingDirectory, options.file) : undefined,
      url: options.url,
    },
    outputDir: path.resolve(workingDirectory, options.output),
    sdkName: options.name,
    verbose: options.verbose ?? false,
  };
}
