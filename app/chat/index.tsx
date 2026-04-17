import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

export interface ChatRoomResponse {
  roomId: number;
  partnerId: number;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

const USER_ID_KEYS = ["cosmate_user_id", "userId", "current_user_id", "currentUserId"] as const;

const getCurrentUserId = async (): Promise<string | null> => {
  for (const key of USER_ID_KEYS) {
    const value = await AsyncStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const formatLastMessageAt = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

const asChatRoomArray = (data: unknown): ChatRoomResponse[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => item as Partial<ChatRoomResponse>)
    .filter(
      (item): item is ChatRoomResponse =>
        typeof item.roomId === "number" &&
        typeof item.partnerId === "number" &&
        typeof item.partnerName === "string" &&
        typeof item.partnerAvatar !== "undefined" &&
        typeof item.lastMessageAt !== "undefined" &&
        typeof item.unreadCount === "number",
    );
};

export default function ChatListScreen() {
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      setError(null);
      const userId = await getCurrentUserId();
      if (!userId) {
        setRooms([]);
        setError("Không tìm thấy userId trong AsyncStorage. Vui lòng đăng nhập lại.");
        return;
      }

      const response = await axiosClient.get(`/chat/rooms/user/${userId}`);
      const data = response.data?.result ?? response.data;
      setRooms(asChatRoomArray(data));
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || "Không thể tải danh sách cuộc trò chuyện.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRooms();
    }, [loadRooms]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const renderItem = ({ item }: { item: ChatRoomResponse }) => (
    <Pressable
      style={styles.roomItem}
      onPress={() =>
        router.push({
          pathname: "/chat/[roomId]",
          params: {
            roomId: String(item.roomId),
            partnerId: String(item.partnerId),
            partnerName: item.partnerName,
            partnerAvatar: item.partnerAvatar ?? "",
          },
        })
      }
    >
      {item.partnerAvatar ? (
        <Image source={{ uri: item.partnerAvatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={22} color="#8E7AB5" />
        </View>
      )}

      <View style={styles.roomContent}>
        <Text style={styles.partnerName} numberOfLines={1}>
          {item.partnerName}
        </Text>
        <Text style={styles.subText} numberOfLines={1}>
          Chạm để mở cuộc trò chuyện
        </Text>
      </View>

      <View style={styles.metaWrap}>
        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
        <Text style={styles.timeText}>{formatLastMessageAt(item.lastMessageAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Tin nhắn 1-1 realtime</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.roomId)}
          renderItem={renderItem}
          contentContainerStyle={rooms.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7FF",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#4A3B6B" },
  subtitle: { marginTop: 4, color: "#8E7AB5" },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, padding: 16 },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F1ECFF" },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  roomContent: { flex: 1, marginLeft: 12, marginRight: 8 },
  partnerName: { fontSize: 16, fontWeight: "700", color: "#2E2446" },
  subText: { marginTop: 4, color: "#7A6B98", fontSize: 13 },
  metaWrap: { alignItems: "flex-end", gap: 6 },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#B59DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  timeText: { color: "#A090C5", fontSize: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#7A6B98", fontSize: 15, textAlign: "center" },
  errorText: { color: "#E24C4C", textAlign: "center", fontSize: 15 },
});
