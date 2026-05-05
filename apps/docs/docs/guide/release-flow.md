# GitHub Actions Release Flow

## Workflows

- `ci.yml`: install, lint, typecheck, test, build
- `release.yml`: Changesets release PRs, npm publishing, GitHub releases
- `docs.yml`: GitHub Pages deployment
- `package-github.yml`: GitHub Packages publishing

## Release process

1. Merge changes to `main`.
2. If there are pending `.changeset/*.md` files, `changesets/action` opens or updates a release PR.
3. Merge the release PR.
4. The workflow versions packages, updates changelogs, publishes to npm, and creates a GitHub Release.

## Required secrets

- `NPM_TOKEN`
- `GITHUB_TOKEN` is provided by GitHub Actions automatically

## First release

1. Add `NPM_TOKEN` in repository settings.
2. Enable GitHub Pages with GitHub Actions as the source.
3. Merge a changeset to `main`.
4. Merge the release PR produced by Changesets.
