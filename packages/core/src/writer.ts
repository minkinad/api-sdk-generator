import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { OutputWriteError } from './errors.js';
import type { GeneratedFile } from './types.js';

interface ResolvedGeneratedFile extends GeneratedFile {
  fullPath: string;
}

function resolveGeneratedFiles(outputDir: string, files: GeneratedFile[]): ResolvedGeneratedFile[] {
  const outputRoot = path.resolve(outputDir);
  const seenPaths = new Set<string>();

  return files.map((file) => {
    const fullPath = path.resolve(outputRoot, file.path);
    const relativePath = path.relative(outputRoot, fullPath);

    if (
      !relativePath ||
      relativePath === '..' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new OutputWriteError(
        `Generated file path "${file.path}" must stay within the output directory.`,
      );
    }

    if (seenPaths.has(fullPath)) {
      throw new OutputWriteError(`Duplicate generated file path "${file.path}".`);
    }

    seenPaths.add(fullPath);
    return { ...file, fullPath };
  });
}

export async function writeGeneratedFiles(
  outputDir: string,
  files: GeneratedFile[],
  clean = false,
): Promise<void> {
  try {
    const resolvedFiles = resolveGeneratedFiles(outputDir, files);

    if (clean) {
      await rm(outputDir, { force: true, recursive: true });
    }

    await mkdir(outputDir, { recursive: true });

    await Promise.all(
      resolvedFiles.map(async (file) => {
        await mkdir(path.dirname(file.fullPath), { recursive: true });
        await writeFile(file.fullPath, file.content, 'utf8');
      }),
    );
  } catch (error) {
    if (error instanceof OutputWriteError) {
      throw error;
    }

    throw new OutputWriteError(`Failed to write generated SDK to "${outputDir}".`, error);
  }
}
