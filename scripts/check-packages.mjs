import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { packPackages, registry, root, run } from './packages.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-package-check-'));
try {
  const packages = await packPackages(directory);
  for (const pkg of packages) {
    const packed = JSON.parse(run('tar', ['-xOf', pkg.archive, 'package/package.json']));
    assert.equal(packed.private, undefined, `${pkg.name} must be public`);
    assert.equal(packed.publishConfig.access, 'public');
    assert.equal(packed.license, 'MIT');
    assert.ok(packed.repository.url.includes('minkinad/api-sdk-generator'));
    for (const version of Object.values(packed.dependencies ?? {})) {
      assert.ok(!version.startsWith('workspace:'), 'Unresolved workspace dependency');
    }
    const files = run('tar', ['-tf', pkg.archive]).split('\n');
    for (const required of [
      'README.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.cjs',
      'dist/index.d.ts',
      'dist/index.d.cts',
    ]) {
      assert.ok(files.includes(`package/${required}`), `${pkg.name} is missing ${required}`);
    }
    assert.ok(!files.some((file) => /package\/(?:src|test|node_modules)\//.test(file)));
  }
  await writeFile(path.join(directory, 'package.json'), '{"private":true,"type":"module"}\n');
  // Both archives are installed together, so unpublished core versions resolve locally.
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--registry',
      registry,
      ...packages.map((pkg) => pkg.archive),
    ],
    { cwd: directory },
  );
  run(
    'node',
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    for (const [name, entry] of [
      ['@minkinad/api-sdk-generator-core', 'generateSdk'],
      ['api-sdk-generator', 'runGenerateCommand'],
    ]) {
      assert.equal(typeof (await import(name))[entry], 'function');
      assert.equal(typeof require(name)[entry], 'function');
    }
  `,
    ],
    { cwd: directory },
  );
  const cli = path.join(directory, 'node_modules', '.bin', 'api-sdk-generator');
  const args = [
    'generate',
    '--file',
    path.join(root, 'apps/demo/openapi.json'),
    '--output',
    path.join(directory, 'generated'),
  ];
  run(cli, args, { cwd: directory });
  run(cli, [...args, '--check'], { cwd: directory });
  await writeFile(path.join(directory, 'generated/client.ts'), 'outdated');
  assert.throws(
    () => run(cli, [...args, '--check'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] }),
    (error) => error.status === 2,
  );
  run(cli, [...args, '--dry-run', '--clean'], { cwd: directory });
  assert.equal(await readFile(path.join(directory, 'generated/client.ts'), 'utf8'), 'outdated');
  console.log(
    'Package checks passed: archive contents, dependencies, ESM/CJS imports, CLI generation and --check.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
