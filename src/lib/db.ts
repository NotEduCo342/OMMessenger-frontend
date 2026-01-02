import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema version
const DB_NAME = 'OMMessenger';
const DB_VERSION = 1;

// Types
export interface DBMessage {
  id?: number; // Server ID (undefined if not yet sent)
  clientId: string; // UUID generated on client
  conversationId: string;
  senderId: number;
  recipientId?: number;
  groupId?: number;
  content: string;
  messageType: 'text' | 'image' | 'file';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  version: number;
  createdAt: number; // Unix timestamp
  updatedAt: number;
  isEncrypted: boolean;
}

export interface DBConversation {
  id: string; // "user_123" or "group_456"
  type: 'direct' | 'group';
  participantIds: number[];
  lastMessageId?: number;
  lastMessageAt?: number;
  unreadCount: number;
  isSynced: boolean;
  lastSyncAt?: number;
}

export interface DBSyncState {
  key: string; // "last_sync" or conversation-specific
  conversationId?: string;
  lastMessageId?: number;
  lastSyncAt: number;
  pendingCount: number;
}

// IndexedDB Schema
interface OMMessengerDB extends DBSchema {
  messages: {
    key: string; // clientId
    value: DBMessage;
    indexes: {
      'by-conversation': string; // conversationId
      'by-server-id': number; // id (server ID)
      'by-status': string; // status
      'by-created': number; // createdAt
      'by-conversation-created': [string, number]; // [conversationId, createdAt]
    };
  };
  conversations: {
    key: string; // conversation ID
    value: DBConversation;
    indexes: {
      'by-last-message': number; // lastMessageAt
    };
  };
  syncState: {
    key: string;
    value: DBSyncState;
  };
}

class MessageDB {
  private db: IDBPDatabase<OMMessengerDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<OMMessengerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', {
            keyPath: 'clientId',
          });
          messageStore.createIndex('by-conversation', 'conversationId');
          messageStore.createIndex('by-server-id', 'id');
          messageStore.createIndex('by-status', 'status');
          messageStore.createIndex('by-created', 'createdAt');
          messageStore.createIndex('by-conversation-created', [
            'conversationId',
            'createdAt',
          ]);
        }

        // Create conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', {
            keyPath: 'id',
          });
          convStore.createIndex('by-last-message', 'lastMessageAt');
        }

        // Create sync state store
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'key' });
        }
      },
    });
  }

  private ensureDB(): IDBPDatabase<OMMessengerDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // ============ Messages ============

  async addMessage(message: DBMessage): Promise<void> {
    const db = this.ensureDB();
    await db.add('messages', message);
  }

  async updateMessage(clientId: string, updates: Partial<DBMessage>): Promise<void> {
    const db = this.ensureDB();
    const message = await db.get('messages', clientId);
    if (message) {
      await db.put('messages', { ...message, ...updates });
    }
  }

  async getMessage(clientId: string): Promise<DBMessage | undefined> {
    const db = this.ensureDB();
    return await db.get('messages', clientId);
  }

  async getMessageByServerId(serverId: number): Promise<DBMessage | undefined> {
    const db = this.ensureDB();
    return await db.getFromIndex('messages', 'by-server-id', serverId);
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<DBMessage[]> {
    const db = this.ensureDB();
    const messages = await db.getAllFromIndex(
      'messages',
      'by-conversation-created',
      IDBKeyRange.bound([conversationId, 0], [conversationId, Date.now()])
    );
    
    // Return most recent messages first
    return messages.reverse().slice(0, limit);
  }

  async getPendingMessages(): Promise<DBMessage[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('messages', 'by-status', 'pending');
  }

  async deleteMessage(clientId: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('messages', clientId);
  }

  // ============ Conversations ============

  async addConversation(conversation: DBConversation): Promise<void> {
    const db = this.ensureDB();
    await db.put('conversations', conversation);
  }

  async getConversation(id: string): Promise<DBConversation | undefined> {
    const db = this.ensureDB();
    return await db.get('conversations', id);
  }

  async getAllConversations(): Promise<DBConversation[]> {
    const db = this.ensureDB();
    const conversations = await db.getAll('conversations');
    
    // Sort by last message time, most recent first
    return conversations.sort((a, b) => 
      (b.lastMessageAt || 0) - (a.lastMessageAt || 0)
    );
  }

  async updateConversation(
    id: string,
    updates: Partial<DBConversation>
  ): Promise<void> {
    const db = this.ensureDB();
    const conversation = await db.get('conversations', id);
    if (conversation) {
      await db.put('conversations', { ...conversation, ...updates });
    }
  }

  // ============ Sync State ============

  async getSyncState(key: string): Promise<DBSyncState | undefined> {
    const db = this.ensureDB();
    return await db.get('syncState', key);
  }

  async setSyncState(state: DBSyncState): Promise<void> {
    const db = this.ensureDB();
    await db.put('syncState', state);
  }

  // ============ Batch Operations ============

  async batchAddMessages(messages: DBMessage[]): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all([
      ...messages.map((msg) => tx.store.add(msg)),
      tx.done,
    ]);
  }

  async clearConversation(conversationId: string): Promise<void> {
    const db = this.ensureDB();
    const messages = await db.getAllKeysFromIndex(
      'messages',
      'by-conversation',
      conversationId
    );
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all([
      ...messages.map((key) => tx.store.delete(key)),
      tx.done,
    ]);
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(['messages', 'conversations', 'syncState'], 'readwrite');
    await Promise.all([
      tx.objectStore('messages').clear(),
      tx.objectStore('conversations').clear(),
      tx.objectStore('syncState').clear(),
      tx.done,
    ]);
  }

  // ============ Utilities ============

  async getStats(): Promise<{
    totalMessages: number;
    pendingMessages: number;
    conversations: number;
  }> {
    const db = this.ensureDB();
    const [totalMessages, pendingMessages, conversations] = await Promise.all([
      db.count('messages'),
      db.countFromIndex('messages', 'by-status', 'pending'),
      db.count('conversations'),
    ]);
    return { totalMessages, pendingMessages, conversations };
  }
}

// Singleton instance
export const messageDB = new MessageDB();

// Helper to generate client IDs
export function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Conversation ID generators
export function getDirectConversationId(userId1: number, userId2: number): string {
  const [a, b] = [userId1, userId2].sort((x, y) => x - y);
  return `user_${a}_${b}`;
}

export function getGroupConversationId(groupId: number): string {
  return `group_${groupId}`;
}
