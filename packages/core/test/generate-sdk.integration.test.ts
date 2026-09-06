import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-openapi.json';
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
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
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
    expect(indexSource).toContain("export * from './client.js';");
    expect(diagnostics).toEqual([]);
  }, 60000);
  it('previews without creating output, then detects missing and changed files without writing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-preview-'));
    tempDirectories.push(root);
    const outputDir = path.join(root, 'generated');
    const options = { input: { file: fixturePath }, outputDir };
    const preview = await generateSdk({ ...options, dryRun: true, clean: true });
    expect(preview.files).toHaveLength(4);
    await expect(access(outputDir)).rejects.toThrow();
    const missing = await generateSdk({ ...options, check: true });
    expect(missing.changedFiles).toHaveLength(4);
    await expect(access(outputDir)).rejects.toThrow();
    await generateSdk(options);
    expect((await generateSdk({ ...options, check: true })).changedFiles).toEqual([]);
    await writeFile(path.join(outputDir, 'client.ts'), 'outdated');
    await writeFile(path.join(outputDir, 'notes.txt'), 'keep');
    expect((await generateSdk({ ...options, check: true, clean: true })).changedFiles).toEqual([
      'client.ts',
    ]);
    expect(await readFile(path.join(outputDir, 'client.ts'), 'utf8')).toBe('outdated');
    expect(await readFile(path.join(outputDir, 'notes.txt'), 'utf8')).toBe('keep');
  });

  it('compiles dictionaries, nullable objects, compositions, recursive refs and unusual parameter names', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-types-'));
    tempDirectories.push(root);
    const document = structuredClone(fixture) as Record<string, unknown>;
    document.components = {
      schemas: {
        Empty: { type: 'object' },
        Dictionary: { type: 'object', additionalProperties: { type: 'string' } },
        Closed: { type: 'object', additionalProperties: false },
        Nullable: { type: 'object', nullable: true, properties: { id: { type: 'string' } } },
        Composite: {
          allOf: [{ oneOf: [{ type: 'string' }, { type: 'number' }] }, { type: 'string' }],
        },
        Choice: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
        Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } },
      },
    };
    document.paths = {
      '/users/{user-id}': {
        get: {
          operationId: 'getUser',
          parameters: [
            { in: 'path', name: 'user-id', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'tag-name', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Result',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Nullable' } },
              },
            },
          },
        },
      },
    };
    const schemaPath = path.join(root, 'schema.json');
    await writeFile(schemaPath, JSON.stringify(document));
    const outputDir = path.join(root, 'generated');
    await generateSdk({ input: { file: schemaPath }, outputDir });
    await writeFile(path.join(outputDir, 'package.json'), '{"type":"module"}');
    await writeFile(
      path.join(outputDir, 'consumer.ts'),
      `
import type { Dictionary, Nullable, Composite, Choice } from './types.js';
const dictionary: Dictionary = { hello: 'world' };
const nullable: Nullable = null;
const composite: Composite = 'value';
const choice: Choice = true;
// @ts-expect-error allOf must preserve the union grouping
const invalid: Composite = 123;
void [dictionary, nullable, composite, choice, invalid];
`,
    );
    expect(await compileGeneratedFiles(outputDir)).toEqual([]);
  }, 60000);

  it('refuses to clean a directory containing the input schema', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-clean-'));
    tempDirectories.push(root);
    const file = path.join(root, 'schema.json');
    await writeFile(file, JSON.stringify(fixture));
    await expect(generateSdk({ input: { file }, outputDir: root, clean: true })).rejects.toThrow(
      'containing the input schema',
    );
    expect(await readFile(file, 'utf8')).toBe(JSON.stringify(fixture));
  });

  it.each([{}, { '/health': { head: { responses: { '204': { description: 'Healthy' } } } } }])(
    'compiles minimal clients with unused-code checks',
    async (paths) => {
      const root = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-minimal-'));
      tempDirectories.push(root);
      const file = path.join(root, 'schema.json');
      await writeFile(file, JSON.stringify({ openapi: '3.0.3', info: { title: 'Health' }, paths }));
      const outputDir = path.join(root, 'generated');
      await generateSdk({ input: { file }, outputDir });
      expect(await compileGeneratedFiles(outputDir)).toEqual([]);
    },
    60000,
  );
});
