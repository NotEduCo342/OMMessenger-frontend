'use client';

import { useState } from 'react';
import { Search, User as UserIcon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, getUserByUsername } from '@/api/user';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {searchQuery.length < 2 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Find Users</h3>
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {users && users.length === 0 && debouncedQuery.length >= 2 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-sm text-muted-foreground">
              No users found for &quot;{debouncedQuery}&quot;
            </p>
          </div>
        )}

        {users && users.length > 0 && (
          <div className="p-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Avatar>
                  <AvatarFallback>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">@{user.username}</p>
                    {user.isOnline && (
                      <Badge variant="secondary" className="text-xs">
                        Online
                      </Badge>
                    )}
                  </div>
                  {user.fullName && (
                    <p className="text-sm text-muted-foreground truncate">
                      {user.fullName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
