# Quick Start

Generate from a local file:

```bash
npx api-sdk-generator generate \
  --file ./openapi.json \
  --output ./generated \
  --name ExampleSdk
```

Generate from a remote schema:

```bash
npx api-sdk-generator generate \
  --url https://api.example.com/openapi.json \
  --output ./generated \
  --base-url https://api.example.com
```

Then consume the SDK:

```ts
import { createClient } from './generated';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer token',
  },
});

const user = await client.getUserById({ id: '123' });
```
