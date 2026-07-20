import { ApiSdkGeneratorError } from '@minkinad/api-sdk-generator-core';
import pc from 'picocolors';

import { CliUsageError } from './errors.js';
import { createCliProgram } from './program.js';

async function main(): Promise<void> {
  const program = createCliProgram();

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
