# api-sdk-generator

## 0.3.0

### Minor Changes

- 060e503: Add YAML input, dry-run generation and CI drift checks. Support query arrays,
  HEAD/OPTIONS and anyOf; fix dictionary/nullable/composed types, parameter access,
  component references and generated type collisions. Preserve HTTP error metadata
  and use NodeNext-compatible imports. Prepare complete npm archives and validate
  them in an isolated consumer; support manual publishing and CI trusted publishing.
- e4943a4: Add configurable schema download deadlines and cancellation, reject cyclic YAML
  aliases, validate output paths through symlinks, and replace generated files
  atomically. Require Node.js 20.19 or later. Harden release retries, package checks
  and GitHub automation, refresh vulnerable build dependencies, and document the
  supported schema subset, community processes and publishing workflow.

### Patch Changes

- ddbb7b3: Harden generated clients by preserving base URL paths, honoring JSON media types, and safely parsing empty responses. Generated output paths are now contained within the target directory, formatting is deterministic, and the CLI reports its package version without duplicated metadata.
- Updated dependencies [ddbb7b3]
- Updated dependencies [060e503]
- Updated dependencies [e4943a4]
  - @minkinad/api-sdk-generator-core@0.3.0

## 0.2.0

### Minor Changes

- [`4eb243f`](https://github.com/minkinad/api-sdk-generator/commit/4eb243f4ae7efdd8b6d1b5d6e965ac160905029e) Thanks [@minkinad](https://github.com/minkinad)! - Initial public release of the OpenAPI-to-TypeScript SDK generator, including the core generation engine, CLI, docs, demo app, and release automation.

### Patch Changes

- [`2eaf834`](https://github.com/minkinad/api-sdk-generator/commit/2eaf834065c92604d2cace10cf2c4b1c548a9b8b) Thanks [@minkinad](https://github.com/minkinad)! - Improve generated client compatibility with more real-world OpenAPI schemas by honoring operation-level parameter overrides and parsing vendor `+json` response types as JSON.

- Updated dependencies [[`4eb243f`](https://github.com/minkinad/api-sdk-generator/commit/4eb243f4ae7efdd8b6d1b5d6e965ac160905029e), [`2eaf834`](https://github.com/minkinad/api-sdk-generator/commit/2eaf834065c92604d2cace10cf2c4b1c548a9b8b)]:
  - @minkinad/api-sdk-generator-core@0.2.0
