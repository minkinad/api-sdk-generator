import { describe, expect, it } from 'vitest';

import { formatGeneratedFiles } from '../src/formatter.js';

describe('formatGeneratedFiles', () => {
  it('uses deterministic formatting for TypeScript output', async () => {
    const [file] = await formatGeneratedFiles([
      {
        content:
          'export const configuration = { endpoint: "https://example.com", retries: 3, enabled: true };',
        path: 'client.ts',
      },
    ]);

    expect(file.content).toBe(
      "export const configuration = { endpoint: 'https://example.com', retries: 3, enabled: true };\n",
    );
  });
});
