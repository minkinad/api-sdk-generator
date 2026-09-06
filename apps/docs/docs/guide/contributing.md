# Contributing

## Local workflow

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm release:check
```

## Changesets

Add a changeset for any user-facing change:

```bash
pnpm changeset
```

## Secrets and infrastructure

- Configure npm trusted publishing for both packages; see [publishing guide](./publishing-npm.md).
- GitHub Pages must be enabled for docs deployment
- GitHub Packages publishing uses `GITHUB_TOKEN`

See the root `CONTRIBUTING.md` for repository conventions.
