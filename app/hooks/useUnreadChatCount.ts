import { chatService } from "@/src/services/chatService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect, useState } from "react";

let cachedCount = 0;
const listeners: Set<(count: number) => void> = new Set();

export const useUnreadChatCount = () => {
  const [count, setCount] = useState(cachedCount);

  const fetchCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId = decoded.userId || decoded.sub;

      const res = await chatService.getRooms(Number(userId));
      const rooms = res.data?.result ?? res.data ?? [];
      const totalUnread = Array.isArray(rooms)
        ? rooms.reduce((sum: number, r: any) => sum + (r.unreadCount || 0), 0)
        : 0;

      cachedCount = totalUnread;
      setCount(totalUnread);
      listeners.forEach((cb) => cb(totalUnread));
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const subscription = DeviceEventEmitter.addListener("refreshUnreadCount", fetchCount);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchCount]);

  return { count, refresh: fetchCount };
};

export const refreshUnreadCount = async () => {
  try {
    const token = await AsyncStorage.getItem("cosmate_token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId = decoded.userId || decoded.sub;

    const res = await chatService.getRooms(Number(userId));
    const rooms = res.data?.result ?? res.data ?? [];
    const totalUnread = Array.isArray(rooms)
      ? rooms.reduce((sum: number, r: any) => sum + (r.unreadCount || 0), 0)
      : 0;

    cachedCount = totalUnread;
    listeners.forEach((cb) => cb(totalUnread));
  } catch {
    // Silently fail
  }
};
