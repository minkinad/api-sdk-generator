# API SDK Generator

[![CI](https://img.shields.io/github/actions/workflow/status/minkinad/api-sdk-generator/ci.yml?branch=main)](https://github.com/minkinad/api-sdk-generator/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/api-sdk-generator)](https://www.npmjs.com/package/api-sdk-generator)
[![GitHub Release](https://img.shields.io/github/v/release/minkinad/api-sdk-generator)](https://github.com/minkinad/api-sdk-generator/releases)
[![Docs](https://img.shields.io/badge/docs-github%20pages-blue)](https://minkinad.github.io/api-sdk-generator/)
[![License](https://img.shields.io/github/license/minkinad/api-sdk-generator)](./LICENSE)

Generate TypeScript SDK clients from OpenAPI 3.x schemas. The project ships a reusable core generator, a CLI package that works with `npx`, docs on GitHub Pages, a demo app, and production-style GitHub automation for CI and releases.

## Installation

```bash
npm install --save-dev api-sdk-generator
```

or run it directly:

```bash
npx api-sdk-generator generate --url https://api.example.com/openapi.json --output ./generated
```

## Quick start

Generate from a local file:

```bash
npx api-sdk-generator generate --file ./openapi.json --output ./generated
```

Generate from a URL:

```bash
npx api-sdk-generator generate --url https://api.example.com/openapi.json --output ./generated
```

Workspace example:

```bash
pnpm --filter api-sdk-generator generate --file apps/demo/openapi.json --output apps/demo/generated
```

## CLI examples

```bash
api-sdk-generator generate \
  --file ./openapi.json \
  --output ./generated \
  --name ExampleSdk \
  --base-url https://api.example.com \
  --clean \
  --verbose
```

Supported options:

- `--url <url>`
- `--file <path>`
- `--output <path>`
- `--name <sdkName>`
- `--base-url <baseUrl>`
- `--clean`
- `--verbose`

## Generated SDK example

```ts
import { createClient } from './generated';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer token',
  },
});

const user = await client.getUserById({ id: '123' });
```

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Key workspaces:

- `packages/core`: generator engine
- `packages/cli`: CLI package published as `api-sdk-generator`
- `apps/docs`: VitePress documentation
- `apps/demo`: sample OpenAPI schema and generated SDK usage

## Release process

This repository uses Changesets.

1. Add a changeset with `pnpm changeset`.
2. Merge the change into `main`.
3. Merge the automated release PR opened by `changesets/action`.
4. The workflow publishes to npm, updates changelogs, and creates GitHub Releases.

## Publishing

### npm

- Add `NPM_TOKEN` under `Settings -> Secrets and variables -> Actions`.
- Under `Settings -> Actions -> General -> Workflow permissions`, enable `Allow GitHub Actions to create and approve pull requests`.
- The `release.yml` workflow publishes `api-sdk-generator` and `@minkinad/api-sdk-generator-core`.
- npm provenance is enabled through `publishConfig.provenance` and workflow `id-token: write`.

### GitHub Packages

- GitHub Packages for npm requires scoped package names.
- `package-github.yml` publishes `@minkinad/api-sdk-generator-core` to `npm.pkg.github.com`.
- If you need the CLI there as well, publish a scoped distribution such as `@minkinad/api-sdk-generator`.

## Documentation

- GitHub Pages docs: https://minkinad.github.io/api-sdk-generator/
- Enable Pages in `Settings -> Pages` and choose `GitHub Actions` as the source.

## Required secrets

- `NPM_TOKEN`
- `GITHUB_TOKEN` is provided automatically by GitHub Actions

## First release

1. Add `NPM_TOKEN`.
2. Enable `Allow GitHub Actions to create and approve pull requests` under `Settings -> Actions -> General -> Workflow permissions`.
3. Enable GitHub Pages with GitHub Actions.
4. Merge the initial changeset on `main`.
5. Merge the release PR created by Changesets.

## Contributing

Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

Full documentation: [apps/docs](./apps/docs)
