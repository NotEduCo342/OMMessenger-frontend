import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  activeChat: number | null;
  unreadCount: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveChat: (chatId: number | null) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        activeChat: null,
        unreadCount: 0,

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        setActiveChat: (chatId) => set({ activeChat: chatId }),

        setUnreadCount: (count) => set({ unreadCount: count }),

        incrementUnreadCount: () =>
          set((state) => ({ unreadCount: state.unreadCount + 1 })),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
