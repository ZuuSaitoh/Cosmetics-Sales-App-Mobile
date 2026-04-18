import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axiosClient from "@/src/api/axiosClient";
import { DeviceEventEmitter } from "react-native";

let cachedCount = 0;
const listeners: Set<(count: number) => void> = new Set();

export const useUnreadChatCount = () => {
  const [count, setCount] = useState(cachedCount);

  const fetchCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const activeId = decoded.providerId
        ? Number(decoded.providerId)
        : Number(decoded.sub);

      const res = await axiosClient.get(`/chat/unread-count/${activeId}`);
      if (res.data.code === 0) {
        const newCount = res.data.result || 0;
        cachedCount = newCount;
        setCount(newCount);
        listeners.forEach((cb) => cb(newCount));
      }
    } catch (error) {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll mỗi 30s để backup

    // Lắng nghe sự kiện "đã đọc tin nhắn" để đếm lại ngay lập tức thay vì chờ 30s
    const subscription = DeviceEventEmitter.addListener('refreshUnreadCount', fetchCount);

    return () => {
      clearInterval(interval);
      subscription.remove(); // Dọn dẹp bộ nhớ khi thoát
    };
  }, [fetchCount]);

  return { count, refresh: fetchCount };
};

// Gọi từ bất kỳ đâu khi có tin nhắn mới
export const refreshUnreadCount = async () => {
  try {
    const token = await AsyncStorage.getItem("cosmate_token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const activeId = decoded.providerId
      ? Number(decoded.providerId)
      : Number(decoded.sub);

    const res = await axiosClient.get(`/chat/unread-count/${activeId}`);
    if (res.data.code === 0) {
      const newCount = res.data.result || 0;
      cachedCount = newCount;
      listeners.forEach((cb) => cb(newCount));
    }
  } catch {
    // Silently fail
  }
};
