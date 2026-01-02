import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,

        setAuth: (user) => {
          console.log('[AuthStore] setAuth called with user:', user.username);
          set({
            user,
            isAuthenticated: true,
          });
          console.log('[AuthStore] State updated, isAuthenticated: true');
        },

        clearAuth: () => {
          console.log('[AuthStore] clearAuth called');
          set({
            user: null,
            isAuthenticated: false,
          });
          console.log('[AuthStore] State cleared, isAuthenticated: false');
        },

        updateUser: (userData) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...userData } : null,
          })),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
