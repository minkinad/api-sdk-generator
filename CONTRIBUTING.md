# Contributing

Thanks for helping improve API SDK Generator. Please follow the
[Code of Conduct](./CODE_OF_CONDUCT.md). Use [SUPPORT.md](./SUPPORT.md) for questions
and [SECURITY.md](./SECURITY.md) for private vulnerability reports.

## Local setup

Use Node.js 24 and pnpm 9.15.4. The generator's supported runtime starts at Node.js 20.19.

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Useful commands:

| Command                           | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `pnpm test:unit`                  | Generator and CLI regression tests with coverage |
| `pnpm test:scripts`               | Release safety and retry behavior tests          |
| `pnpm test:watch`                 | Watch generator and CLI tests                    |
| `pnpm lint` / `pnpm format:check` | Code and formatting checks                       |
| `pnpm typecheck`                  | Workspace TypeScript checks                      |
| `pnpm build`                      | Build packages, regenerate demo and build docs   |
| `pnpm demo:check`                 | Compare the demo with generator output           |
| `pnpm release:check`              | Install and exercise the publishable archives    |
| `pnpm audit:prod`                 | Audit production dependencies                    |
| `pnpm docs:dev`                   | Work on documentation locally                    |

Workflow syntax is checked with actionlint in CI. To run it locally, install
[actionlint](https://github.com/rhysd/actionlint/blob/main/docs/install.md) and run `actionlint`.

## Where changes belong

- `packages/core/src`: loading, parsing, code generation, formatting and file writing.
- `packages/core/test`: regression schemas, compiler checks and generated-client execution.
- `packages/cli`: CLI options, logs, and commands.
- `apps/demo`: a small complete consumer; regenerate rather than editing its output manually.
- `apps/docs`: public documentation.
- `scripts`: packaging and release orchestration, with tests under `scripts/test`.

For a bug fix, include the smallest schema or request that reproduces it. Tests
should check user-visible behavior: compile the generated code or execute it with
a mock fetch when that is what the change affects. Documentation-only changes
do not need artificial unit tests.

## Dependency updates

The lockfile is committed. `pnpm.overrides` currently selects patched Vite for
VitePress and patched esbuild for affected transitive ranges. Before changing or
removing an override, run the audit, tests, archive checks and documentation build.
Keep Vitest and its coverage provider on matching versions.

## Pull requests

Keep changes focused and explain the problem, resulting behavior, compatibility
impact and validation. Do not include unrelated reformatting or dependency updates.
Use Conventional Commit prefixes such as `feat`, `fix`, `refactor`, `test`, `docs`,
`ci`, and `chore`, with an optional scope (`fix(core): ...`).

For user-facing changes, add a changeset:

```bash
pnpm changeset
```

Choose affected packages and the appropriate version increment. Before pushing,
run `pnpm verify`; a regenerated demo belongs in the same change as its generator.

## Maintainer releases

The [publishing guide](./apps/docs/docs/guide/publishing-npm.md) covers first-time npm
setup. The [release flow](./apps/docs/docs/guide/release-flow.md) explains CI,
GitHub releases, and recovery after a partial publication.

Do not manually edit package changelogs for normal releases: apply changesets with
`pnpm version:packages`. Published npm versions and release tags are immutable.

Pages requires `Settings → Pages → Source: GitHub Actions`. Release PRs require
permission for GitHub Actions to create pull requests. npm trusted publishers must
be configured separately for both packages.
