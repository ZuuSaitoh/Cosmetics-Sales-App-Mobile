import { chatService } from "@/src/services/chatService";
import { userService } from "@/src/services/userService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface UserListItem {
  id: number;
  fullName: string;
  avatarUrl: string | null;
}

export interface ChatRoomResponse {
  roomId: number;
  partnerId: number;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

const DEBOUNCE_MS = 500;

type JwtPayload = {
  sub?: string | number;
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
};

const getCurrentUserIdFromToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem("cosmate_token");
  if (!token) return null;

  try {
    const payload = jwtDecode<JwtPayload>(token);
    const rawUserId =
      payload.sub ?? payload.id ?? payload.userId ?? payload.user_id;
    if (rawUserId === undefined || rawUserId === null) return null;
    const normalized = String(rawUserId).trim();
    return normalized || null;
  } catch (error) {
    console.warn("jwtDecode error", error);
    return null;
  }
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const asUserList = (data: unknown): UserListItem[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => item as Partial<UserListItem>)
    .filter(
      (item): item is UserListItem =>
        typeof item.id === "number" && typeof item.fullName === "string",
    )
    .map((item) => ({
      id: item.id,
      fullName: item.fullName,
      avatarUrl: item.avatarUrl ?? null,
    }));
};

const asRoomList = (data: unknown): ChatRoomResponse[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => item as Partial<ChatRoomResponse>)
    .filter(
      (item): item is ChatRoomResponse =>
        typeof item.roomId === "number" &&
        typeof item.partnerId === "number" &&
        typeof item.partnerName === "string",
    )
    .map((item) => ({
      roomId: item.roomId,
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      partnerAvatar: item.partnerAvatar ?? null,
      lastMessageAt: item.lastMessageAt ?? null,
      unreadCount: item.unreadCount ?? 0,
    }));
};

