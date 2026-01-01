'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { useAuthStore } from '@/stores/auth-store';
import { checkUsernameAvailability, updateUserProfile } from '@/api/user';

// Debounce hook for username check
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      fullName: user?.fullName || '',
    },
  });

  const username = form.watch('username');
  const debouncedUsername = useDebounce(username, 500);

  // Check username availability
  useEffect(() => {
    if (!user) return;
    
    const checkUsername = async () => {
      // Skip if username hasn't changed or is empty
      if (!debouncedUsername || debouncedUsername === user.username) {
        setUsernameStatus('idle');
        return;
      }

      // Skip if username has validation errors
      const usernameError = form.formState.errors.username;
      if (usernameError) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      try {
        const available = await checkUsernameAvailability(debouncedUsername);
        setUsernameStatus(available ? 'available' : 'taken');
        
        if (!available) {
          form.setError('username', {
            type: 'manual',
            message: 'Username is already taken',
          });
        }
      } catch (error) {
        setUsernameStatus('idle');
        console.error('Failed to check username:', error);
      }
    };

    checkUsername();
  }, [debouncedUsername, user, form]);

  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
      router.push('/chat');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  function onSubmit(data: ProfileFormData) {
    // Only send changed fields
    const changes: { username?: string; fullName?: string } = {};
    
    if (data.username !== user?.username) {
      changes.username = data.username;
    }
    if (data.fullName !== user?.fullName) {
      changes.fullName = data.fullName;
    }

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save');
      return;
    }

    updateMutation.mutate(changes);
  }

  if (!isAuthenticated || !user) {
    router.push('/auth');
    return null;
  }

  const getUsernameIcon = () => {
    if (usernameStatus === 'checking') {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (usernameStatus === 'available') {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (usernameStatus === 'taken') {
      return <X className="h-4 w-4 text-destructive" />;
    }
    return null;
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/chat')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="your_username"
                              disabled={updateMutation.isPending}
                              className="pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {getUsernameIcon()}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your unique username. Only letters, numbers, and underscores.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="John Doe"
                            disabled={updateMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Your display name. This is visible to other users.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || usernameStatus === 'taken'}
                      className="flex-1"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/chat')}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
