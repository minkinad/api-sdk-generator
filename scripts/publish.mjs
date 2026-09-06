import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { packPackages, registry, run } from './packages.mjs';

const dryRun = process.argv.includes('--dry-run');
const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-publish-'));
try {
  const packages = await packPackages(directory);
  for (const pkg of packages) {
    const tag = `${pkg.name}@${pkg.version}`;
    if (!dryRun) {
      // A failed lookup is only treated as unpublished when npm reports E404.
      try {
        run('npm', ['view', tag, 'version', '--json', '--registry', registry], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        console.log(`Already published: ${tag}`);
        continue;
      } catch (error) {
        let code;
        try {
          code = JSON.parse(error.stdout).error?.code;
        } catch {
          // Network and authentication failures must stop the release.
        }
        if (code !== 'E404') throw error;
      }
    }
    const args = ['publish', pkg.archive, '--access', 'public', '--registry', registry];
    if (dryRun) args.push('--dry-run');
    // Attestations require a supported CI identity, and cannot be made locally.
    if (process.env.GITHUB_ACTIONS === 'true' && !dryRun) args.push('--provenance');
    if (pkg.version.includes('-')) args.push('--tag', 'next');
    run('npm', args, { stdio: 'inherit' });
    if (!dryRun && process.env.GITHUB_ACTIONS === 'true') {
      run('git', ['tag', tag]);
      // changesets/action uses this line to create the corresponding release.
      console.log(`New tag: ${tag}`);
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
