import { parseArgs } from 'node:util';

export function parseReleaseOptions(args) {
  return parseArgs({
    args,
    options: { 'dry-run': { type: 'boolean', default: false } },
    allowPositionals: false,
    strict: true,
  }).values;
}

export function registryVersion(pkg, registry, run) {
  try {
    return JSON.parse(
      run(
        'npm',
        [
          'view',
          `${pkg.name}@${pkg.version}`,
          '--json',
          '--registry',
          registry,
          '--fetch-retries=2',
          '--fetch-timeout=30000',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    );
  } catch (error) {
    let code;
    try {
      code = JSON.parse(error.stdout).error?.code;
    } catch {
      /* Preserve the original failure. */
    }
    if (code === 'E404') return null;
    throw error;
  }
}

export function publishPackage(pkg, { registry, run, dryRun = false, provenance = false }) {
  if (!dryRun && registryVersion(pkg, registry, run)) return false;
  const args = ['publish', pkg.archive, '--access', 'public', '--registry', registry];
  if (dryRun) args.push('--dry-run');
  if (provenance && !dryRun) args.push('--provenance');
  if (pkg.version.includes('-')) args.push('--tag', 'next');
  run('npm', args, { stdio: 'inherit' });
  return !dryRun;
}

export function ensureTag(tag, commit, run) {
  let existing;
  try {
    existing = run('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (error.status !== 128) throw error;
  }
  if (existing && existing !== commit) {
    throw new Error(`Tag ${tag} already points to another commit; it will not be moved.`);
  }
  if (!existing) run('git', ['tag', tag, commit]);
}

export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line === `## ${version}`);
  if (start === -1) throw new Error(`Missing changelog entry for ${version}.`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();
}
