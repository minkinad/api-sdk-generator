# @minkinad/api-sdk-generator-core

Generate a TypeScript fetch SDK from an OpenAPI JSON or YAML document.
Requires Node.js 20.19 or later. Supports ESM and CommonJS.

```bash
npm install @minkinad/api-sdk-generator-core
```

```ts
import { generateSdk } from '@minkinad/api-sdk-generator-core';

const result = await generateSdk({
  input: { file: './openapi.yaml' },
  outputDir: './generated',
});
console.log(result.operations);
```

Use `input: { url: 'https://example.com/openapi.json' }` for remote schemas.
Remote schemas have a 30-second deadline; use `schemaTimeoutMs` to customize it
and `signal` to cancel a download. Set `dryRun: true` to get formatted files in `result.files` without writing them.
Set `check: true` to compare with disk; `result.changedFiles` contains missing or
outdated files. Check mode does not modify files, even when `clean` is enabled.

The generated SDK supports typed request/response models, JSON bodies, query
arrays, custom fetch, request headers, cancellation through `RequestInit.signal`,
and `ApiError` with status, headers and response body.

See [documentation](https://minkinad.github.io/api-sdk-generator/) and
[source](https://github.com/minkinad/api-sdk-generator) for supported features and limitations.

MIT licensed.
