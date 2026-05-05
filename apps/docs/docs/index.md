# Introduction

`api-sdk-generator` converts an OpenAPI 3.x schema into a typed TypeScript SDK with:

- generated request and response types
- a fetch-based API client for Node.js and browsers
- stable operation naming
- a CLI suitable for local use, CI pipelines, and `npx`

## What gets generated

- `types.ts`
- `client.ts`
- `index.ts`
- `README.md`

## Repository layout

```text
repo/
  packages/
    core/
    cli/
  apps/
    docs/
    demo/
```

## Guarantees

- TypeScript `strict` mode
- OpenAPI loading from URL or local file
- JSON request bodies
- path and query parameter support
- typed JSON responses
- prettier-formatted output