const formatTime = (value: string | null) => {
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

export default function ChatInboxScreen() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredRooms = useMemo(() => {
    if (filter === "unread")
      return rooms.filter((room) => room.unreadCount > 0);
    return rooms;
  }, [filter, rooms]);

  const loadRooms = useCallback(
    async (userId?: string) => {
      try {
        const resolvedUserId = userId ?? currentUserId;
        if (!resolvedUserId) return;
        const response = await chatService.getRooms(Number(resolvedUserId));
        setRooms(asRoomList(response.data?.result ?? response.data));
      } catch (err) {
        console.warn("loadRooms error", err);
      } finally {
        setLoadingRooms(false);
        setRefreshing(false);
      }
    },
    [currentUserId],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const init = async () => {
        setError(null);
        setLoadingRooms(true);

        const userId = await getCurrentUserIdFromToken();
        if (!active) return;

        if (!userId) {
          setError("Không tìm thấy userId trong token đăng nhập.");
          setLoadingRooms(false);
          return;
        }

        setCurrentUserId(userId);
        await loadRooms(userId);
      };

      init();

      return () => {
        active = false;
      };
    }, [loadRooms]),
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const keyword = searchText.trim();
    if (!keyword) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await userService.searchUsers(keyword);
        setSearchResults(asUserList(response.data?.result ?? response.data));
      } catch (err) {
        console.warn("search users error", err);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  const handleCreateOrGetRoom = async (partner: UserListItem) => {
    try {
      const resolvedUserId = currentUserId;
      if (!resolvedUserId) {
        setError("Không tìm thấy userId trong token đăng nhập.");
        return;
      }

      const response = await chatService.getOrCreateRoom(
        Number(resolvedUserId),
        partner.id,
      );
      const roomId = toNumber(response.data?.result?.id ?? response.data?.id);
      if (!roomId) return;

      router.push({
        pathname: "/chat/[roomId]",
        params: {
          roomId: String(roomId),
          partnerId: String(partner.id),
          partnerName: partner.fullName,
          partnerAvatar: partner.avatarUrl ?? "",
        },
      } as any);
    } catch (err) {
      console.warn("handleCreateOrGetRoom error", err);
    }
  };

  const renderRoomAvatar = (room: ChatRoomResponse) => (
    <Pressable
      key={room.roomId}
      style={styles.avatarItem}
      onPress={() =>
        router.push({
          // @ts-ignore
          pathname: "/chat/[roomId]",
          params: {
            roomId: String(room.roomId),
            partnerId: String(room.partnerId),
            partnerName: room.partnerName,
          },
        })
      }
    >
      {room.partnerAvatar ? (
        <Image source={{ uri: room.partnerAvatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={20} color="#8E7AB5" />
        </View>
      )}
      <Text style={styles.avatarName} numberOfLines={2}>
        {room.partnerName}
      </Text>
    </Pressable>
  );

  const renderUserResult = ({ item }: { item: UserListItem }) => (
    <Pressable
      style={styles.resultItem}
      onPress={() => handleCreateOrGetRoom(item)}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.resultAvatar} />
      ) : (
        <View style={styles.resultAvatarFallback}>
          <Ionicons name="person" size={20} color="#8E7AB5" />
        </View>
      )}
      <View style={styles.resultContent}>
        <Text style={styles.resultName}>{item.fullName}</Text>
        <Text style={styles.resultHint}>Chạm để nhắn tin</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4B9DF" />
    </Pressable>
  );

  const renderRoomItem = ({ item }: { item: ChatRoomResponse }) => (
    <Pressable
      style={styles.roomItem}
      onPress={() =>
        router.push({
          // @ts-ignore
          // @ts-ignore
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
        <Image source={{ uri: item.partnerAvatar }} style={styles.roomAvatar} />
      ) : (
        <View style={styles.roomAvatarFallback}>
          <Ionicons name="person" size={22} color="#8E7AB5" />
        </View>
      )}
      <View style={styles.roomContent}>
        <Text style={styles.roomName} numberOfLines={1}>
          {item.partnerName}
        </Text>
        <Text style={styles.roomMessage} numberOfLines={1}>
          {item.unreadCount > 0 ? `${item.unreadCount} chưa đọc · ` : ""}
          {formatTime(item.lastMessageAt) || "Chưa có tin nhắn"}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.unreadCount > 99 ? "99+" : item.unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>
            Nhắn tin realtime với cosplayer, provider, staff
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#A090C5" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm người dùng..."
          placeholderTextColor="#A090C5"
          style={styles.searchInput}
        />
        {loadingSearch && <ActivityIndicator size="small" color="#B59DFF" />}
      </View>

      {searchText.trim().length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderUserResult}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loadingSearch ? null : (
                <Text style={styles.emptyText}>
                  Không tìm thấy người dùng phù hợp.
                </Text>
              )
            }
          />
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.avatarStripScroll}
        contentContainerStyle={styles.avatarRow}
      >
        {rooms.slice(0, 10).map(renderRoomAvatar)}
      </ScrollView>

      <View style={styles.chatListSection}>
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterBadge,
              filter === "all" && styles.filterBadgeActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              Tất cả
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterBadge,
              filter === "unread" && styles.filterBadgeActive,
            ]}
            onPress={() => setFilter("unread")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "unread" && styles.filterTextActive,
              ]}
            >
              Chưa đọc
            </Text>
          </Pressable>
        </View>

        {loadingRooms ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#B59DFF" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            style={styles.roomFlatList}
            data={filteredRooms}
            keyExtractor={(item) => String(item.roomId)}
            renderItem={renderRoomItem}
            contentContainerStyle={
              filteredRooms.length === 0 ? styles.emptyList : styles.roomList
            }
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRooms();
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {rooms.length === 0
                  ? "Chưa có cuộc trò chuyện nào."
                  : "Không có tin nhắn chưa đọc."}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#4A3B6B" },
  subtitle: { marginTop: 4, color: "#8E7AB5", maxWidth: 260 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  searchInput: { flex: 1, color: "#2E2446", fontSize: 15 },
  dropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE7FF",
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F1FF",
  },
  resultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1ECFF",
  },
  resultAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  resultContent: { flex: 1 },
  resultName: { color: "#2E2446", fontWeight: "700" },
  resultHint: { marginTop: 2, color: "#7A6B98", fontSize: 12 },
  avatarStripScroll: { flexGrow: 0, flexShrink: 0 },
  avatarRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 10,
    alignItems: "flex-start",
  },
  chatListSection: { flex: 1, minHeight: 0 },
  roomFlatList: { flex: 1 },
  avatarItem: { width: 68, alignItems: "center" },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F1ECFF",
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    marginTop: 6,
    fontSize: 11,
    color: "#4A3B6B",
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  filterBadge: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFE8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: { backgroundColor: "#B59DFF" },
  filterText: { color: "#7A6B98", fontWeight: "700" },
  filterTextActive: { color: "#FFFFFF" },
  roomList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 10,
    flexGrow: 0,
  },
  emptyList: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    flexGrow: 0,
  },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  roomAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1ECFF",
  },
  roomAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  roomContent: { flex: 1 },
  roomName: { color: "#2E2446", fontWeight: "800", fontSize: 15 },
  roomMessage: { marginTop: 4, color: "#7A6B98", fontSize: 13 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { color: "#7A6B98", textAlign: "center" },
  errorText: { color: "#E24C4C", textAlign: "center" },
});
