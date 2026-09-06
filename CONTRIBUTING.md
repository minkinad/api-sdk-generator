# Contributing

## Development prerequisites

- Node.js `>= 20`
- `pnpm 9`

## Local workflow

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm release:check
```

## Workspace structure

- `packages/core`: OpenAPI loading, parsing, generation, formatting, file writing
- `packages/cli`: command-line interface and CLI-specific validation
- `apps/docs`: VitePress documentation site
- `apps/demo`: sample schema and generated SDK usage

## Changesets

Add a changeset for every user-facing change:

```bash
pnpm changeset
```

## Release process

1. Merge changes and changesets into `main`.
2. Wait for the automated release PR from Changesets.
3. Merge the release PR.
4. The release workflow publishes to npm and creates GitHub Releases.

## Publishing setup

- Configure npm trusted publishing for both packages; see [publishing guide](./apps/docs/docs/guide/publishing-npm.md).
- The release workflow uses OIDC; no `NPM_TOKEN` is required.

## Documentation deployment

1. Open `Settings -> Pages`.
2. Set the build and deployment source to `GitHub Actions`.
3. Push to `main` or run the docs workflow manually.
