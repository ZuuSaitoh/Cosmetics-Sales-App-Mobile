export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  content?: string;
  body?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
}
