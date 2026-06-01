export interface ChatRoom {
  id: number;
  userId: number;
  providerId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  partner?: ChatPartner;
}

export interface ChatPartner {
  id: number;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  messageType: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface SendMessagePayload {
  roomId: number;
  senderId: number;
  messageType: string;
  content: string;
}
