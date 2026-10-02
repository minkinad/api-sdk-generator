import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { root, run } from './packages.mjs';
import { releaseNotes } from './release-utils.mjs';

const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN is required for GitHub releases.');
const repository = 'minkinad/api-sdk-generator';
async function api(route, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}${route}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  return response.json();
}
for (const directory of ['core', 'cli']) {
  const pkg = JSON.parse(
    await readFile(path.join(root, 'packages', directory, 'package.json'), 'utf8'),
  );
  const tag = `${pkg.name}@${pkg.version}`;
  if (await api(`/releases/tags/${encodeURIComponent(tag)}`)) {
    console.log(`GitHub release already exists: ${tag}`);
    continue;
  }
  const commit = run('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`]).trim();
  const remoteCommit = await api(`/commits/${commit}`);
  if (!remoteCommit) throw new Error(`Push commit ${commit} to GitHub before creating ${tag}.`);
  const body = releaseNotes(
    await readFile(path.join(root, 'packages', directory, 'CHANGELOG.md'), 'utf8'),
    pkg.version,
  );
  // A structured API request keeps multiline notes out of shell interpolation.
  const release = await api('/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: commit,
      name: tag,
      body,
      draft: false,
      prerelease: pkg.version.includes('-'),
      make_latest: pkg.version.includes('-') ? 'false' : 'legacy',
    }),
  });
  if (!release) throw new Error(`GitHub could not create release ${tag}.`);
  console.log(release.html_url);
}
