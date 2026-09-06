import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { writeGeneratedFiles } from '../src/writer.js';

const tempDirectories: string[] = [];

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-generator-writer-'));
  tempDirectories.push(directory);
  return directory;
}

describe('writeGeneratedFiles', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
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
  it('rejects nested symlinks without touching files outside output', async () => {
    const root = await createTempDirectory();
    const output = path.join(root, 'generated');
    const outside = path.join(root, 'outside');
    await mkdir(output);
    await mkdir(outside);
    await writeFile(path.join(outside, 'keep.ts'), 'keep');
    await symlink(outside, path.join(output, 'linked'), 'dir');
    await expect(
      writeGeneratedFiles(output, [{ path: 'linked/keep.ts', content: 'overwrite' }]),
    ).rejects.toThrow('symbolic link');
    expect(await readFile(path.join(outside, 'keep.ts'), 'utf8')).toBe('keep');
  });

  it('rejects a symbolic output root even when clean is requested', async () => {
    const root = await createTempDirectory();
    const target = path.join(root, 'target');
    await mkdir(target);
    await writeFile(path.join(target, 'keep.ts'), 'keep');
    const output = path.join(root, 'linked');
    await symlink(target, output, 'dir');
    await expect(
      writeGeneratedFiles(output, [{ path: 'index.ts', content: 'new' }], true),
    ).rejects.toThrow('symbolic link');
    expect(await readFile(path.join(target, 'keep.ts'), 'utf8')).toBe('keep');
  });

  it('recognizes the working directory through a symlink in a parent path', async () => {
    const root = await createTempDirectory();
    const actual = path.join(root, 'actual');
    const work = path.join(actual, 'work');
    await mkdir(work, { recursive: true });
    await writeFile(path.join(work, 'keep'), 'keep');
    await symlink(actual, path.join(root, 'alias'), 'dir');
    vi.spyOn(process, 'cwd').mockReturnValue(work);
    await expect(
      writeGeneratedFiles(
        path.join(root, 'alias/work'),
        [{ path: 'index.ts', content: 'new' }],
        true,
      ),
    ).rejects.toThrow('working directory');
    expect(await readFile(path.join(work, 'keep'), 'utf8')).toBe('keep');
  });

  it('replaces complete file contents without leaving temporary files', async () => {
    const root = await createTempDirectory();
    await writeGeneratedFiles(root, [{ path: 'index.ts', content: 'old' }]);
    await writeGeneratedFiles(root, [{ path: 'index.ts', content: 'new' }]);
    expect(await readFile(path.join(root, 'index.ts'), 'utf8')).toBe('new');
    expect(await readdir(root)).toEqual(['index.ts']);
  });
});
