import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axiosClient from "../api/axiosClient";
import chatSocket from "../api/chat/chatSocket";
import { uploadChatImage } from "../api/chat/chatApi";
import { refreshUnreadCount } from "../../hooks/useUnreadChatCount";

export default function ChatDetailScreen() {
  const { roomId: paramRoomId, partnerId, partnerName } = useLocalSearchParams();

  const [activeRoomId, setActiveRoomId] = useState<number | null>(
    paramRoomId ? Number(paramRoomId) : null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [headerName, setHeaderName] = useState<string>(
    typeof partnerName === "string" ? partnerName : "Đang tải..."
  );
  const [headerAvatar, setHeaderAvatar] = useState<string>(
    "https://via.placeholder.com/150"
  );

  const flatListRef = useRef<FlatList>(null);
  const socketKeyRef = useRef<string | null>(null);

  // --- KẾT NỐI WEBSOCKET + TẢI TIN NHẮN ---
  useFocusEffect(
    useCallback(() => {
      initializeChat();

      return () => {
        // Ngắt subscribe khi rời màn hình
        if (socketKeyRef.current) {
          chatSocket.unsubscribe(socketKeyRef.current);
          socketKeyRef.current = null;
        }
      };
    }, [paramRoomId, partnerId])
  );

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const activeId = decoded.providerId
        ? Number(decoded.providerId)
        : Number(decoded.sub);
      setCurrentUserId(activeId);

      let currentRoom = activeRoomId;

      // Tìm hoặc tạo phòng chat nếu chưa có roomId
      if (!currentRoom && partnerId) {
        try {
          const roomRes = await axiosClient.get(
            `/chat/room?user1Id=${activeId}&user2Id=${partnerId}`
          );
          if (roomRes.data.code === 0 && roomRes.data.result) {
            currentRoom = roomRes.data.result.id;
            setActiveRoomId(currentRoom);
          }
        } catch (e) {
          console.error("Lỗi tạo/tìm phòng:", e);
        }
      }

      // Lấy thông tin đối tác cho header
      if (partnerId) {
        try {
          const partnerRes = await axiosClient.get(
            `/providers/id/${partnerId}`
          );
          if (partnerRes.data.code === 0 && partnerRes.data.result) {
            const pData = partnerRes.data.result;
            const finalName =
              partnerName && partnerName !== "undefined"
                ? (partnerName as string)
                : pData.shopName ||
                  pData.fullName ||
                  pData.cosplayerName ||
                  "Cửa hàng";
            setHeaderName(finalName);
            if (pData.avatarUrl) setHeaderAvatar(pData.avatarUrl);
          }
        } catch (err) {
          console.error("Lỗi lấy profile đối tác:", err);
        }
      }

      // Tải lịch sử tin nhắn
      if (currentRoom) {
        try {
          const msgRes = await axiosClient.get(`/chat/messages/${currentRoom}`);
          if (msgRes.data.code === 0) {
            setMessages(msgRes.data.result?.reverse() || []);
          }
        } catch (e) {
          console.error("Lỗi tải tin nhắn:", e);
        }
      }

      // Kết nối WebSocket và subscribe phòng chat
      await chatSocket.connect();

      if (currentRoom) {
        // Unsubscribe phòng cũ trước
        if (socketKeyRef.current) {
          chatSocket.unsubscribe(socketKeyRef.current);
        }

        socketKeyRef.current = chatSocket.subscribeToRoom(
          Number(currentRoom),
          (newMsg: any) => {
            console.log("[Chat] Tin nhắn mới qua WS:", newMsg);
            setMessages((prev) => {
              // Tránh trùng lặp
              const exists = prev.some(
                (m) => m.id === newMsg.id
              );
              if (exists) return prev;
              refreshUnreadCount(); // Cập nhật badge
              return [...prev, newMsg];
            });
          }
        );
      }
    } catch (error) {
      console.error("Lỗi khởi tạo chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- GỬI TIN NHẮN TEXT ---
  const handleSend = async () => {
    if (!inputText.trim() || !activeRoomId || !currentUserId) return;

    const text = inputText.trim();
    setInputText("");

    // Optimistic update: hiện tin nhắn ngay
    const tempMsg = {
      id: `temp_${Date.now()}`,
      content: text,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    setIsSending(true);
    try {
      const res = await axiosClient.post(
        `/chat/send`,
        { roomId: activeRoomId, content: text },
        {}
      );

      if (res.data.code === 0) {
        // Cập nhật tin nhắn tạm bằng tin nhắn thật từ server
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id ? { ...res.data.result, id: res.data.result?.id || tempMsg.id } : m
          )
        );
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      // Xóa tin nhắn tạm nếu gửi thất bại
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      Alert.alert("Lỗi", "Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  };

  // --- GỬI ẢNH ---
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền", "Vui lòng cho phép truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0] && activeRoomId) {
      const asset = result.assets[0];
      const fileName = asset.uri?.split("/").pop() || `img-${Date.now()}.jpg`;

      // Optimistic: hiện ảnh đang gửi
      const tempMsg = {
        id: `temp_${Date.now()}`,
        content: `[Đang gửi ảnh...]`,
        senderId: currentUserId,
        createdAt: new Date().toISOString(),
        imageUrl: asset.uri,
        isUploading: true,
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const res = await uploadChatImage(
          activeRoomId,
          asset.uri,
          fileName
        );

        // Cập nhật tin nhắn ảnh thật
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? {
                  ...m,
                  imageUrl: res.result?.imageUrl || asset.uri,
                  content: res.result?.content || "[Hình ảnh]",
                  isUploading: false,
                }
              : m
          )
        );
      } catch (error) {
        console.error("Lỗi gửi ảnh:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? { ...m, content: "❌ Gửi ảnh thất bại", isUploading: false }
              : m
          )
        );
        Alert.alert("Lỗi", "Không thể gửi ảnh. Vui lòng thử lại.");
      }
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = Number(item.senderId) === currentUserId;

    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.partnerMessage,
        ]}
      >
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        )}
        {item.content && item.content !== "[Đang gửi ảnh...]" && (
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myMessageText : styles.partnerMessageText,
            ]}
          >
            {item.content}
          </Text>
        )}
        {item.isUploading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={isMe ? "#fff" : "#B59DFF"} />
            <Text
              style={[
                styles.uploadingText,
                { color: isMe ? "#ddd" : "#aaa" },
              ]}
            >
              {" "}
              Đang gửi...
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#4A3B6B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7}>
          <Image
            source={{ uri: headerAvatar }}
            style={styles.avatarImage}
          />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerName}
            </Text>
            <Text style={styles.statusOnline}>Đang hoạt động</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginLeft: "auto" }}>
          <Ionicons name="call-outline" size={22} color="#B59DFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => (item.id || index).toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Hãy gửi tin nhắn đầu tiên!
            </Text>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={handlePickImage}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color="#B59DFF"
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isSending) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    elevation: 3,
  },
  backBtn: { marginRight: 12 },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#E0D7FF",
  },
  headerName: { fontSize: 17, fontWeight: "bold", color: "#333" },
  statusOnline: { fontSize: 11, color: "#28A745", marginTop: 1 },
  messageList: { padding: 15, paddingBottom: 20 },
  messageBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  myMessage: {
    backgroundColor: "#B59DFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  partnerMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: "#fff" },
  partnerMessageText: { color: "#333" },
  uploadingRow: { flexDirection: "row", alignItems: "center" },
  uploadingText: { fontSize: 13 },
  emptyText: {
    textAlign: "center",
    color: "#A0A0A0",
    marginTop: 40,
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
  },
  plusBtn: { paddingBottom: 6, paddingRight: 8 },
  input: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
  },
  sendBtn: {
    backgroundColor: "#B59DFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});