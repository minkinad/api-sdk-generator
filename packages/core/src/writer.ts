import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { OutputWriteError } from './errors.js';
import { canonicalPath, isWithinDirectory } from './paths.js';
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

    if (!relativePath || !isWithinDirectory(outputRoot, fullPath)) {
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

async function rejectSymlink(target: string): Promise<void> {
  try {
    if ((await lstat(target)).isSymbolicLink()) {
      throw new OutputWriteError(`Refusing to write through symbolic link "${target}".`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function validateOutputPaths(
  outputDir: string,
  files: ResolvedGeneratedFile[],
): Promise<void> {
  const root = path.resolve(outputDir);
  await rejectSymlink(root);
  for (const file of files) {
    let current = root;
    for (const segment of path.relative(root, file.fullPath).split(path.sep)) {
      current = path.join(current, segment);
      await rejectSymlink(current);
    }
  }
}

async function writeFileAtomically(file: ResolvedGeneratedFile): Promise<void> {
  await mkdir(path.dirname(file.fullPath), { recursive: true });
  const temporaryPath = `${file.fullPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, file.content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, file.fullPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function writeGeneratedFiles(
  outputDir: string,
  files: GeneratedFile[],
  clean = false,
): Promise<void> {
  try {
    const resolvedFiles = resolveGeneratedFiles(outputDir, files);
    await validateOutputPaths(outputDir, resolvedFiles);

    if (clean) {
      const outputRoot = await canonicalPath(outputDir);
      if (
        outputRoot === (await canonicalPath(os.homedir())) ||
        isWithinDirectory(outputRoot, await canonicalPath(process.cwd()))
      ) {
        throw new OutputWriteError(
          'Refusing to clean the home directory, working directory, or its ancestors.',
        );
      }
      await rm(outputDir, { force: true, recursive: true });
    }

    await mkdir(outputDir, { recursive: true });

    await Promise.all(resolvedFiles.map(writeFileAtomically));
  } catch (error) {
    if (error instanceof OutputWriteError) {
      throw error;
    }

    throw new OutputWriteError(`Failed to write generated SDK to "${outputDir}".`, error);
  }
}

/** Compare only generated files; unrelated files are left alone. */
export async function compareGeneratedFiles(
  outputDir: string,
  files: GeneratedFile[],
): Promise<string[]> {
  const changedFiles: string[] = [];
  const resolvedFiles = resolveGeneratedFiles(outputDir, files);
  await validateOutputPaths(outputDir, resolvedFiles);
  for (const file of resolvedFiles) {
    try {
      if ((await readFile(file.fullPath, 'utf8')) !== file.content) {
        changedFiles.push(file.path);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        changedFiles.push(file.path);
      } else {
        throw new OutputWriteError(`Failed to compare generated file "${file.fullPath}".`, error);
      }
    }
  }
  return changedFiles;
}
