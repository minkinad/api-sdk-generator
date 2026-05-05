import { createClient } from './generated/index';

async function main(): Promise<void> {
  const client = createClient({
    baseUrl: 'https://api.example.com',
    headers: {
      Authorization: 'Bearer token',
    },
  });

  const user = await client.getUserById({ id: '123' });
  const users = await client.getUsers({ page: 1, status: 'active' });

  console.log(user.email, users.length);
}

void main();
