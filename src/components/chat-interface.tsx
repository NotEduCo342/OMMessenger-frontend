'use client';

import { useEffect, useState } from 'react';
import { Send, Smile, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useWebSocketStore } from '@/stores/websocket-store';
import { messageDB, generateClientId, getDirectConversationId, type DBMessage } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '@/lib/api';

interface ChatInterfaceProps {
  recipientId: number;
  recipientUsername: string;
}

export function ChatInterface({ recipientId, recipientUsername }: ChatInterfaceProps) {
  const { user } = useAuthStore();
  const { connect, disconnect, sendMessage: wsSendMessage, status } = useWebSocketStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const conversationId = user ? getDirectConversationId(user.id, recipientId) : '';

  // Initialize WebSocket and IndexedDB
  useEffect(() => {
    initializeChat();
    return () => {
      disconnect();
    };
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  async function initializeChat() {
    try {
      await messageDB.init();
      
      // Connect WebSocket
      if (status !== 'connected') {
        connect(API_ENDPOINTS.WS);
      }
      
      // Create conversation if it doesn't exist
      const existingConv = await messageDB.getConversation(conversationId);
      if (!existingConv) {
        await messageDB.addConversation({
          id: conversationId,
          type: 'direct',
          participantIds: [recipientId],
          unreadCount: 0,
          isSynced: false,
        });
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  }

  async function loadMessages() {
    try {
      setLoading(true);
      const msgs = await messageDB.getConversationMessages(conversationId, 50);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!message.trim() || !user) return;

    const content = message.trim();
    setMessage('');

    try {
      // Send via WebSocket (which also saves to IndexedDB)
      await wsSendMessage(conversationId, recipientId, content);
      
      // Reload messages to show the new one
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <Avatar>
          <AvatarFallback>{recipientUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">@{recipientUsername}</h2>
          {status === 'connected' ? (
            <p className="text-xs text-muted-foreground">Online</p>
          ) : (
            <p className="text-xs text-muted-foreground">Connecting...</p>
          )}
        </div>
        {status === 'connected' && (
          <Badge variant="secondary" className="text-xs">
            Connected
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Send className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              return (
                <div
                  key={msg.clientId}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs opacity-70">
                        {format(msg.createdAt, 'HH:mm')}
                      </span>
                      {isOwn && (
                        <span className="text-xs opacity-70">
                          {msg.status === 'pending' && '○'}
                          {msg.status === 'sent' && '✓'}
                          {msg.status === 'delivered' && '✓✓'}
                          {msg.status === 'read' && '✓✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled>
            <Smile className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={status !== 'connected'}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || status !== 'connected'}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
