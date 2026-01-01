const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/users/me`,
  
  // Users
  CHECK_USERNAME: `${API_BASE_URL}/api/users/check-username`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/me`,
  
  // Messages
  MESSAGES: `${API_BASE_URL}/api/messages`,
  
  // WebSocket
  WS: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
};

export async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth-storage');
  let parsedToken = null;

  if (token) {
    try {
      const authData = JSON.parse(token);
      parsedToken = authData.state?.token;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(parsedToken && { Authorization: `Bearer ${parsedToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
