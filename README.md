# API SDK Generator

[![CI](https://img.shields.io/github/actions/workflow/status/minkinad/api-sdk-generator/ci.yml?branch=main)](https://github.com/minkinad/api-sdk-generator/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/api-sdk-generator)](https://www.npmjs.com/package/api-sdk-generator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Documentation](https://img.shields.io/badge/docs-online-blue)](https://minkinad.github.io/api-sdk-generator/)

**Generate a typed TypeScript fetch client from an OpenAPI JSON or YAML document.**
Run it from the command line or call the reusable core from a build script. The
output is ordinary TypeScript you can inspect, commit, and compile with your application.

[Quick start](#quick-start) · [CLI reference](#cli-reference) · [Supported schemas](#supported-schemas) · [Contributing](./CONTRIBUTING.md) · [Публикация в npm](./apps/docs/docs/guide/publishing-npm.md)

## Quick start

Requires **Node.js 20.19+** to run the generator. Node.js 24 is recommended for development
and publishing. Generated clients use the standard Fetch API and need a fetch-capable runtime.

```bash
npm install --save-dev api-sdk-generator
npx api-sdk-generator generate --file ./openapi.yaml --output ./generated
```

For an API with `operationId: getUserById` and path parameter `id`:

```ts
import { ApiError, createClient } from './generated/index.js';

const client = createClient({
  baseUrl: 'https://api.example.com/v1',
  headers: { Authorization: 'Bearer token' },
});

try {
  const user = await client.getUserById({ id: '123' });
  console.log(user);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.body);
    console.log(error.headers.get('retry-after'));
  } else {
    throw error;
  }
}
```

Method and type names come from your schema. See the working
[demo](./apps/demo/example.ts) and [OpenAPI example](./apps/demo/openapi.json).

## What gets generated?

| File        | Contents                                                     |
| ----------- | ------------------------------------------------------------ |
| `types.ts`  | Component models and operation request/response types        |
| `client.ts` | `createClient`, client configuration, methods and `ApiError` |
| `index.ts`  | Public exports with NodeNext-compatible import paths         |
| `README.md` | Usage example for the generated client                       |

The generated SDK has no dependency on this generator. It uses standard
`fetch`, `Headers`, `URL`, and `URLSearchParams`; provide `config.fetch` when needed.
Types describe the API contract; they do not validate server responses at runtime.

## CLI reference

```bash
api-sdk-generator generate \
  --url https://api.example.com/openapi.yaml \
  --output ./generated \
  --name ExampleSdk \
  --timeout 30000
```

| Option             | Behavior                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| `--file <path>`    | Read a local JSON or YAML schema                                       |
| `--url <url>`      | Download a schema over HTTP(S); choose exactly one of file/URL         |
| `--output <path>`  | Required output directory                                              |
| `--name <name>`    | Override the name derived from `info.title`                            |
| `--base-url <url>` | Override the API server URL                                            |
| `--timeout <ms>`   | Schema download deadline, including the response body; default `30000` |
| `--dry-run`        | Validate and format output without writing files                       |
| `--check`          | Check existing generated files without modifying them                  |
| `--clean`          | Delete the output directory before writing; use a dedicated directory  |
| `--verbose`        | Print diagnostic logs                                                  |

Exit codes: `0` success, `1` invalid input or generation failure, `2` outdated or
missing files in `--check` mode. `--check` and `--dry-run` are mutually exclusive.
Both modes leave existing files untouched, including when `--clean` is present.

### Keep an SDK in sync in CI

Commit generated files and check them using the same input and options:

```json
{
  "scripts": {
    "sdk:generate": "api-sdk-generator generate --file openapi.yaml --output src/generated",
    "sdk:check": "api-sdk-generator generate --file openapi.yaml --output src/generated --check"
  }
}
```

Use a local or versioned schema in CI for reproducible output. `--check` compares
the four generated files and ignores unrelated files.

## Programmatic generation

```bash
npm install @minkinad/api-sdk-generator-core
```

```ts
import { generateSdk } from '@minkinad/api-sdk-generator-core';

const result = await generateSdk({
  input: { file: './openapi.yaml' },
  outputDir: './generated',
  dryRun: true,
});

console.log(
  result.operations,
  result.files.map((file) => file.path),
);
```

Use `check: true` and inspect `result.changedFiles` to detect drift. Remote input
supports `schemaTimeoutMs`, an `AbortSignal` through `signal`, and a custom
`fetchImplementation`. The core and CLI library exports support ESM and CommonJS.

## Supported schemas

The generator implements a documented **subset of OpenAPI**, based on the 3.0 schema model.

| Supported    | Details                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| Operations   | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS                                      |
| Models       | Primitives, objects, arrays, enums, nullable values, dictionaries                 |
| Composition  | `oneOf`, `anyOf`, `allOf`                                                         |
| References   | Local component references, aliases, recursive models, escaped JSON Pointer names |
| Requests     | Path/query parameters and JSON bodies, including `+json` media types              |
| Query arrays | Repeated keys, comma-separated, space-delimited and pipe-delimited values         |
| Runtime      | Custom fetch, headers, cancellation and per-request `RequestInit`                 |

External references, multipart bodies, generated header/cookie parameters, security
scheme generation, object query serialization, server-variable expansion, and
OpenAPI 3.1-specific JSON Schema constructs are not implemented. Only the first
successful response is modeled; non-JSON response schemas are not modeled.

Read the [complete compatibility notes](./apps/docs/docs/guide/configuration.md)
before using the generator with a new API. Small unsupported examples are welcome
as [feature requests](https://github.com/minkinad/api-sdk-generator/issues/new/choose).

## Development and verification

```bash
pnpm install --frozen-lockfile
pnpm verify
```

`verify` checks formatting, lint, types, tests, builds, demo drift, and npm archives.
The archive check installs both packages into a temporary project and exercises
ESM/CJS imports, CLI generation, preview, and drift detection. It requires registry
access to install the packages' dependencies. It does not publish.

| Workspace       | Responsibility                                     |
| --------------- | -------------------------------------------------- |
| `packages/core` | Load, parse, generate, format, and write SDK files |
| `packages/cli`  | Command-line validation and execution              |
| `apps/demo`     | Sample API and checked-in generated SDK            |
| `apps/docs`     | VitePress documentation                            |
| `scripts`       | Package smoke tests and release tooling            |

## Releases

Changesets manage package versions and changelogs. The root is a private workspace;
the public packages are `api-sdk-generator` and `@minkinad/api-sdk-generator-core`.

- `pnpm version:packages`: apply pending changesets.
- `pnpm release:check`: verify real package archives without publishing.
- `pnpm release --dry-run`: inspect npm publication without uploading.
- `pnpm release`: publish committed, versioned packages, core before CLI.

GitHub Actions uses npm trusted publishing and provenance. The first publication
and each package's trusted publisher require maintainer setup.
See the [release workflow](./apps/docs/docs/guide/release-flow.md) and
[подробную инструкцию по npm](./apps/docs/docs/guide/publishing-npm.md).

## Community

- [Contributing](./CONTRIBUTING.md): setup, tests, changesets, and review expectations.
- [Support](./SUPPORT.md): questions and reproducible bug reports.
- [Code of Conduct](./CODE_OF_CONDUCT.md): participation and moderation.
- [Security policy](./SECURITY.md): private vulnerability reporting.
- [Changelogs](./CHANGELOG.md): package release history.

Maintained by [@minkinad](https://github.com/minkinad). Licensed under [MIT](./LICENSE).
