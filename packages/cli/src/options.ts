import path from 'node:path';

import { CliUsageError } from './errors.js';

export interface GenerateCommandOptionsInput {
  baseUrl?: string;
  clean?: boolean;
  file?: string;
  name?: string;
  output?: string;
  url?: string;
  verbose?: boolean;
}

export interface NormalizedGenerateCommandOptions {
  baseUrl?: string;
  clean: boolean;
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
      new URL(options.url);
    } catch {
      throw new CliUsageError(`Invalid --url value: "${options.url}".`);
    }
  }

  if (options.baseUrl) {
    try {
      new URL(options.baseUrl);
    } catch {
      throw new CliUsageError(`Invalid --base-url value: "${options.baseUrl}".`);
    }
  }

  return {
    baseUrl: options.baseUrl,
    clean: options.clean ?? false,
    input: {
      file: options.file ? path.resolve(workingDirectory, options.file) : undefined,
      url: options.url,
    },
    outputDir: path.resolve(workingDirectory, options.output),
    sdkName: options.name,
    verbose: options.verbose ?? false,
  };
}
