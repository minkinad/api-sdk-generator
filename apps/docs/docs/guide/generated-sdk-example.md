# Generated SDK Example

Typical output:

```ts
import { createClient } from './generated';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer token',
  },
});

const user = await client.getUserById({ id: '123' });
const users = await client.getUsers({ page: 1, status: 'active' });
```

The generated client:

- uses `fetch`
- throws `ApiError` for non-2xx responses
- serializes JSON request bodies
- builds URLs with path and query parameters
