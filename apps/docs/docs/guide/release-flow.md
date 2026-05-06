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

## Required repository settings

- Under `Settings -> Actions -> General -> Workflow permissions`, enable `Allow GitHub Actions to create and approve pull requests`.
- If the repository belongs to an organization, make sure the organization-level Actions policy does not block that setting.

## First release

1. Add `NPM_TOKEN` in repository settings.
2. Enable `Allow GitHub Actions to create and approve pull requests` in the repository Actions settings.
3. Enable GitHub Pages with GitHub Actions as the source.
4. Merge a changeset to `main`.
5. Merge the release PR produced by Changesets.
