# Installation

## Requirements

- Node.js `>= 20.19.0`
- `pnpm`

## Local development

```bash
pnpm install
pnpm build
```

## CLI usage via npx

```bash
npx api-sdk-generator generate --url https://api.example.com/openapi.json --output ./generated
```

## Workspace usage

```bash
pnpm --filter api-sdk-generator generate --file apps/demo/openapi.json --output apps/demo/generated
```
