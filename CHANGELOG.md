# Changelog

All notable changes to this workspace are documented here.

Package-level release notes are managed by Changesets and published through automated release workflows.

## Unreleased

- Preserve path prefixes in generated client base URLs, honor vendor JSON request media types, and safely handle empty HTTP response bodies.
- Reject generated output paths that escape the target directory or resolve to duplicate files.
- Derive the CLI version from package metadata and make command construction independently testable.
- Make generated TypeScript formatting deterministic and keep the checked-in demo output synchronized.
