import type { Logger } from '@minkinpackages/api-sdk-generator-core';
import pc from 'picocolors';

export function createCliLogger(verbose = false): Logger {
  return {
    debug(message: string): void {
      if (verbose) {
        console.info(pc.dim(`[debug] ${message}`));
      }
    },
    error(message: string): void {
      console.error(pc.red(`[error] ${message}`));
    },
    info(message: string): void {
      console.info(pc.cyan(`[api-sdk-generator] ${message}`));
    },
    warn(message: string): void {
      console.warn(pc.yellow(`[warn] ${message}`));
    },
  };
}
