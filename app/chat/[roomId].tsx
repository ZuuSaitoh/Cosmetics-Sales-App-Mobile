import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  DeviceEventEmitter,
} from "react-native";
import { API_BASE_URL, WS_BASE_URL } from "@/src/api/axiosClient";
import { chatService } from "@/src/services/chatService";
import { providerService } from "@/src/services/providerService";
import { serviceControllerService } from "@/src/services/serviceControllerService";
import { SafeAreaView } from "react-native-safe-area-context";


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
  user_id?: string | number;
  role?: string;
  roles?: string[];
  authorities?: Array<string | { authority?: string }>;
};

type ProviderServiceItem = {
  id: number;
  serviceName: string;
};

type PendingImage = {
  uri: string;
  filename: string;
  mimeType: string;
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

const resolveJwtUserId = (payload: JwtPayload) => {
  const candidates = [payload.userId, payload.id, payload.user_id, payload.sub];
  for (const candidate of candidates) {
    const parsed = parseNumber(candidate);
    if (parsed) return parsed;
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

const isProviderRole = (value: unknown) => {
  if (typeof value !== "string") return false;
  const normalized = value.toUpperCase();
  return normalized.includes("PROVIDER_") || normalized.includes("ROLE_PROVIDER");
};

/** Role có thể tạo đơn dịch vụ (thợ ảnh / event staff), không gồm PROVIDER_RENTAL. */
const isPhotographerOrEventStaffServiceRole = (value: unknown) => {
  if (typeof value !== "string") return false;
  const u = value.toUpperCase().replace(/^ROLE_/, "");
  if (u.includes("PROVIDER_PHOTOGRAPH")) return true;
  if (u.includes("PROVIDER_EVENT_STAFF")) return true;
  return false;
};

const TIME_SLOT_OPTIONS = [
  "08:00-10:00",
  "10:00-12:00",
  "13:00-15:00",
  "15:00-17:00",
  "18:00-20:00",
];

export default function ChatRoomScreen() {
  const { roomId, partnerId, partnerName, partnerAvatar, partnerRole } = useLocalSearchParams<RouteParams>();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isProviderUser, setIsProviderUser] = useState(false);
  const [hasServicePhotographerStaffRole, setHasServicePhotographerStaffRole] = useState(false);
  const [loggedInUserProviderId, setLoggedInUserProviderId] = useState<number | null>(null);
  const [providerServices, setProviderServices] = useState<ProviderServiceItem[]>([]);
  const [isLoadingProviderServices, setIsLoadingProviderServices] = useState(false);
  const [isOrderModalVisible, setIsOrderModalVisible] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showBookingDatePicker, setShowBookingDatePicker] = useState(false);
  const [bookingDateValue, setBookingDateValue] = useState<Date>(new Date());
  const [orderForm, setOrderForm] = useState({
    serviceId: "",
    bookingDate: "",
    timeSlot: "",
    numberOfHuman: "1",
    rentSlotAmount: "",
  });
  const [partner] = useState<ChatPartner>({
    id: parseNumber(partnerId) ?? 0,
    name: safeString(partnerName) ?? "",
    avatarUrl: safeString(partnerAvatar),
    role: safeString(partnerRole),
  });
  const stompClientRef = useRef<Client | null>(null);
  const pendingMessagesRef = useRef<ChatMessageRequest[]>([]);
  const flatListRef = useRef<FlatList<ChatMessageResponse>>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roomKey = useMemo(() => parseNumber(roomId), [roomId]);

  const resetOrderForm = () => {
    setOrderForm({
      serviceId: "",
      bookingDate: "",
      timeSlot: "",
      numberOfHuman: "1",
      rentSlotAmount: "",
    });
  };

  const handleOrderFieldChange = (field: keyof typeof orderForm, value: string) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatBookingDateLabel = (value: Date) =>
    value.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const handleBookingDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowBookingDatePicker(false);
    if (event.type !== "set" || !selectedDate) return;
    setBookingDateValue(selectedDate);
    handleOrderFieldChange("bookingDate", selectedDate.toISOString());
  };

  const mergeMessagesById = (prev: ChatMessageResponse[], next: ChatMessageResponse[]) => {
    const merged = new Map<number, ChatMessageResponse>();
    [...prev, ...next].forEach((message) => {
      if (typeof message?.id === "number") merged.set(message.id, message);
    });
    return Array.from(merged.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).reverse();
  };

  const markAsRead = async (targetRoomId: number) => {
    try {
      let uid = currentUserId;

      // FIX LỖI REACT STATE BỊ TRỄ: 
      // Nếu state chưa kịp cập nhật lúc mới vào phòng, tự moi Token ra lấy ID luôn cho chắc cú!
      if (!uid) {
        const token = await AsyncStorage.getItem("cosmate_token");
        if (token) {
          const decoded = jwtDecode<JwtPayload>(token);
          const parsedUserId = resolveJwtUserId(decoded);
          if (parsedUserId) uid = String(parsedUserId);
        }
      }

      // Nếu vẫn không có UID thì chịu
      if (!uid) return;

      // Gọi API xuống Backend báo Seen
      await chatService.markAsRead(targetRoomId, Number(uid));
      
      // Bắn loa phường báo ra ngoài TabBar tắt số đỏ
      DeviceEventEmitter.emit('refreshUnreadCount');
    } catch (error) {
      console.warn("markAsRead failed", error);
    }
  };

  const fetchChatHistory = async (targetRoomId: number) => {
    try {
      const response = await chatService.getMessages(targetRoomId);
      const result = response.data?.result ?? [];
      const content = Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
      const fetchedMessages = asChatMessageArray(content);
      setMessages((prev) => mergeMessagesById(prev, fetchedMessages));
      if (fetchedMessages.length > 0) {
        void markAsRead(targetRoomId);
      }
    } catch (error) {
      console.warn("Load chat history failed", error);
      setMessages((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                id: -1,
                roomId: targetRoomId,
                senderId: 0,
                messageType: "TEXT",
                content: "Lỗi tải tin nhắn",
                createdAt: new Date().toISOString(),
                isRead: false,
              },
            ],
      );
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("cosmate_token");
        const storedUserId = await AsyncStorage.getItem("cosmate_user_id");
        if (token) {
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const decodedUserId = resolveJwtUserId(decoded);
            const userId = decodedUserId ?? parseNumber(storedUserId);
            const authorityCandidates = Array.isArray(decoded.authorities)
              ? decoded.authorities.map((item) =>
                  typeof item === "string" ? item : item?.authority,
                )
              : [];
            const roleCandidates = [
              ...(Array.isArray(decoded.roles) ? decoded.roles : []),
              decoded.role,
              ...authorityCandidates,
            ];
            const providerFlag = roleCandidates.some(isProviderRole);
            setIsProviderUser(providerFlag);
            setHasServicePhotographerStaffRole(
              roleCandidates.some(isPhotographerOrEventStaffServiceRole),
            );
            if (userId !== undefined && userId !== null) {
              const normalizedUserId = String(userId);
              setCurrentUserId(normalizedUserId);
              await AsyncStorage.setItem("cosmate_user_id", normalizedUserId);
            }
          } catch (decodeError) {
            console.warn("jwtDecode failed", decodeError);
            if (storedUserId) {
              setCurrentUserId(String(storedUserId));
            }
          }
        } else if (storedUserId) {
          setCurrentUserId(String(storedUserId));
        }

        if (roomKey === null) return;

        await fetchChatHistory(roomKey);
        await markAsRead(roomKey);
      } catch (error) {
        console.warn("Init chat screen failed", error);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [roomKey]);

  const canShowProviderCreateOrder =
    hasServicePhotographerStaffRole && loggedInUserProviderId !== null;

  useEffect(() => {
    const loadProviderServices = async () => {
      if (!currentUserId) {
        setProviderServices([]);
        setLoggedInUserProviderId(null);
        return;
      }

      setIsLoadingProviderServices(true);
      try {
        const providerRes = await providerService.getByUser(Number(currentUserId));
        const providerId = Number(providerRes.data?.result?.id);
        if (!providerId) {
          setIsProviderUser(false);
          setLoggedInUserProviderId(null);
          setProviderServices([]);
          return;
        }

        setIsProviderUser(true);
        setLoggedInUserProviderId(providerId);
        const servicesRes = await serviceControllerService.getServicesByProvider(providerId);
        const services = Array.isArray(servicesRes.data?.result) ? servicesRes.data.result : [];
        setProviderServices(
          services
            .filter(
              (item: any) =>
                typeof item?.id === "number" && typeof item?.serviceName === "string",
            )
            .map((item: any) => ({ id: item.id, serviceName: item.serviceName })),
        );
      } catch (error) {
        console.warn("Load provider services failed", error);
        setIsProviderUser(false);
        setLoggedInUserProviderId(null);
        setProviderServices([]);
      } finally {
        setIsLoadingProviderServices(false);
      }
    };

    void loadProviderServices();
  }, [currentUserId]);

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
                setMessages((prev) => mergeMessagesById([payload], prev));
                void markAsRead(roomKey);
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

        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = setInterval(() => {
          void fetchChatHistory(roomKey);
        }, 3000);

        stompClientRef.current = client;
        client.activate();
      } catch (error) {
        console.error("Unable to initialize websocket", error);
      }
    };

    void initWebSocket();

    return () => {
      mounted = false;
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
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

  const uploadChatImage = async (
    image: PendingImage,
    targetRoomId: number,
    token: string,
  ) => {
    const formData = new FormData();
    formData.append("roomId", String(targetRoomId));

    if (Platform.OS === "web") {
      const res = await fetch(image.uri);
      const blob = await res.blob();
      formData.append("file", blob, image.filename);
    } else {
      formData.append("file", {
        uri: image.uri,
        name: image.filename,
        type: image.mimeType,
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
      throw new Error("Backend không trả về URL ảnh hợp lệ.");
    }

    return imageUrl;
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || roomKey === null) return;
    if (sending || isUploadingImage) return;

    const currentId = Number(currentUserId);
    if (!currentUserId || !currentId) {
      Alert.alert("Lỗi", "Không xác định được người gửi.");
      return;
    }

    setSending(true);
    try {
      if (pendingImages.length > 0) {
        const token = await AsyncStorage.getItem("cosmate_token");
        if (!token) {
          Alert.alert("Chưa đăng nhập", "Không có token để tải ảnh lên.");
          return;
        }

        setIsUploadingImage(true);
        try {
          for (const image of pendingImages) {
            const imageUrl = await uploadChatImage(image, roomKey, token);
            await chatService.sendMessage({
              roomId: roomKey,
              senderId: currentId,
              messageType: "IMAGE",
              content: imageUrl,
            });
          }
          setPendingImages([]);
        } finally {
          setIsUploadingImage(false);
        }
      }

      if (text) {
        const payload: ChatMessageRequest = {
          roomId: roomKey,
          senderId: currentId,
          messageType: "TEXT",
          content: text,
        };
        await chatService.sendMessage(payload);
        setInput("");
      }

      await fetchChatHistory(roomKey);
    } catch (error) {
      console.warn("Lỗi gửi tin nhắn:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn hoặc ảnh lúc này.");
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (sending || isUploadingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để gửi ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return;

    const newImages: PendingImage[] = result.assets.map((asset, index) => {
      const uri = asset.uri;
      const filename = asset.fileName ?? `chat-${Date.now()}-${index}.jpg`;
      const match = /\.([A-Za-z0-9]+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase();
      const mimeType = asset.mimeType ?? (ext === "png" ? "image/png" : "image/jpeg");

      return { uri, filename, mimeType };
    });

    setPendingImages((prev) => {
      const uriSet = new Set(prev.map((item) => item.uri));
      const uniqueNew = newImages.filter((item) => !uriSet.has(item.uri));
      return [...prev, ...uniqueNew];
    });
  };

  const handleCreateServiceOrder = async () => {
    if (roomKey === null) return;
    if (!currentUserId) return;
    if (!partner.id) {
      Alert.alert("Không xác định người nhận", "Không tìm thấy cosplayer trong phòng chat.");
      return;
    }

    const serviceId = Number(orderForm.serviceId);
    const numberOfHuman = Number(orderForm.numberOfHuman);
    const rentSlotAmount = Number(orderForm.rentSlotAmount);
    const bookingDatePayload = (() => {
      const date = new Date(bookingDateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })();

    if (!serviceId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn dịch vụ.");
      return;
    }
    if (!orderForm.timeSlot.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn khung giờ.");
      return;
    }
    if (!numberOfHuman || numberOfHuman <= 0) {
      Alert.alert("Thiếu thông tin", "Số lượng người phải lớn hơn 0.");
      return;
    }
    if (!rentSlotAmount || rentSlotAmount <= 0) {
      Alert.alert("Thiếu thông tin", "Tổng tiền phải lớn hơn 0.");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const payload = {
        serviceId,
        bookingDate: bookingDatePayload,
        timeSlot: orderForm.timeSlot.trim(),
        numberOfHuman,
        rentSlotAmount,
        cosplayerId: partner.id,
      };

      console.log("[provider-create] request payload:", payload);
      const response = await serviceControllerService.providerCreateServiceOrder(payload);
      console.log("[provider-create] response:", response?.data);
      const result = response.data?.result;
      const createdOrderId = Number(result?.id);
      const paymentUrl = typeof result?.paymentUrl === "string" ? result.paymentUrl : "";

      const systemContent = createdOrderId
        ? `Provider đã tạo đơn dịch vụ #${createdOrderId}.`
        : "Provider đã tạo đơn dịch vụ mới.";

      await chatService.sendMessage({
        roomId: roomKey,
        senderId: Number(currentUserId),
        messageType: "TEXT",
        content: paymentUrl ? `${systemContent} Thanh toán: ${paymentUrl}` : systemContent,
      });

      await fetchChatHistory(roomKey);
      setIsOrderModalVisible(false);
      resetOrderForm();
      Alert.alert("Thành công", "Đã tạo đơn dịch vụ trong cuộc trò chuyện.");
    } catch (error) {
      console.warn("Create service order failed", error);
      console.log("[provider-create] error response:", (error as any)?.response?.data);
      const message =
        (error as any)?.response?.data?.message ||
        "Không thể tạo đơn dịch vụ lúc này.";
      Alert.alert("Lỗi", message);
    } finally {
      setIsCreatingOrder(false);
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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
            </View>
          </View>

          {canShowProviderCreateOrder ? (
            <Pressable
              onPress={() => setIsOrderModalVisible(true)}
              style={styles.createOrderBtn}
            >
              <Ionicons name="document-text-outline" size={17} color="#6F58A8" />
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#B59DFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            inverted={true}
            data={messages}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? styles.emptyContent : styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>}
          />
        )}

        {loading ? null : (
          <View style={styles.inputWrap}>
            {pendingImages.length > 0 ? (
              <FlatList
                horizontal
                data={pendingImages}
                keyExtractor={(item, index) => `${item.uri}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewList}
                renderItem={({ item }) => (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: item.uri }} style={styles.previewImage} />
                    <Pressable
                      style={styles.removePreviewBtn}
                      onPress={() =>
                        setPendingImages((prev) => prev.filter((image) => image.uri !== item.uri))
                      }
                      disabled={sending || isUploadingImage}
                    >
                      <Ionicons name="close" size={15} color="#FFFFFF" />
                    </Pressable>
                  </View>
                )}
              />
            ) : null}

            <View style={styles.inputBar}>
              <Pressable
                style={[styles.mediaBtn, (isUploadingImage || sending) && { opacity: 0.6 }]}
                onPress={handlePickImage}
                disabled={isUploadingImage || sending}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#8E7AB5" />
                ) : (
                  <Ionicons name="camera" size={20} color="#8E7AB5" />
                )}
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
                style={[
                  styles.sendButton,
                  (!input.trim() && pendingImages.length === 0) || sending || isUploadingImage
                    ? styles.sendButtonDisabled
                    : null,
                ]}
                onPress={handleSend}
                disabled={(!input.trim() && pendingImages.length === 0) || sending || isUploadingImage}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={isOrderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOrderModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (isCreatingOrder) return;
            setIsOrderModalVisible(false);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Tạo đơn dịch vụ</Text>
            <Text style={styles.modalHint}>Chọn dịch vụ và nhập thông tin booking.</Text>

            {isLoadingProviderServices ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#8E7AB5" />
              </View>
            ) : providerServices.length === 0 ? (
              <Text style={styles.modalEmptyText}>
                Chưa có dịch vụ nào để tạo đơn. Hãy tạo dịch vụ trước.
              </Text>
            ) : (
              <View style={styles.serviceList}>
                {providerServices.map((service) => {
                  const selected = orderForm.serviceId === String(service.id);
                  return (
                    <Pressable
                      key={service.id}
                      style={[styles.serviceItem, selected && styles.serviceItemSelected]}
                      onPress={() => handleOrderFieldChange("serviceId", String(service.id))}
                    >
                      <Text
                        style={[
                          styles.serviceItemText,
                          selected && styles.serviceItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {service.serviceName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              style={styles.datePickerBtn}
              onPress={() => setShowBookingDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#6F58A8" />
              <Text style={styles.datePickerText}>{formatBookingDateLabel(bookingDateValue)}</Text>
            </Pressable>
            {showBookingDatePicker && (
              <DateTimePicker
                value={bookingDateValue}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={handleBookingDateChange}
              />
            )}
            <Text style={styles.timeSlotLabel}>Khung giờ</Text>
            <View style={styles.timeSlotList}>
              {TIME_SLOT_OPTIONS.map((slot) => {
                const selected = orderForm.timeSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    style={[styles.timeSlotItem, selected && styles.timeSlotItemSelected]}
                    onPress={() => handleOrderFieldChange("timeSlot", slot)}
                  >
                    <Text
                      style={[
                        styles.timeSlotItemText,
                        selected && styles.timeSlotItemTextSelected,
                      ]}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Số người"
              placeholderTextColor="#A090C5"
              keyboardType="number-pad"
              value={orderForm.numberOfHuman}
              onChangeText={(value) => handleOrderFieldChange("numberOfHuman", value)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Tổng tiền thuê slot"
              placeholderTextColor="#A090C5"
              keyboardType="number-pad"
              value={orderForm.rentSlotAmount}
              onChangeText={(value) => handleOrderFieldChange("rentSlotAmount", value)}
            />

            <Pressable
              style={[
                styles.modalSubmitBtn,
                (isCreatingOrder || providerServices.length === 0) && styles.modalSubmitBtnDisabled,
              ]}
              onPress={handleCreateServiceOrder}
              disabled={isCreatingOrder || providerServices.length === 0}
            >
              {isCreatingOrder ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Tạo đơn</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  createOrderBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
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
  inputWrap: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE7FF",
    paddingTop: 8,
  },
  previewList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  previewContainer: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6DBFF",
    backgroundColor: "#F8F5FF",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removePreviewBtn: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 15, 35, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#2E2446" },
  modalHint: { fontSize: 13, color: "#7A6B98" },
  modalLoading: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalEmptyText: { color: "#7A6B98", fontSize: 13 },
  serviceList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceItem: {
    borderWidth: 1,
    borderColor: "#E6DBFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  serviceItemSelected: {
    backgroundColor: "#B59DFF",
    borderColor: "#B59DFF",
  },
  serviceItemText: { color: "#5A4C7E", fontSize: 13, fontWeight: "700" },
  serviceItemTextSelected: { color: "#FFFFFF" },
  modalInput: {
    height: 46,
    backgroundColor: "#F8F5FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DBFF",
    paddingHorizontal: 12,
    color: "#2E2446",
  },
  datePickerBtn: {
    height: 46,
    backgroundColor: "#F8F5FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DBFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  datePickerText: { color: "#2E2446", fontWeight: "600" },
  timeSlotLabel: { marginTop: 2, fontSize: 13, color: "#7A6B98", fontWeight: "700" },
  timeSlotList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeSlotItem: {
    borderWidth: 1,
    borderColor: "#E6DBFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  timeSlotItemSelected: {
    backgroundColor: "#B59DFF",
    borderColor: "#B59DFF",
  },
  timeSlotItemText: { color: "#5A4C7E", fontSize: 13, fontWeight: "700" },
  timeSlotItemTextSelected: { color: "#FFFFFF" },
  modalSubmitBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#B59DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnDisabled: { opacity: 0.55 },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
