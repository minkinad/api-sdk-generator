import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { writeGeneratedFiles } from '../src/writer.js';

const tempDirectories: string[] = [];

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-generator-writer-'));
  tempDirectories.push(directory);
  return directory;
}

describe('writeGeneratedFiles', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('writes nested generated files inside the output directory', async () => {
    const root = await createTempDirectory();
    const outputDir = path.join(root, 'generated');

    await writeGeneratedFiles(outputDir, [{ content: 'export {};\n', path: 'src/index.ts' }]);

    await expect(readFile(path.join(outputDir, 'src/index.ts'), 'utf8')).resolves.toBe(
      'export {};\n',
    );
  });

  it('rejects paths that escape the output directory before cleaning it', async () => {
    const root = await createTempDirectory();
    const outputDir = path.join(root, 'generated');
    const existingFile = path.join(outputDir, 'existing.ts');
    await writeGeneratedFiles(outputDir, [{ content: 'keep me', path: 'existing.ts' }]);

    await expect(
      writeGeneratedFiles(outputDir, [{ content: 'escaped', path: '../escaped.ts' }], true),
    ).rejects.toMatchObject({
      code: 'OUTPUT_WRITE_ERROR',
      message: 'Generated file path "../escaped.ts" must stay within the output directory.',
    });
    await expect(readFile(existingFile, 'utf8')).resolves.toBe('keep me');
    await expect(access(path.join(root, 'escaped.ts'))).rejects.toThrow();
  });

  it('rejects duplicate normalized paths', async () => {
    const root = await createTempDirectory();

    await expect(
      writeGeneratedFiles(root, [
        { content: 'first', path: 'src/index.ts' },
        { content: 'second', path: 'src/../src/index.ts' },
      ]),
    ).rejects.toThrow('Duplicate generated file path');
  });
});
