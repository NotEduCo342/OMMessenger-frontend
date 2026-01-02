import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { messageDB, generateClientId, type DBMessage } from '@/lib/db';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface QueuedMessage {
  type: string;
  payload: any;
  clientId?: string;
}

interface WebSocketState {
  ws: WebSocket | null;
  status: ConnectionStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  messageQueue: QueuedMessage[];
  lastPingTime: number | null;
  
  // Actions
  connect: (url: string, token?: string) => void;
  disconnect: () => void;
  send: (type: string, payload: any) => void;
  sendMessage: (conversationId: string, recipientId: number, content: string) => Promise<string>;
  syncConversations: (conversations: Array<{ conversationId: string; lastMessageId: number }>) => void;
  setStatus: (status: ConnectionStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  processQueue: () => void;
  scheduleReconnect: (url: string, token?: string) => void;
  startHeartbeat: () => void;
  handleMessage: (data: any) => Promise<void>;
}

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set, get) => ({
      ws: null,
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      reconnectTimer: null,
      messageQueue: [],
      lastPingTime: null,

      connect: (url, token) => {
        const { ws, status, reconnectTimer } = get();
        
        // Clear any existing reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          set({ reconnectTimer: null });
        }
        
        // Don't reconnect if already connected/connecting
        if (ws && (status === 'connected' || status === 'connecting')) {
          return;
        }

        set({ status: 'connecting' });

        try {
          // Add token to URL if provided (for WebSocket auth)
          const wsUrl = token ? `${url}?token=${token}` : url;
          const websocket = new WebSocket(wsUrl);

          websocket.onopen = () => {
            console.log('WebSocket connected');
            set({ 
              status: 'connected', 
              reconnectAttempts: 0,
              lastPingTime: Date.now()
            });
            
            // Process queued messages
            get().processQueue();
            
            // Start heartbeat
            get().startHeartbeat();
          };

          websocket.onclose = (event) => {
            console.log('WebSocket disconnected', event.code, event.reason);
            set({ status: 'disconnected', ws: null, lastPingTime: null });
            
            // Auto-reconnect unless it was a clean close
            if (event.code !== 1000 && get().reconnectAttempts < get().maxReconnectAttempts) {
              get().scheduleReconnect(url, token);
            }
          };

          websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            set({ status: 'error' });
          };

          websocket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              get().handleMessage(data);
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };

          set({ ws: websocket });
        } catch (error) {
          console.error('Failed to create WebSocket:', error);
          set({ status: 'error' });
          get().scheduleReconnect(url, token);
        }
      },

      disconnect: () => {
        const { ws, reconnectTimer } = get();
        
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          set({ reconnectTimer: null });
        }
        
        if (ws) {
          ws.close(1000, 'Client disconnect');
          set({ ws: null, status: 'disconnected', reconnectAttempts: 0 });
        }
      },

      send: (type, payload) => {
        const { ws, status } = get();
        
        const message = { type, payload };
        
        if (ws && status === 'connected') {
          ws.send(JSON.stringify(message));
        } else {
          console.warn('WebSocket not connected, queueing message');
          set((state) => ({
            messageQueue: [...state.messageQueue, message]
          }));
        }
      },

      sendMessage: async (conversationId, recipientId, content) => {
        const clientId = generateClientId();
        
        // Save to IndexedDB immediately
        const message: DBMessage = {
          clientId,
          conversationId,
          senderId: 0, // Will be set from auth
          recipientId,
          content,
          messageType: 'text',
          status: 'pending',
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isEncrypted: false,
        };
        
        await messageDB.addMessage(message);
        
        // Send via WebSocket
        get().send('chat', {
          client_id: clientId,
          conversation_id: conversationId,
          recipient_id: recipientId,
          content,
          message_type: 'text',
        });
        
        return clientId;
      },

      syncConversations: (conversations) => {
        get().send('sync', {
          conversations: conversations.map(conv => ({
            conversation_id: conv.conversationId,
            last_message_id: conv.lastMessageId,
            last_seen_at: Date.now(),
          })),
        });
      },

      processQueue: () => {
        const { ws, status, messageQueue } = get();
        
        if (ws && status === 'connected' && messageQueue.length > 0) {
          console.log(`Processing ${messageQueue.length} queued messages`);
          
          messageQueue.forEach((msg) => {
            ws.send(JSON.stringify(msg));
          });
          
          set({ messageQueue: [] });
        }
      },

      scheduleReconnect: (url, token) => {
        const { reconnectAttempts, maxReconnectAttempts } = get();
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          set({ status: 'error' });
          return;
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 32000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        const timer = setTimeout(() => {
          set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
          get().connect(url, token);
        }, delay);
        
        set({ reconnectTimer: timer });
      },

      startHeartbeat: () => {
        const interval = setInterval(() => {
          const { ws, status } = get();
          
          if (!ws || status !== 'connected') {
            clearInterval(interval);
            return;
          }
          
          // Send ping
          try {
            ws.send(JSON.stringify({ type: 'ping', payload: {} }));
            set({ lastPingTime: Date.now() });
          } catch (error) {
            console.error('Failed to send ping:', error);
          }
        }, 30000); // Ping every 30 seconds
      },

      handleMessage: async (data: any) => {
        switch (data.type) {
          case 'ack':
            // Update message status in IndexedDB
            if (data.client_id) {
              await messageDB.updateMessage(data.client_id, {
                id: data.server_id,
                status: data.status,
                updatedAt: Date.now(),
              });
            }
            break;
            
          case 'message':
            // New message received, save to IndexedDB
            const msg = data.message;
            await messageDB.addMessage({
              clientId: msg.client_id || generateClientId(),
              id: msg.id,
              conversationId: msg.conversation_id,
              senderId: msg.sender_id,
              recipientId: msg.recipient_id,
              content: msg.content,
              messageType: msg.message_type,
              status: 'delivered',
              version: msg.version || 1,
              createdAt: new Date(msg.created_at).getTime(),
              updatedAt: Date.now(),
              isEncrypted: msg.is_encrypted || false,
            });
            break;
            
          case 'sync_response':
            // Handle sync response
            const { conversation_id, messages } = data;
            if (messages && messages.length > 0) {
              await messageDB.batchAddMessages(
                messages.map((m: any) => ({
                  clientId: m.client_id || generateClientId(),
                  id: m.id,
                  conversationId: conversation_id,
                  senderId: m.sender_id,
                  recipientId: m.recipient_id,
                  content: m.content,
                  messageType: m.message_type,
                  status: m.status,
                  version: m.version || 1,
                  createdAt: new Date(m.created_at).getTime(),
                  updatedAt: Date.now(),
                  isEncrypted: m.is_encrypted || false,
                }))
              );
            }
            break;
            
          case 'typing':
            // Handle typing indicator (emit event or update state)
            break;
            
          case 'error':
            console.error('WebSocket error from server:', data);
            break;
            
          case 'pong':
            // Heartbeat response
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      },

      setStatus: (status) => set({ status }),
      
      incrementReconnectAttempts: () =>
        set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
      
      resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
    }),
    { name: 'WebSocketStore' }
  )
);
