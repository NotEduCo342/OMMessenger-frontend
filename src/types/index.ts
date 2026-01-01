export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id: number;
  senderId: number;
  sender: User;
  recipientId?: number;
  groupId?: number;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isDelivered: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: number;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface SendMessageInput {
  recipientId?: number;
  groupId?: number;
  content: string;
  messageType?: 'text' | 'image' | 'file';
}
