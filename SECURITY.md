# Security Policy

## Supported versions

Security fixes target the latest published release. Older releases may require an
upgrade; separate long-term maintenance branches are not currently provided.

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting](https://github.com/minkinad/api-sdk-generator/security/advisories/new).
Include the affected version, a minimal reproduction, impact, and any proposed fix.
Remove credentials and personal information from examples.

If private reporting is unavailable, contact [@minkinad](https://github.com/minkinad)
to arrange a private channel. Do not post exploit details in a public issue.
The maintainer will coordinate a fix and disclosure where possible; response times
are not guaranteed for this volunteer-maintained project.

## Trust boundaries

- Treat API definitions as input data and review generated code before adopting it.
- Remote schema URLs are fetched by the generator. Use trusted endpoints and the
  schema download timeout; external `$ref` URLs are not fetched.
- Generate into a dedicated directory. `--clean` intentionally removes that directory.
  The writer rejects symlinks at and below the output root and guards protected paths.
  Individual files are replaced atomically; generation is not a directory-wide transaction.
- Generated TypeScript types do not validate API responses at runtime.
- Keep application secrets in runtime configuration, not OpenAPI examples or generated files.

## Release security

npm archives are tested in an isolated consumer before release. GitHub Actions
publishing uses npm OIDC and provenance; local publishing uses the maintainer's
npm login. No long-lived npm publishing token is required by the workflow.

Report a suspected compromised package through the private channel above and
include the package version and archive integrity if available.
