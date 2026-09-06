# API SDK Generator

[![CI](https://img.shields.io/github/actions/workflow/status/minkinad/api-sdk-generator/ci.yml?branch=main)](https://github.com/minkinad/api-sdk-generator/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/api-sdk-generator)](https://www.npmjs.com/package/api-sdk-generator)
[![GitHub Release](https://img.shields.io/github/v/release/minkinad/api-sdk-generator)](https://github.com/minkinad/api-sdk-generator/releases)
[![Docs](https://img.shields.io/badge/docs-github%20pages-blue)](https://minkinad.github.io/api-sdk-generator/)
[![License](https://img.shields.io/github/license/minkinad/api-sdk-generator)](./LICENSE)

Generate TypeScript SDK clients from OpenAPI JSON or YAML schemas. The project ships a reusable core generator, a CLI package that works with `npx`, docs on GitHub Pages, a demo app, and production-style GitHub automation for CI and releases.

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
- `--dry-run` (preview without writing)
- `--check` (exit code 2 when generated files are outdated)
- `--clean`
- `--verbose`

## Features

- JSON and YAML from local files or HTTP(S) URLs.
- Typed fetch clients, JSON request bodies, path parameters and query arrays.
- `anyOf`, `oneOf`, `allOf`, nullable objects, dictionaries and recursive component models.
- GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS.
- Safe parameter access for names such as `user-id`; escaped path values.
- `ApiError` exposes HTTP status, headers and body, including malformed JSON errors.
- Generated imports work with TypeScript NodeNext and bundlers.
- `--dry-run` previews generation; `--check` detects SDK drift in CI without changing files.

```bash
api-sdk-generator generate --file ./openapi.yaml --output ./generated --check
```

The generator supports a subset of OpenAPI, primarily the 3.0 schema model.
See [supported features and limitations](./apps/docs/docs/guide/configuration.md).

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
pnpm release:check
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

The repository root is a private workspace. Publish its two packages:

- `@minkinad/api-sdk-generator-core`
- `api-sdk-generator`

For the first publication, use Node.js 24, log in to npm as `minkinad`, and run:

```bash
pnpm install --frozen-lockfile
pnpm release:check
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
pnpm release
```

`release:check` builds and packs the packages, verifies archive contents, installs
both archives in a temporary project, and runs ESM/CJS and CLI checks. It does not publish.
`release` packs with pnpm and publishes with npm, replacing workspace dependencies
and publishing core before CLI. Existing versions are skipped; failures stop the release.
Use `pnpm release --dry-run` to inspect the publish operation without uploading.

After the first publication, configure a trusted publisher on npm for **each**
package: owner `minkinad`, repository `api-sdk-generator`, workflow `release.yml`.
The workflow uses OIDC without `NPM_TOKEN`; provenance is enabled only in GitHub Actions.
Enable `Allow GitHub Actions to create and approve pull requests` in repository settings.

**Подробная инструкция на русском, включая разбор ошибок:**
[Публикация в npm](./apps/docs/docs/guide/publishing-npm.md).

## Documentation

- GitHub Pages docs: https://minkinad.github.io/api-sdk-generator/
- Enable Pages in `Settings -> Pages` and choose `GitHub Actions` as the source.
- [Optional GitHub Packages publishing](./apps/docs/docs/guide/publishing-github-packages.md).

## Contributing

Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

Full documentation: [apps/docs](./apps/docs)
