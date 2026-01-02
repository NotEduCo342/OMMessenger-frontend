import { API_ENDPOINTS, fetchWithAuth } from '@/lib/api';
import type { AuthResponse, LoginInput, RegisterInput } from '@/types';

export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  console.log('[API] loginUser called for:', data.email);
  console.log('[API] Cookies BEFORE login:', document.cookie);
  
  const response = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Important: allow cookies
  });

  console.log('[API] Login response status:', response.status);
  console.log('[API] Login response headers:', Object.fromEntries(response.headers.entries()));
  console.log('[API] Cookies AFTER login response:', document.cookie);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  console.log('[API] Login response body:', result);
  
  // Wait a bit and check cookies again
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('[API] Cookies 100ms after login:', document.cookie);

  return {
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      fullName: result.user.full_name,
      avatar: result.user.avatar,
      isOnline: result.user.is_online,
      lastSeen: result.user.last_seen,
    },
  };
}

export async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  const response = await fetch(API_ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.username,
      email: data.email,
      password: data.password,
      full_name: data.fullName,
    }),
    credentials: 'include', // Important: allow cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();

  return {
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      fullName: result.user.full_name,
      avatar: result.user.avatar,
      isOnline: result.user.is_online,
      lastSeen: result.user.last_seen,
    },
  };
}

export async function getCurrentUser() {
  console.log('[API] getCurrentUser called, fetching from:', API_ENDPOINTS.ME);
  try {
    const response = await fetchWithAuth<any>(API_ENDPOINTS.ME);
    console.log('[API] getCurrentUser response:', response.user);
    return {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      fullName: response.user.full_name,
      avatar: response.user.avatar,
      isOnline: response.user.is_online,
      lastSeen: response.user.last_seen,
    };
  } catch (error) {
    console.error('[API] getCurrentUser failed:', error);
    throw error;
  }
}

export async function logoutUser() {
	return fetchWithAuth(API_ENDPOINTS.LOGOUT, {
		method: 'POST',
	});
}
