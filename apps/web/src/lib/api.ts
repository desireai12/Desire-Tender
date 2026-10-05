import { getAuthHeaders, clearUserSession, clearAdminSession } from '@/lib/store';

export const API_BASE_URL = '/api/v1';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const authHeaders = getAuthHeaders();
  
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401) {
    const urlStr = typeof input === 'string' ? input : input.toString();
    if (!urlStr.includes('/auth/login') && !urlStr.includes('/auth/admin-login')) {
      clearUserSession();
      clearAdminSession();
    }
  }

  return response;
}
