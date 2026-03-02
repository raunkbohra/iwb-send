/**
 * NextAuth configuration
 * TODO: Wire up actual auth provider (credentials, OAuth, magic link)
 */

export async function auth() {
  // Stub: Return mock user
  // TODO: Implement with NextAuth when ready
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
      tenantId: 'tenant-1',
    },
  };
}

export async function getSession() {
  return auth();
}
