import { API_ENDPOINTS, fetchWithAuth } from '@/lib/api';
import type { User } from '@/types';

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const response = await fetch(
    `${API_ENDPOINTS.CHECK_USERNAME}?username=${encodeURIComponent(username)}`
  );

  if (!response.ok) {
    throw new Error('Failed to check username availability');
  }

  const data = await response.json();
  return data.available;
}

export async function updateUserProfile(data: {
  username?: string;
  fullName?: string;
}): Promise<User> {
  const response = await fetchWithAuth<any>(API_ENDPOINTS.UPDATE_PROFILE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.username,
      full_name: data.fullName,
    }),
  });

  // Transform snake_case to camelCase
  return {
    id: response.user.id,
    username: response.user.username,
    email: response.user.email,
    fullName: response.user.full_name,
    avatar: response.user.avatar,
    isOnline: response.user.is_online,
    lastSeen: response.user.last_seen,
  };
}

export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  const baseUrl = API_ENDPOINTS.CHECK_USERNAME.replace('/check-username', '');
  const response = await fetchWithAuth<{ users: any[] }>(
    `${baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  
  return response.users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    avatar: user.avatar,
    isOnline: user.is_online,
    lastSeen: user.last_seen,
  }));
}

export async function getUserByUsername(username: string): Promise<User> {
  const baseUrl = API_ENDPOINTS.CHECK_USERNAME.replace('/check-username', '');
  const response = await fetchWithAuth<{ user: any }>(`${baseUrl}/${username}`);
  
  return {
    id: response.user.id,
    username: response.user.username,
    email: response.user.email,
    fullName: response.user.full_name,
    avatar: response.user.avatar,
    isOnline: response.user.is_online,
    lastSeen: response.user.last_seen,
  };
}
