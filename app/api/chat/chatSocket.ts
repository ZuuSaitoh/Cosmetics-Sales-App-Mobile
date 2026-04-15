import { Client, Message } from "@stomp/stompjs";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Địa chỉ WebSocket - cập nhật IP nếu cần
const SOCKET_URL = "http://192.168.101.107:8080/ws";

export type ChatCallback = (message: any) => void;

class ChatSocketManager {
  private client: Client | null = null;
  private subscriptions: Map<string, (msg: any) => void> = new Map();
  private _isConnected = false;

  // --- KẾT NỐI WEBSOCKET ---
  async connect(): Promise<void> {
    if (this._isConnected) return;

    const token = await AsyncStorage.getItem("cosmate_token");
    if (!token) {
      console.warn("[ChatSocket] Chưa có token, bỏ qua kết nối.");
      return;
    }

    this.client = new Client({
      brokerURL: SOCKET_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      console.log("[ChatSocket] ✅ Đã kết nối STOMP!");
      this._isConnected = true;

      // Resubscribe tất cả các topic đã đăng ký
      this.subscriptions.forEach((callback, key) => {
        const roomId = key.replace("room_", "");
        this.doSubscribe(`/topic/chat/room/${roomId}`, callback);
      });
    };

    this.client.onStompError = (frame) => {
      console.error("[ChatSocket] ❌ STOMP Error:", frame.body);
    };

    this.client.onWebSocketError = (event) => {
      console.error("[ChatSocket] ❌ WebSocket Error:", event);
    };

    this.client.onDisconnect = () => {
      console.log("[ChatSocket] 🔌 Đã ngắt kết nối.");
      this._isConnected = false;
    };

    this.client.activate();
  }

  // --- NGẮT KẾT NỐI ---
  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this._isConnected = false;
      this.subscriptions.clear();
    }
  }

  // --- ĐĂNG KÝ NHẬN TIN NHẮN TRONG PHÒNG ---
  subscribeToRoom(roomId: number, callback: ChatCallback): string {
    const destination = `/topic/chat/room/${roomId}`;
    const key = `room_${roomId}`;

    this.subscriptions.set(key, callback);

    if (this._isConnected && this.client) {
      this.doSubscribe(destination, callback);
    }

    return key;
  }

  // --- HỦY ĐĂNG KÝ ---
  unsubscribe(key: string) {
    this.subscriptions.delete(key);
    if (this.client) {
      this.client.unsubscribe(key);
    }
  }

  private doSubscribe(destination: string, callback: ChatCallback) {
    if (!this.client) return;

    this.client.subscribe(destination, (stompMsg: Message) => {
      try {
        const body = JSON.parse(stompMsg.body);
        callback(body);
      } catch {
        callback(stompMsg.body);
      }
    });
  }

  // --- GỬI TIN NHẮN QUA WEBSOCKET ---
  sendChatMessage(roomId: number, content: string, senderId: number) {
    if (!this.client || !this._isConnected) {
      console.warn("[ChatSocket] Chưa kết nối, không thể gửi tin nhắn.");
      return;
    }

    this.client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        roomId,
        content,
        senderId,
        type: "TEXT",
      }),
    });
  }

  // --- GỬI TIN NHẮN + GỌI API BACKUP ---
  // Dùng khi gửi tin nhắn: thử WebSocket trước, fallback sang REST
  async sendMessageWithFallback(
    roomId: number,
    content: string,
    senderId: number,
    apiFallback: () => Promise<any>
  ): Promise<any> {
    if (this._isConnected) {
      this.sendChatMessage(roomId, content, senderId);
    }
    // Luôn gọi REST API để đảm bảo tin nhắn được lưu
    return apiFallback();
  }
}

// Singleton instance
const chatSocket = new ChatSocketManager();
export default chatSocket;
