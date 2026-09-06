# GitHub Actions Release Flow

## Workflows

- `ci.yml`: lint, typecheck, test, build and install npm archives on Node.js 20 and 24.
- `release.yml`: Changesets release PRs, npm trusted publishing and GitHub releases.
- `docs.yml`: GitHub Pages deployment.
- `package-github.yml`: optional scoped core publication to GitHub Packages.

## First release

Follow the [npm publishing guide](./publishing-npm.md) to publish both packages
manually and configure an npm trusted publisher for each package. The release
workflow uses Node.js 24 and npm 11 with OIDC; it does not require `NPM_TOKEN`.

Enable `Allow GitHub Actions to create and approve pull requests` under
`Settings → Actions → General → Workflow permissions`. Organization policies
must also allow this setting.

## Release process

1. Add a changeset and merge the change into `main`.
2. The workflow opens or updates a PR containing new versions and changelogs.
3. Merge the release PR.
4. The workflow validates archives and publishes previously unpublished versions,
   core before CLI. It creates tags and GitHub Releases for newly published packages.

`pnpm release` packs with pnpm to resolve workspace dependencies, then invokes
npm directly for OIDC support. The script skips existing registry versions and
stops on publication, authentication or network failures. Prereleases use the
`next` dist-tag. Releases are serialized, and manual dispatch is limited to `main`.

Run `pnpm release:check` locally to test archives without publishing.
