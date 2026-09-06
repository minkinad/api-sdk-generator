import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { packPackages, run } from './packages.mjs';
import { parseReleaseOptions, publishPackage } from './release-utils.mjs';

const dryRun = parseReleaseOptions(process.argv.slice(2))['dry-run'];
if (!dryRun && !process.env.NODE_AUTH_TOKEN)
  throw new Error('NODE_AUTH_TOKEN is required for GitHub Packages.');
const directory = await mkdtemp(path.join(os.tmpdir(), 'api-sdk-github-packages-'));
try {
  const config = path.join(directory, '.npmrc');
  await writeFile(config, '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n');
  const authenticatedRun = (command, args, options) =>
    run(command, args, {
      ...options,
      env: { ...process.env, NPM_CONFIG_USERCONFIG: config },
    });
  const [core] = await packPackages(directory, ['core']);
  const published = publishPackage(core, {
    registry: 'https://npm.pkg.github.com',
    run: authenticatedRun,
    dryRun,
  });
  console.log(
    published
      ? `Published ${core.name}@${core.version} to GitHub Packages`
      : 'GitHub Packages check complete',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
