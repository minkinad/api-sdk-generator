import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { OutputWriteError } from './errors.js';
import type { GeneratedFile } from './types.js';

export async function writeGeneratedFiles(
  outputDir: string,
  files: GeneratedFile[],
  clean = false,
): Promise<void> {
  try {
    if (clean) {
      await rm(outputDir, { force: true, recursive: true });
    }

    await mkdir(outputDir, { recursive: true });

    await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(outputDir, file.path);
        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, file.content, 'utf8');
      }),
    );
  } catch (error) {
    throw new OutputWriteError(`Failed to write generated SDK to "${outputDir}".`, error);
  }
}
