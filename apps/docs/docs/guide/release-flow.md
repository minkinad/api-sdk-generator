# GitHub Actions Release Flow

## Checks

`ci.yml` is reusable and runs on pull requests, main pushes, manual dispatch and a
weekly schedule. Release publication depends on its successful completion.

- Quality: formatting, ESLint, workspace types and release-script tests.
- Tests: Node.js 20.19, 22 and 24 on Linux, plus Node.js 24 on macOS; coverage is uploaded.
- Packages: build packages/docs/demo, verify committed demo output, install archives,
  exercise ESM/CJS and CLI behavior, and dry-run npm publishing.
- Workflows: actionlint validates workflow expressions, permissions and syntax.
- Dependencies: high and critical audit findings fail the job.

`docs.yml` builds pull requests with read-only permissions and deploys only main.
Pages permissions belong only to its deploy job. Shared setup lives in
`.github/actions/setup/action.yml`; third-party actions are pinned to commit SHAs.
Dependabot maintains those pins and groups related dependency updates.

## First release

Use the [npm guide](./publishing-npm.md) to publish both packages manually and add
an npm trusted publisher for each package. The workflow uses Node.js 24 and npm 11
with OIDC. It does not require `NPM_TOKEN`.

Enable GitHub Actions pull-request creation and GitHub Pages in repository settings.
The repository must be public for npm provenance.

## Version and publish

1. Add changesets with user-facing changes and merge into `main`.
2. After checks pass, Changesets opens a PR containing versions and changelogs.
3. Merge that PR. The next release run checks the exact source commit before publishing.
4. `pnpm release` packs with pnpm, publishes with npm, and tags each successful publication.
5. `pnpm release:github` creates missing GitHub Releases from package changelogs and existing tags.
6. A reusable GitHub Packages job publishes the scoped core package, skipping existing versions.

The GitHub Packages workflow is called explicitly: GitHub release events produced
by the workflow token must not be the only way to start that publication.
It also supports manual dispatch and releases created interactively.

## Recovery

- A pending changeset or dirty working tree stops real publication. `--dry-run` remains available.
- Existing npm versions are skipped. Network/authentication errors stop the process; only registry E404 means unpublished.
- If core succeeds and CLI fails, fix the cause and rerun the same release.
- Existing GitHub releases are skipped. If GitHub release creation fails after npm succeeds, rerun `pnpm release:github` with `GH_TOKEN` or `GITHUB_TOKEN` after pushing the commits/tags.
- A tag that points to another commit is never moved. If publication succeeded immediately before a tag-writing failure, inspect the published source and restore the correct tag manually.
- Prerelease versions publish with the `next` npm dist-tag.

Concurrent releases are serialized. A manual release dispatch must target `main`.
`pnpm release:check` verifies archives without publishing; `pnpm verify` runs the local checks.
