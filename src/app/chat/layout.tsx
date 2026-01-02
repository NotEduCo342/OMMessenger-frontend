'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, MessageSquare, Menu, Users, Moon, Sun, Phone, Bookmark, UserPlus, Settings, Loader2 } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';

import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

import { getCurrentUser, logoutUser } from '@/api/auth';
import { UserSearch } from '@/components/user-search';
import { ConversationList } from '@/components/conversation-list';
import type { User } from '@/types';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
	const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();
	const [hydratingSession, setHydratingSession] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    // Read debug info from localStorage
    const cookiesAfterLogin = localStorage.getItem('debug_cookies_after_login');
    const loginTime = localStorage.getItem('debug_login_timestamp');
    
    console.log('[ChatLayout] ===== DEBUG INFO =====');
    console.log('[ChatLayout] Cookies after login:', cookiesAfterLogin);
    console.log('[ChatLayout] Login timestamp:', loginTime);
    console.log('[ChatLayout] Current cookies:', document.cookie);
    console.log('[ChatLayout] Hydration started', { isAuthenticated, user: user?.username });
    console.log('[ChatLayout] ===== END DEBUG =====');
    
    let cancelled = false;
    const hydrate = async () => {
      try {
        console.log('[ChatLayout] Calling getCurrentUser...');
        const currentUser = await getCurrentUser();
        console.log('[ChatLayout] Got user from server:', currentUser.username);
        if (!cancelled) {
          setAuth(currentUser);
          setHydratingSession(false);
          console.log('[ChatLayout] Auth set, hydration complete');
          // Clear debug logs on success
          localStorage.removeItem('debug_cookies_after_login');
          localStorage.removeItem('debug_login_timestamp');
        }
      } catch (error) {
        console.error('[ChatLayout] Hydration failed:', error);
        console.error('[ChatLayout] This means cookies are NOT being sent to the API');
        // Clear stale auth state on any error (401, network, etc.)
        if (!cancelled) {
          clearAuth();
          setAuthError(true);
          setHydratingSession(false);
          console.log('[ChatLayout] Auth cleared, redirecting to /auth via window.location');
          window.location.href = '/auth';
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [clearAuth, setAuth]);

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // ignore
    } finally {
      clearAuth();
      router.replace('/auth');
    }
  }

  console.log('[ChatLayout] Render state:', { 
    hydratingSession, 
    isAuthenticated, 
    hasUser: !!user,
    username: user?.username,
    authError
  });

  // Show loading state during hydration
  if (hydratingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if auth failed
  if (authError || !isAuthenticated || !user) {
    console.log('[ChatLayout] Auth check failed, showing redirect message');
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  console.log('[ChatLayout] Rendering chat interface for:', user.username);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Left Sidebar - Always Visible */}
      <aside className="flex w-80 flex-col border-r relative z-30">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Messages</span>
          </div>
          <div className="w-10" /> {/* Spacer for symmetry */}
        </div>

        {/* Conversation List */}
        <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="conversations" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Find
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="flex-1 m-0 mt-2">
            <ConversationList
              onSelectConversation={(id) => router.push(`/chat?conversationId=${id}`)}
            />
          </TabsContent>
          
          <TabsContent value="search" className="flex-1 m-0 mt-2">
            <UserSearch
              onSelectUser={(user: User) => {
                router.push(`/chat?user=${user.id}&username=${user.username}`);
              }}
            />
          </TabsContent>
        </Tabs>

        <Separator />

        {/* User Profile - Clickable */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Avatar>
            <AvatarFallback>
              {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden text-left">
            <p className="truncate text-sm font-medium">{user.fullName || user.username}</p>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col relative z-10">
        {children}
      </div>

      {/* Menu Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop - Blurs and darkens everything on the right */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              style={{ left: '320px' }} // Start after the left sidebar
            />
            
            {/* Floating Menu Sidebar from Left */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 h-full w-80 bg-background border-r shadow-2xl z-50 flex flex-col"
            >
              {/* Menu Header */}
              <div className="flex h-16 items-center justify-between border-b px-4">
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                  <Menu className="h-5 w-5" />
                </Button>
                <h2 className="font-semibold">Menu</h2>
                <div className="w-10" /> {/* Spacer */}
              </div>

              {/* User Info */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium">{user.fullName || user.username}</p>
                    <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleSidebar}>
                    <UserPlus className="h-4 w-4" />
                    <span>New Group</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleSidebar}>
                    <Users className="h-4 w-4" />
                    <span>Contacts</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleSidebar}>
                    <Phone className="h-4 w-4" />
                    <span>Calls</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleSidebar}>
                    <Bookmark className="h-4 w-4" />
                    <span>Saved Messages</span>
                  </Button>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-md transition-colors">
                    <div className="flex items-center gap-3">
                      <Moon className="h-4 w-4" />
                      <span className="text-sm">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <Switch 
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                  
                  <Separator className="my-2" />
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </Button>
                </div>
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
