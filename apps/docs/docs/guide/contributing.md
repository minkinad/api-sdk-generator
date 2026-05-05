# Contributing

## Local workflow

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Changesets

Add a changeset for any user-facing change:

```bash
pnpm changeset
```

## Secrets and infrastructure

- `NPM_TOKEN` is required for npm publishing
- GitHub Pages must be enabled for docs deployment
- GitHub Packages publishing uses `GITHUB_TOKEN`

See the root `CONTRIBUTING.md` for repository conventions.
