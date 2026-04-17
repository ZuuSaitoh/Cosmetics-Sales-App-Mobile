import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Client, IMessage } from "@stomp/stompjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import axiosClient from "../api/axiosClient";

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


const normalizeId = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getCurrentUserId = async (): Promise<string | null> => {
  const value = await AsyncStorage.getItem("cosmate_user_id");
  return value && value.trim() ? value.trim() : null;
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

export default function ChatRoomScreen() {
  const { roomId, partnerId, partnerName, partnerAvatar, partnerRole } = useLocalSearchParams<RouteParams>();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [partner, setPartner] = useState<ChatPartner>({
    id: 0,
    name: String(partnerName ?? ""),
    avatarUrl: partnerAvatar ?? null,
    role: partnerRole ?? null,
  });
  const stompClientRef = useRef<Client | null>(null);
  const flatListRef = useRef<FlatList<ChatMessageResponse>>(null);

  const roomKey = useMemo(() => parseNumber(roomId), [roomId]);

  useEffect(() => {
    const init = async () => {
      try {
        const storedUserId = await getCurrentUserId();
        if (storedUserId) setCurrentUserId(storedUserId);

        if (roomKey === null) return;

        const response = await axiosClient.get(`/chat/messages/${roomKey}`);
        const data = response.data?.result ?? response.data ?? [];
        setMessages(asChatMessageArray(data));
      } catch (error) {
        console.warn("Load chat history failed", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [roomKey]);

  useEffect(() => {
    if (roomKey === null) return;

    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("cosmate_token");
        if (!token) {
          console.warn("STOMP token is empty or missing");
          return;
        }
        if (!mounted) return;

        const client = new Client({
          brokerURL: "ws://10.88.54.16:8080/ws-mobile",
          connectHeaders: {
            Authorization: "Bearer " + token,
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            client.subscribe(`/topic/room/${roomKey}`, (message: IMessage) => {
              try {
                const payload = JSON.parse(message.body) as ChatMessageResponse;
                setMessages((prev) => [...prev, payload]);
              } catch (error) {
                console.warn("Parse websocket message failed", error);
              }
            });
          },
          onStompError: (frame) => {
            console.warn("STOMP error", frame.headers["message"], frame.body);
          },
        });

        stompClientRef.current = client;
        client.activate();
      } catch (error) {
        console.warn("Unable to connect STOMP", error);
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      void stompClientRef.current?.deactivate();
      stompClientRef.current = null;
    };
  }, [roomKey]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !stompClientRef.current?.connected || roomKey === null) return;

    setSending(true);
    try {
      const payload: ChatMessageRequest = {
        roomId: roomKey,
        senderId: Number(currentUserId) || Number(partnerId) || 0,
        messageType: "TEXT",
        content: text,
      };

      stompClientRef.current.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify(payload),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const onHeaderPress = () => {
    const partnerIdValue = parseNumber(partnerId) ?? partner.id;
    if (!partnerIdValue) return;

    const roleValue = String(partner.role ?? "").toUpperCase();
    const isRental = roleValue === "PROVIDER_RENTAL" || roleValue === "5";
    const isPhotographer = roleValue === "PROVIDER_PHOTOGRAPH" || roleValue === "6";
    const isEventStaff = roleValue === "PROVIDER_EVENT_STAFF" || roleValue === "7";

    if (isRental) {
      router.push({ pathname: "/provider-rental-shop", params: { providerId: String(partnerIdValue) } });
      return;
    }

    if (isPhotographer) {
      router.push({ pathname: "/photographer", params: { providerId: String(partnerIdValue) } });
      return;
    }

    if (isEventStaff) {
      router.push({ pathname: "/event-staff", params: { providerId: String(partnerIdValue) } });
      return;
    }

    router.push("/profile/" + String(partnerIdValue));
  };

  const renderItem = ({ item }: { item: ChatMessageResponse }) => {
    const isMine = normalizeId(item.senderId) === currentUserId;
    return (
      <View style={[styles.messageRow, isMine ? styles.mineRow : styles.otherRow]}>
        <View style={[styles.bubble, isMine ? styles.mineBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMine ? styles.mineText : styles.otherText]}>
            {item.content}
          </Text>
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

        <Pressable style={styles.headerUser} onPress={onHeaderPress}>
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
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? styles.emptyContent : styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>}
          />

          <View style={styles.inputBar}>
            <Pressable style={styles.mediaBtn} onPress={() => console.log("open media picker") }>
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
