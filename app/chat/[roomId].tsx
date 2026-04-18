import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Client, IMessage } from "@stomp/stompjs";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axiosClient, { API_BASE_URL, WS_BASE_URL } from "../api/axiosClient";

const textEncoding = require("text-encoding");
(global as typeof globalThis & { TextEncoder: typeof textEncoding.TextEncoder }).TextEncoder =
  textEncoding.TextEncoder;
(global as typeof globalThis & { TextDecoder: typeof textEncoding.TextDecoder }).TextDecoder =
  textEncoding.TextDecoder;

type ChatMessageResponse = {
  id: number;
  roomId: number;
  senderId: number;
  messageType: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type ChatMessageRequest = {
  roomId: number;
  senderId: number;
  messageType: string;
  content: string;
};

type RouteParams = {
  roomId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerRole?: string;
};

type ChatPartner = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string | null;
};

type JwtPayload = {
  sub?: string | number;
  userId?: string | number;
  id?: string | number;
};

const normalizeId = (value: unknown) => (value === undefined || value === null ? "" : String(value));

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const asChatMessageArray = (data: unknown): ChatMessageResponse[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => item as Partial<ChatMessageResponse>)
    .filter(
      (item): item is ChatMessageResponse =>
        typeof item.id === "number" &&
        typeof item.roomId === "number" &&
        typeof item.senderId === "number" &&
        typeof item.messageType === "string" &&
        typeof item.content === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.isRead === "boolean",
    );
};

const safeString = (value: unknown) => (typeof value === "string" ? value : null);

