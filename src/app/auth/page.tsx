'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';

import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/validations/auth';
import { loginUser, registerUser } from '@/api/auth';
import { checkUsernameAvailability } from '@/api/user';
import { useAuthStore } from '@/stores/auth-store';

// Debounce hook
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

export default function AuthPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated, router]);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const username = registerForm.watch('username');
  const debouncedUsername = useDebounce(username, 500);

  // Check username availability on register form
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      // Skip if username has validation errors
      const usernameError = registerForm.formState.errors.username;
      if (usernameError) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      try {
        const available = await checkUsernameAvailability(debouncedUsername);
        setUsernameStatus(available ? 'available' : 'taken');
        
        if (!available) {
          registerForm.setError('username', {
            type: 'manual',
            message: 'Username is already taken',
          });
        } else {
          registerForm.clearErrors('username');
        }
      } catch (error) {
        setUsernameStatus('idle');
        console.error('Failed to check username:', error);
      }
    };

    checkUsername();
  }, [debouncedUsername, registerForm]);

  async function onLogin(data: LoginInput) {
    setIsLoading(true);
    try {
      const response = await loginUser(data);
		setAuth(response.user);
      toast.success('Welcome back!');
      router.replace('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(data: RegisterInput) {
    // Final check before submitting
    if (usernameStatus === 'taken') {
      toast.error('Please choose a different username');
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser(data);
		setAuth(response.user);
      toast.success('Account created successfully!');
      router.replace('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <span className="text-xl font-bold">OM Messenger</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Auth Forms */}
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="johndoe"
                                  autoComplete="username"
                                  disabled={isLoading}
                                  {...field}
                                  className="pr-10"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {getUsernameIcon()}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                autoComplete="name"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
