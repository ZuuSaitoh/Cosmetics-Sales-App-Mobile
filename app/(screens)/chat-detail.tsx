import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, Image
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import axiosClient from '../api/axiosClient';

export default function ChatDetailScreen() {
  const { roomId: paramRoomId, partnerId, partnerName } = useLocalSearchParams();

  const [activeRoomId, setActiveRoomId] = useState<number | null>(paramRoomId ? Number(paramRoomId) : null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // --- THÔNG TIN HIỂN THỊ HEADER ---
  const [headerName, setHeaderName] = useState<string>(typeof partnerName === 'string' ? partnerName : 'Đang tải...');
  const [headerAvatar, setHeaderAvatar] = useState<string>('https://via.placeholder.com/150');

  useEffect(() => {
    initializeChat();
  }, [paramRoomId, partnerId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      
      // Xác định ID người đang dùng (Shop hoặc User cá nhân)
      const activeId = decoded.providerId ? Number(decoded.providerId) : Number(decoded.sub);
      setCurrentUserId(activeId);

      let currentRoom = activeRoomId;

      // 1. NẾU CHƯA CÓ ROOM ID (ĐI TỪ TRANG DETAIL SANG) -> TÌM HOẶC TẠO PHÒNG
      if (!currentRoom && partnerId) {
        const roomRes = await axiosClient.get(`/chat/room?user1Id=${activeId}&user2Id=${partnerId}`);
        if (roomRes.data.code === 0 && roomRes.data.result) {
          currentRoom = roomRes.data.result.id;
          setActiveRoomId(currentRoom);
        }
      }

      // 2. LẤY THÔNG TIN ĐỐI TÁC (PARTNER) ĐỂ HIỆN HEADER
      if (partnerId) {
        try {
          // TUYỆT CHIÊU: Gọi API Provider để lấy shopName thay vì lấy fullName của User
          const partnerRes = await axiosClient.get(`/providers/id/${partnerId}`);
          
          if (partnerRes.data.code === 0 && partnerRes.data.result) {
            const pData = partnerRes.data.result;
            
            // Ưu tiên 1: Tên truyền từ màn hình trước
            // Ưu tiên 2: shopName từ API Provider
            // Ưu tiên 3: fullName (phat2004) nếu mấy cái kia hụt
            const finalName = (partnerName && partnerName !== 'undefined') 
              ? partnerName as string 
              : (pData.shopName || pData.fullName || 'Cửa hàng');

            setHeaderName(finalName);
            if (pData.avatarUrl) setHeaderAvatar(pData.avatarUrl);
          }
        } catch (err) {
          console.error("Lỗi lấy profile đối tác:", err);
        }
      }

      // 3. LOAD LỊCH SỬ TIN NHẮN NẾU ĐÃ CÓ PHÒNG
      if (currentRoom) {
        const msgRes = await axiosClient.get(`/chat/messages/${currentRoom}`);
        if (msgRes.data.code === 0) {
          setMessages(msgRes.data.result.reverse() || []);
        }
      }
    } catch (error) {
      console.error('Lỗi khởi tạo chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Tạm thời hiện Alert cho đến khi ráp WebSocket vào nha sếp!
    Alert.alert("STOMP WebSocket", "Đang đợi Zun-kun ráp cái ống dẫn WebSocket vào đây nè!");

    const newMsg = {
      id: Date.now(),
      content: inputText, 
      senderId: currentUserId,
      createdAt: new Date().toISOString()
    };
    
    setMessages([newMsg, ...messages]);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = Number(item.senderId) === currentUserId; 
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.partnerMessage]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.partnerMessageText]}>
          {item.content} 
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER CHIẾN THUẬT MỚI */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4A3B6B" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image source={{ uri: headerAvatar }} style={styles.avatarImage} />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{headerName}</Text>
            <Text style={styles.statusOnline}>Đang hoạt động</Text>
          </View>
        </View>
        
        <TouchableOpacity style={{marginLeft: 'auto'}}>
          <Ionicons name="call-outline" size={22} color="#B59DFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#B59DFF"/></View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => (item.id || index).toString()}
          renderItem={renderMessage}
          inverted 
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên!</Text>
          }
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.plusBtn}>
            <Ionicons name="add-circle-outline" size={24} color="#B59DFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EAEAEA', 
    elevation: 3 
  },
  backBtn: { marginRight: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 0.8 },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E0D7FF' },
  headerName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  statusOnline: { fontSize: 11, color: '#28A745', marginTop: 1 },

  messageList: { paddingHorizontal: 15, paddingVertical: 15 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 20, marginBottom: 8 },
  messageText: { fontSize: 15, lineHeight: 21 }, 

  partnerMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderTopLeftRadius: 4 },
  partnerMessageText: { color: '#333' }, 
  
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#B59DFF', borderTopRightRadius: 4 },
  myMessageText: { color: '#fff' }, 

  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0' 
  },
  plusBtn: { marginRight: 8 },
  input: { 
    flex: 1, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 22, 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 15, 
    color: '#333' 
  },
  sendBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#B59DFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' }
});