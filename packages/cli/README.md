# api-sdk-generator

Generate TypeScript fetch SDKs from OpenAPI JSON or YAML schemas.
Requires Node.js 20.19 or later.

```bash
npx api-sdk-generator generate --file ./openapi.yaml --output ./generated
```

```bash
npm install --save-dev api-sdk-generator
```

Options:

- `--file <path>` or `--url <url>`: exactly one schema source.
- `--output <path>`: generated SDK directory (required).
- `--name <name>`: SDK name override.
- `--base-url <url>`: API server override.
- `--dry-run`: validate and preview without writing.
- `--check`: verify generated files; exit code 2 means missing or outdated files.
- `--clean`: remove the output directory before generation.
- `--timeout <ms>`: schema download timeout, default `30000`.
- `--verbose`: diagnostic logs.

```ts
import { createClient } from './generated/index.js';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
});
await client.getUserById({ id: '123' });
```

See [documentation](https://minkinad.github.io/api-sdk-generator/) and
[source](https://github.com/minkinad/api-sdk-generator) for supported features and limitations.
For programmatic generation, install `@minkinad/api-sdk-generator-core`.

MIT licensed.
