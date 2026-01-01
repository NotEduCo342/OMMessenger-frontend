import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketState {
  ws: WebSocket | null;
  status: ConnectionStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  send: (data: any) => void;
  setStatus: (status: ConnectionStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
}

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set, get) => ({
      ws: null,
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,

      connect: (url) => {
        const { ws, status } = get();
        
        // Don't reconnect if already connected/connecting
        if (ws && (status === 'connected' || status === 'connecting')) {
          return;
        }

        set({ status: 'connecting' });

        try {
          const websocket = new WebSocket(url);

          websocket.onopen = () => {
            console.log('WebSocket connected');
            set({ status: 'connected', reconnectAttempts: 0 });
          };

          websocket.onclose = () => {
            console.log('WebSocket disconnected');
            set({ status: 'disconnected', ws: null });
          };

          websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            set({ status: 'error' });
          };

          set({ ws: websocket });
        } catch (error) {
          console.error('Failed to create WebSocket:', error);
          set({ status: 'error' });
        }
      },

      disconnect: () => {
        const { ws } = get();
        if (ws) {
          ws.close();
          set({ ws: null, status: 'disconnected' });
        }
      },

      send: (data) => {
        const { ws, status } = get();
        if (ws && status === 'connected') {
          ws.send(JSON.stringify(data));
        } else {
          console.warn('WebSocket is not connected');
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
