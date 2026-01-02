// Use Next.js API proxy for same-origin requests (fixes cookie issues)
const USE_PROXY = process.env.NEXT_PUBLIC_USE_PROXY !== 'false';
const API_BASE_URL = USE_PROXY ? '/api/proxy/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api');

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  CSRF: `${API_BASE_URL}/auth/csrf`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  ME: `${API_BASE_URL}/users/me`,
  
  // Users
  CHECK_USERNAME: `${API_BASE_URL}/users/check-username`,
  UPDATE_PROFILE: `${API_BASE_URL}/users/me`,
  
  // Messages
  MESSAGES: `${API_BASE_URL}/messages`,
  
  // WebSocket (still direct connection)
  WS: process.env.NEXT_PUBLIC_WS_URL || 'wss://api-om.wexun.tech/ws',
};

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    if (k === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

function isUnsafeMethod(method: string): boolean {
  const m = (method || 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

export async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  const buildHeaders = (): HeadersInit => {
    const csrfToken = getCookieValue('om_csrf');
    return {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(isUnsafeMethod(method) && csrfToken ? { 'X-OM-CSRF': csrfToken } : {}),
      ...options.headers,
    };
  };

  let headers: HeadersInit = buildHeaders();

  // If we are about to do an unsafe request and we don't yet have a CSRF token,
  // ask the backend to issue one.
  if (isUnsafeMethod(method) && !getCookieValue('om_csrf')) {
    await fetch(API_ENDPOINTS.CSRF, {
      method: 'GET',
      credentials: 'include',
    }).catch(() => undefined);
    headers = buildHeaders();
  }

  const doFetch = async (): Promise<Response> => {
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  let response = await doFetch();

  // Attempt one refresh on 401
  if (response.status === 401 && url !== API_ENDPOINTS.REFRESH) {
    const refreshRes = await fetch(API_ENDPOINTS.REFRESH, {
      method: 'POST',
      credentials: 'include',
      // No CSRF token needed - refresh is protected by HttpOnly cookie
    });

    if (refreshRes.ok) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: 'Network error' } as any));
		throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
