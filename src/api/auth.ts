import { API_ENDPOINTS, fetchWithAuth } from '@/lib/api';
import type { AuthResponse, LoginInput, RegisterInput } from '@/types';

export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  const response = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Important: allow cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  
  // Set auth token as cookie for proxy
  document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
  
  // Transform snake_case to camelCase
  return {
    token: result.token,
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
  
  // Set auth token as cookie for proxy
  document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
  
  // Transform snake_case to camelCase
  return {
    token: result.token,
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
  return fetchWithAuth(API_ENDPOINTS.ME);
}
