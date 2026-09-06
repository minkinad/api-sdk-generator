import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const registry = 'https://registry.npmjs.org/';

export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
    ...options,
  });
}

/** pnpm replaces workspace:* with publishable versions inside each archive. */
export async function packPackages(destination) {
  const packages = [];
  // Publish dependencies before their consumers.
  for (const directory of ['core', 'cli']) {
    const cwd = path.join(root, 'packages', directory);
    const metadata = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));
    run('pnpm', ['pack', '--pack-destination', destination], { cwd });
    const filename = `${metadata.name.replace(/^@/, '').replaceAll('/', '-')}-${metadata.version}.tgz`;
    packages.push({ ...metadata, archive: path.join(destination, filename) });
  }
  return packages;
}
