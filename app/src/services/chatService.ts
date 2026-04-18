import axiosClient from "../api/axiosClient";

export const chatService = {
  getRooms: (userId: number) =>
    axiosClient.get(`/chat/rooms/user/${userId}`),

  getOrCreateRoom: (params: { userId: number; providerId: number } | { user1Id: number; user2Id: number }) =>
    axiosClient.get("/chat/room", { params: { userId: (params as any).userId ?? (params as any).user1Id, providerId: (params as any).providerId ?? (params as any).user2Id } }),

  getMessages: (roomId: number) =>
    axiosClient.get(`/chat/messages/${roomId}`),

  sendMessage: (data: { roomId: number; senderId: number; messageType: string; content: string }) =>
    axiosClient.post("/chat/messages", data),

  markAsRead: (roomId: number, currentUserId: number) =>
    axiosClient.post(`/chat/room/${roomId}/read`, null, {
      params: { currentUserId },
    }),
};