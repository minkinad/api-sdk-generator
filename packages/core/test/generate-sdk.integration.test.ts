import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { generateSdk } from '../src/generate-sdk.js';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/sample-openapi.json');
const tempDirectories: string[] = [];

async function compileGeneratedFiles(outputDir: string): Promise<readonly ts.Diagnostic[]> {
  const files = (await readdir(outputDir))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(outputDir, file));
  const compilerOptions: ts.CompilerOptions = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram(files, compilerOptions, host);

  return ts.getPreEmitDiagnostics(program);
}

describe('generateSdk', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('generates files and TypeScript compiles', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-generator-'));
    tempDirectories.push(outputDir);

    const result = await generateSdk({
      clean: true,
      input: {
        file: fixturePath,
      },
      outputDir,
    });

    const files = await readdir(outputDir);
    const indexSource = await readFile(path.join(outputDir, 'index.ts'), 'utf8');
    const diagnostics = await compileGeneratedFiles(outputDir);

    expect(result.operations).toBe(4);
    expect(files).toEqual(
      expect.arrayContaining(['README.md', 'client.ts', 'index.ts', 'types.ts']),
    );
    expect(indexSource).toContain('export * from "./client";');
    expect(diagnostics).toEqual([]);
  }, 60000);
});
