'use client';

import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('user');
  const username = searchParams.get('username');

  if (!recipientId || !username) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Select a conversation</h2>
            <p className="text-xs text-muted-foreground">Choose a chat from the sidebar</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Start Messaging</h3>
            <p className="text-sm text-muted-foreground">
              Search for users or select a conversation to start chatting
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return <ChatInterface recipientId={parseInt(recipientId)} recipientUsername={username} />;
}
