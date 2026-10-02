import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { packPackages, registry, root, run } from './packages.mjs';
import { ensureTag, parseReleaseOptions, publishPackage } from './release-utils.mjs';

const dryRun = parseReleaseOptions(process.argv.slice(2))['dry-run'];
if (!dryRun) {
  const pending = (await readdir(path.join(root, '.changeset'))).filter(
    (name) => name.endsWith('.md') && name !== 'README.md',
  );
  if (pending.length)
    throw new Error('Version pending changesets before publishing: run pnpm version:packages.');
  if (run('git', ['status', '--porcelain']).trim())
    throw new Error('Commit all changes before publishing.');
}
const commit = run('git', ['rev-parse', 'HEAD']).trim();
const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-publish-'));
try {
  for (const pkg of await packPackages(directory)) {
    const tag = `${pkg.name}@${pkg.version}`;
    const published = publishPackage(pkg, {
      registry,
      run,
      dryRun,
      provenance: process.env.GITHUB_ACTIONS === 'true',
    });
    if (published) {
      ensureTag(tag, commit, run);
      console.log(`New tag: ${tag}`);
    } else if (!dryRun) {
      console.log(`Already published: ${tag}`);
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
