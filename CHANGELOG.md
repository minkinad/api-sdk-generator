# Changelog

All notable changes to this workspace are documented here.

Package-level release notes are managed by Changesets and published through automated release workflows.

## 0.3.0

- Accept JSON and YAML schemas, preview generation with `--dry-run`, and detect SDK drift with `--check`.
- Add configurable schema download timeouts and cancellation; reject cyclic YAML aliases.
- Support more OpenAPI parameter and model shapes, preserve HTTP error details, and emit NodeNext-compatible imports.
- Validate symlinks before writing, protect input schemas during cleanup, and replace each generated file atomically.
- Require Node.js 20.19 or later and update dependencies to resolve known audit findings.
- Verify package archives in an isolated consumer, make publication retryable, and gate releases on expanded CI checks.
- Expand usage and publishing guides, contribution policies, support, security reporting, and issue templates.

- Preserve path prefixes in generated client base URLs, honor vendor JSON request media types, and safely handle empty HTTP response bodies.
- Reject generated output paths that escape the target directory or resolve to duplicate files.
- Derive the CLI version from package metadata and make command construction independently testable.
- Make generated TypeScript formatting deterministic and keep the checked-in demo output synchronized.
