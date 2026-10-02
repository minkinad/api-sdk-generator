import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCliProgram } from '../src/program.js';

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generate command', () => {
  it('runs YAML generation, preview and drift checks through Commander', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const root = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-cli-'));
    roots.push(root);
    const schema = path.join(root, 'schema.yaml');
    const output = path.join(root, 'generated');
    await writeFile(schema, 'openapi: 3.0.3\ninfo:\n  title: Test\npaths: {}\n');
    const args = ['generate', '--file', schema, '--output', output];
    const run = (extra: string[] = []) =>
      createCliProgram()
        .exitOverride()
        .parseAsync([...args, ...extra], { from: 'user' });
    await run(['--dry-run']);
    await expect(access(output)).rejects.toThrow();
    await expect(run(['--check'])).rejects.toMatchObject({ exitCode: 2 });
    await run();
    await run(['--check']);
    await writeFile(path.join(output, 'client.ts'), 'edited');
    await expect(run(['--check', '--clean'])).rejects.toMatchObject({ exitCode: 2 });
    expect(await readFile(path.join(output, 'client.ts'), 'utf8')).toBe('edited');
  });
});
