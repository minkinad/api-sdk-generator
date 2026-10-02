import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ensureTag,
  parseReleaseOptions,
  publishPackage,
  registryVersion,
  releaseNotes,
} from '../release-utils.mjs';

const pkg = { name: 'example', version: '1.2.3', archive: '/tmp/example.tgz' };
const registry = 'https://registry.npmjs.org/';
function npmError(code) {
  return Object.assign(new Error(code), { stdout: JSON.stringify({ error: { code } }) });
}

test('dry-run never reads the registry, enables provenance or publishes for real', () => {
  const calls = [];
  assert.equal(
    publishPackage(pkg, {
      registry,
      dryRun: true,
      provenance: true,
      run: (...args) => calls.push(args),
    }),
    false,
  );
  assert.equal(calls.length, 1);
  assert.ok(calls[0][1].includes('--dry-run'));
  assert.ok(!calls[0][1].includes('--provenance'));
});
test('published versions are skipped', () => {
  const calls = [];
  const run = (...args) => {
    calls.push(args);
    return JSON.stringify({ version: pkg.version });
  };
  assert.equal(publishPackage(pkg, { registry, run }), false);
  assert.equal(calls.length, 1);
});
test('only E404 is treated as an unpublished version', () => {
  assert.equal(
    registryVersion(pkg, registry, () => {
      throw npmError('E404');
    }),
    null,
  );
  for (const code of ['E401', 'E403', 'ETIMEDOUT']) {
    assert.throws(
      () =>
        registryVersion(pkg, registry, () => {
          throw npmError(code);
        }),
      new RegExp(code),
    );
  }
});
test('prereleases publish to next and requested provenance is enabled', () => {
  let publishArgs;
  const run = (_command, args) => {
    if (args[0] === 'view') throw npmError('E404');
    publishArgs = args;
  };
  assert.equal(
    publishPackage({ ...pkg, version: '1.3.0-beta.1' }, { registry, run, provenance: true }),
    true,
  );
  assert.ok(publishArgs.includes('--provenance'));
  assert.deepEqual(publishArgs.slice(-2), ['--tag', 'next']);
});
test('publication failures are propagated', () => {
  assert.throws(
    () =>
      publishPackage(pkg, {
        registry,
        run: (_command, args) => {
          if (args[0] === 'view') throw npmError('E404');
          throw new Error('publish failed');
        },
      }),
    /publish failed/,
  );
});
test('existing tags are never moved and repeated tagging is idempotent', () => {
  let calls = 0;
  ensureTag('example@1.2.3', 'abc', () => {
    calls++;
    return 'abc\n';
  });
  assert.equal(calls, 1);
  assert.throws(() => ensureTag('example@1.2.3', 'def', () => 'abc\n'), /will not be moved/);
});
test('a missing tag is created at the specified commit', () => {
  const calls = [];
  ensureTag('example@1.2.3', 'abc', (_command, args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') throw Object.assign(new Error('missing'), { status: 128 });
  });
  assert.deepEqual(calls[1], ['tag', 'example@1.2.3', 'abc']);
});
test('unknown flags cannot accidentally trigger a real publication', () => {
  assert.throws(() => parseReleaseOptions(['--dryrun']));
  assert.throws(() => parseReleaseOptions(['unexpected']));
  assert.equal(parseReleaseOptions(['--dry-run'])['dry-run'], true);
});
test('release notes include exactly the requested version', () => {
  const changelog = '# Package\n\n## 1.2.3\n\n### Fixes\n\n- Fixed it.\n\n## 1.2.2\n\nOld.';
  assert.equal(releaseNotes(changelog, '1.2.3'), '### Fixes\n\n- Fixed it.');
  assert.throws(() => releaseNotes(changelog, '9.0.0'), /Missing changelog/);
});
