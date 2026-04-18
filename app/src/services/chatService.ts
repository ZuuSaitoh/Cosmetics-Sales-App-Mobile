import axiosClient from "../api/axiosClient";

export const chatService = {
  getRooms: (userId: number) =>
    axiosClient.get(`/chat/rooms/user/${userId}`),

  getOrCreateRoom: (user1Id: number, user2Id: number) =>
    axiosClient.get("/chat/room", { params: { user1Id, user2Id } }),

  getMessages: (roomId: number) =>
    axiosClient.get(`/chat/messages/${roomId}`),

  sendMessage: (data: { roomId: number; senderId: number; messageType: string; content: string }) =>
    axiosClient.post("/chat/messages", data),

  markAsRead: (roomId: number, currentUserId: number) =>
    axiosClient.post(`/chat/room/${roomId}/read`, null, {
      params: { currentUserId },
    }),
};