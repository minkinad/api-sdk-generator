# Publishing to GitHub Packages

GitHub Packages for npm requires scoped package names. This repository uses:

- `api-sdk-generator` for npm
- `@minkinad/api-sdk-generator-core` for npm and GitHub Packages

The `package-github.yml` workflow publishes the scoped core package directly to `npm.pkg.github.com`.

## Authentication

The workflow uses the built-in `GITHUB_TOKEN` with `packages: write`.

## If you need the CLI on GitHub Packages

Publish it under an owner scope such as `@minkinad/api-sdk-generator` in a dedicated registry-specific package manifest or a separate distribution package. Keeping the npm package unscoped is the cleaner default for `npx`.
