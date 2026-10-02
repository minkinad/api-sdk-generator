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
    assert.equal(packed.engines.node, '>=20.19.0');
    assert.ok(packed.repository.url.includes('minkinad/api-sdk-generator'));
    assert.equal(packed.publishConfig.registry, registry);
    assert.equal(packed.exports['.'].import.default, './dist/index.js');
    assert.equal(packed.exports['.'].require.default, './dist/index.cjs');
    assert.equal(packed.exports['.'].import.types, './dist/index.d.ts');
    assert.equal(packed.exports['.'].require.types, './dist/index.d.cts');
    for (const version of Object.values(packed.dependencies ?? {})) {
      assert.ok(!version.startsWith('workspace:'), 'Unresolved workspace dependency');
    }
    const files = run('tar', ['-tf', pkg.archive]).split('\n');
    for (const required of [
      'package.json',
      'README.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.cjs',
      'dist/index.d.ts',
      'dist/index.d.cts',
    ]) {
      assert.ok(files.includes(`package/${required}`), `${pkg.name} is missing ${required}`);
    }
    assert.ok(
      !files.some((file) =>
        /package\/(?:src|test|coverage|node_modules|fixtures|tmp)\//.test(file),
      ),
    );
    if (pkg.name === 'api-sdk-generator') {
      assert.equal(packed.bin['api-sdk-generator'], 'dist/cli.cjs');
      assert.ok(files.includes('package/dist/cli.cjs'));
      assert.equal(
        packed.dependencies['@minkinad/api-sdk-generator-core'],
        packages.find((candidate) => candidate.name === '@minkinad/api-sdk-generator-core').version,
      );
    }
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
  assert.match(run(cli, ['--help'], { cwd: directory }), /Usage: api-sdk-generator/);
  assert.equal(
    run(cli, ['--version'], { cwd: directory }).trim(),
    packages.find((pkg) => pkg.name === 'api-sdk-generator').version,
  );
  const args = [
    'generate',
    '--file',
    path.join(root, 'apps/demo/openapi.json'),
    '--output',
    path.join(directory, 'generated'),
  ];
  run(cli, args, { cwd: directory });
  const consumer = path.join(directory, 'package-consumer.ts');
  await writeFile(
    consumer,
    "import { generateSdk } from '@minkinad/api-sdk-generator-core';\n" +
      "import { runGenerateCommand } from 'api-sdk-generator';\n" +
      'void generateSdk;\nvoid runGenerateCommand;\n',
  );
  run(
    path.join(root, 'node_modules', '.bin', 'tsc'),
    [
      '--noEmit',
      '--strict',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2022',
      '--lib',
      'ES2022,DOM,DOM.Iterable',
      consumer,
      path.join(directory, 'generated/index.ts'),
    ],
    { cwd: directory },
  );
  run(cli, [...args, '--check'], { cwd: directory });
  await writeFile(path.join(directory, 'generated/client.ts'), 'outdated');
  assert.throws(
    () => run(cli, [...args, '--check'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] }),
    (error) => error.status === 2,
  );
  run(cli, [...args, '--dry-run', '--clean'], { cwd: directory });
  assert.equal(await readFile(path.join(directory, 'generated/client.ts'), 'utf8'), 'outdated');
  console.log(
    'Package checks passed: archive contents, dependencies, ESM/CJS imports, CLI help/version, generated TypeScript and --check.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
