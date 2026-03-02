/**
 * API client for communicating with api.iwbsend.com
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiCall<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getMessages() {
  return apiCall('/api/v1/messages');
}

export async function getMessage(id: string) {
  return apiCall(`/api/v1/messages/${id}`);
}

export async function getApiKeys() {
  return apiCall('/api/v1/api-keys');
}

export async function getTenant() {
  return apiCall('/api/v1/tenant');
}
