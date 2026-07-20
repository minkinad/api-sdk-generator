---
'@minkinad/api-sdk-generator-core': patch
'api-sdk-generator': patch
---

Harden generated clients by preserving base URL paths, honoring JSON media types, and safely parsing empty responses. Generated output paths are now contained within the target directory, formatting is deterministic, and the CLI reports its package version without duplicated metadata.
