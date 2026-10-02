# Publishing to GitHub Packages

GitHub Packages requires scoped npm names. This repository publishes
`@minkinad/api-sdk-generator-core` there; the unscoped CLI is distributed through npm.

The release workflow calls `package-github.yml` explicitly after npm/GitHub release
completion. It passes the exact commit and grants `packages: write`. The reusable
workflow also supports manual dispatch and interactive core release events.

Dependencies are installed from npm before publishing. `pnpm release:github-packages`
packs the core and invokes npm with an explicit GitHub registry and temporary auth
configuration. The built-in workflow token is supplied through `NODE_AUTH_TOKEN`.
An already published version is skipped; authentication and network failures stop the job.

GitHub Packages visibility and installation permissions are separate from npm.
Check the package's GitHub settings after its first publication.

For the CLI on GitHub Packages, a separate scoped distribution such as
`@minkinad/api-sdk-generator` would be needed; it is not part of this release flow.
