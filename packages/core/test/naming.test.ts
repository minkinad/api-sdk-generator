import { describe, expect, it } from 'vitest';

import { createFunctionName } from '../src/naming.js';

describe('naming', () => {
  it('uses operationId when present', () => {
    expect(createFunctionName('get', '/users/{id}', 'getUserById')).toBe('getUserById');
  });

  it('generates a readable fallback name from method and path', () => {
    expect(createFunctionName('get', '/organizations/{orgId}/users/{userId}')).toBe(
      'getOrganizationsUsersByOrgIdAndUserId',
    );
  });
});