export default function ChatRoomScreen() {
  const { roomId, partnerId, partnerName, partnerAvatar, partnerRole } = useLocalSearchParams<RouteParams>();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [partner] = useState<ChatPartner>({
    id: parseNumber(partnerId) ?? 0,
    name: safeString(partnerName) ?? "",
    avatarUrl: safeString(partnerAvatar),
    role: safeString(partnerRole),
  });
  const stompClientRef = useRef<Client | null>(null);
  const pendingMessagesRef = useRef<ChatMessageRequest[]>([]);
  const flatListRef = useRef<FlatList<ChatMessageResponse>>(null);

  const roomKey = useMemo(() => parseNumber(roomId), [roomId]);

  const fetchChatHistory = async (targetRoomId: number) => {
    try {
      const response = await axiosClient.get(`/chat/messages/${targetRoomId}`);
      const result = response.data?.result ?? [];
      const content = Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
      setMessages(asChatMessageArray(content));
    } catch (error) {
      console.warn("Load chat history failed", error);
      setMessages([
        {
          id: -1,
          roomId: targetRoomId,
          senderId: 0,
          messageType: "TEXT",
          content: "Lỗi tải tin nhắn",
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("cosmate_token");
        if (token) {
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const userId = decoded.sub ?? decoded.userId ?? decoded.id;
            if (userId !== undefined && userId !== null) {
              const normalizedUserId = String(userId);
              setCurrentUserId(normalizedUserId);
              await AsyncStorage.setItem("cosmate_user_id", normalizedUserId);
            }
          } catch (decodeError) {
            console.warn("jwtDecode failed", decodeError);
          }
        }

        if (roomKey === null) return;

        await fetchChatHistory(roomKey);
      } catch (error) {
        console.warn("Init chat screen failed", error);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [roomKey]);

  useEffect(() => {
    if (roomKey === null) return;

    let mounted = true;
    let client: Client | null = null;

    const initWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("cosmate_token");
        if (!token) {
          console.error("Missing token for websocket connection");
          return;
        }
        if (!mounted) return;

        client = new Client({
          webSocketFactory: () => new WebSocket(WS_BASE_URL),
          connectHeaders: {
            Authorization: "Bearer " + token,
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            client?.subscribe(`/topic/room/${roomKey}`, (message: IMessage) => {
              try {
                const payload = JSON.parse(message.body) as ChatMessageResponse;
                setMessages((prev) => [payload, ...prev]);
              } catch (error) {
                console.warn("Parse websocket message failed", error);
              }
            });

            pendingMessagesRef.current.forEach((payload) => {
              client?.publish({
                destination: "/app/chat.sendMessage",
                body: JSON.stringify(payload),
              });
            });
            pendingMessagesRef.current = [];
          },
          onStompError: (frame) => {
            console.warn("STOMP error", frame.headers["message"], frame.body);
          },
        });

        stompClientRef.current = client;
        client.activate();
      } catch (error) {
        console.error("Unable to initialize websocket", error);
      }
    };

    void initWebSocket();

    return () => {
      mounted = false;
      void client?.deactivate();
      stompClientRef.current = null;
    };
  }, [roomKey]);

  const publishChatMessage = (payload: ChatMessageRequest) => {
    const client = stompClientRef.current;
    if (client?.connected) {
      client.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify(payload),
      });
      return;
    }

    pendingMessagesRef.current.push(payload);
    client?.activate();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || roomKey === null) return;

    setSending(true);
    try {
      const payload: ChatMessageRequest = {
        roomId: roomKey,
        senderId: Number(currentUserId),
        messageType: "TEXT",
        content: text,
      };

      await axiosClient.post("/chat/messages", payload);
      setInput("");
      await fetchChatHistory(roomKey);
    } catch (error) {
      console.warn("Lỗi gửi tin nhắn:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn lúc này.");
    } finally {
      setSending(false);
    }
  };

  const handlePickAndSendImage = async () => {
    if (roomKey === null) return;

    const token = await AsyncStorage.getItem("cosmate_token");
    if (!token) {
      console.error("Missing token for image upload");
      Alert.alert("Chưa đăng nhập", "Không có token để tải ảnh lên.");
      return;
    }

    const currentId = Number(currentUserId);
    if (!currentUserId || !currentId) {
      console.error("Missing currentUserId for image upload");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để gửi ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.fileName ?? `chat-${Date.now()}.jpg`;
    const match = /\.([A-Za-z0-9]+)$/.exec(filename);
    const ext = match?.[1]?.toLowerCase();
    const mimeType = asset.mimeType ?? (ext === "png" ? "image/png" : "image/jpeg");

    try {
      const formData = new FormData();
      formData.append("roomId", String(roomKey));

      if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("file", blob, filename);
      } else {
        formData.append("file", {
          uri,
          name: filename,
          type: mimeType,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/chat/upload-image`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
        body: formData,
      });
      const data = await response.json();
      const imageUrl = data?.result?.url || data?.result || data?.url;
      if (!imageUrl || typeof imageUrl !== "string") {
        console.warn("Upload image response missing url", data);
        Alert.alert("Upload ảnh thất bại", "Backend không trả về URL ảnh hợp lệ.");
        return;
      }

      await axiosClient.post("/chat/messages", {
        roomId: roomKey,
        senderId: currentId,
        messageType: "IMAGE",
        content: imageUrl,
      });
      await fetchChatHistory(roomKey);
    } catch (error) {
      console.warn("Upload image failed", error);
      Alert.alert("Upload ảnh lỗi", "Không upload được ảnh. Hãy kiểm tra mạng và backend.");
    }
  };

  const renderItem = ({ item }: { item: ChatMessageResponse }) => {
    const isMine = normalizeId(item.senderId) === currentUserId;
    const isImage = item.messageType === "IMAGE";

    return (
      <View style={[styles.messageRow, isMine ? styles.mineRow : styles.otherRow]}>
        <View style={[styles.bubble, isMine ? styles.mineBubble : styles.otherBubble]}>
          {isImage ? (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          ) : (
            <Text style={[styles.messageText, isMine ? styles.mineText : styles.otherText]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#2E2446" />
        </Pressable>

        <View style={styles.headerUser}>
          {partner.avatarUrl ? (
            <Image source={{ uri: partner.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Ionicons name="person" size={18} color="#8E7AB5" />
            </View>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {partner.name || `Phòng ${roomKey}`}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {partner.role || "Nhấn vào để xem hồ sơ"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={100}
        >
          <FlatList
            ref={flatListRef}
            inverted={true}
            data={messages}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? styles.emptyContent : styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>}
          />

          <View style={styles.inputBar}>
            <Pressable style={styles.mediaBtn} onPress={handlePickAndSendImage}>
              <Ionicons name="camera" size={20} color="#8E7AB5" />
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#A090C5"
              multiline
            />
            <Pressable
              style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7FF",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F1ECFF" },
  headerAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F1ECFF", alignItems: "center", justifyContent: "center" },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: "#2E2446" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#8E7AB5" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 10 },
  emptyContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  emptyText: { color: "#7A6B98" },
  messageRow: { flexDirection: "row" },
  mineRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  mineBubble: { backgroundColor: "#B59DFF", borderBottomRightRadius: 6 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 6, borderWidth: 1, borderColor: "#EEE7FF" },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageImage: { width: 220, height: 220, borderRadius: 14, backgroundColor: "#EEE7FF" },
  mineText: { color: "#FFFFFF" },
  otherText: { color: "#2E2446" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE7FF",
  },
  mediaBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F3EEFF", alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#F8F5FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#2E2446",
    borderWidth: 1,
    borderColor: "#E6DBFF",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#B59DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});
