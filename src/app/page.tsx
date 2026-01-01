'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { MessageSquare, Shield, Zap } from "lucide-react";
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
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

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Stay Connected on the Intranet
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Secure, real-time messaging designed for when internet access is restricted.
            Built for resilience, privacy, and speed.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => router.push(isAuthenticated ? '/chat' : '/auth')}
            >
              {isAuthenticated ? 'Go to Chat' : 'Get Started'}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                const element = document.getElementById('features');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-32 max-w-5xl" id="features">
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary" />
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Real-time messaging with WebSocket technology. Messages arrive instantly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary" />
                <CardTitle>Secure by Design</CardTitle>
                <CardDescription>
                  End-to-end encryption and JWT authentication keep your conversations private.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary" />
                <CardTitle>Intranet Ready</CardTitle>
                <CardDescription>
                  Works seamlessly on local networks when internet access is blocked.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mx-auto mt-32 max-w-3xl">
          <h2 className="text-center text-3xl font-bold">Built with Modern Tech</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Next.js 16</span>
            <span>•</span>
            <span>React 19</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span>Go + Fiber</span>
            <span>•</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>OM Messenger - Phase 1 Foundation Complete</p>
        </div>
      </footer>
    </div>
  );
}
