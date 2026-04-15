import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../axiosClient";

// --- LẤY DANH SÁCH PHÒNG CHAT CỦA USER ---
export const getChatRooms = async (userId: number) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.get(`/chat/rooms/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- LẤY TIN NHẮN TRONG PHÒNG ---
export const getMessages = async (roomId: number) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.get(`/chat/messages/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- GỬI TIN NHẮN ---
export const sendMessage = async (roomId: number, content: string) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.post(
    `/chat/send`,
    { roomId, content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// --- TÌM HOẶC TẠO PHÒNG CHAT ---
export const findOrCreateRoom = async (user1Id: number, user2Id: number) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.get(`/chat/room?user1Id=${user1Id}&user2Id=${user2Id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- ĐÁNH DẤU PHÒNG LÀ ĐÃ ĐỌC ---
export const markRoomAsRead = async (roomId: number) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.post(`/chat/room/${roomId}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- LẤY SỐ TIN NHẮN CHƯA ĐỌC ---
export const getUnreadCount = async (userId: number) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  const res = await axiosClient.get(`/chat/unread-count/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- UPLOAD ẢNH TRONG CHAT ---
export const uploadChatImage = async (roomId: number, uri: string, fileName: string) => {
  const token = await AsyncStorage.getItem("cosmate_token");

  const formData = new FormData();
  formData.append("roomId", String(roomId));
  formData.append("file", {
    uri,
    type: "image/jpeg",
    name: fileName || `chat-img-${Date.now()}.jpg`,
  } as any);

  const res = await axiosClient.post(`/chat/upload-image`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};
