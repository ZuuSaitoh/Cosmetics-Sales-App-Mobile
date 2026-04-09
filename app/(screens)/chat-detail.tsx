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

  // --- STATE MỚI ĐỂ LƯU THÔNG TIN HIỂN THỊ LÊN HEADER ---
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
      
      // ---> MAGIC TƯƠNG TỰ BÊN NÀY <---
      const activeId = decoded.providerId ? Number(decoded.providerId) : Number(decoded.sub);
      setCurrentUserId(activeId);

      let currentRoom = activeRoomId;

      // NẾU BẤM TỪ ĐƠN HÀNG -> TÌM PHÒNG BẰNG activeId
      if (!currentRoom && partnerId) {
        const roomRes = await axiosClient.get(`/chat/room?user1Id=${activeId}&user2Id=${partnerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (roomRes.data.code === 0 && roomRes.data.result) {
          currentRoom = roomRes.data.result.id;
          setActiveRoomId(currentRoom);
        }
      }

      // NẾU CÓ PHÒNG RỒI -> LOAD THÔNG TIN PARTNER VÀ TIN NHẮN BẰNG activeId
      if (currentRoom) {
        try {
          const partnerRes = await axiosClient.get(`/chat/room/${currentRoom}/partner?currentUserId=${activeId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (partnerRes.data.code === 0 && partnerRes.data.result) {
            const partnerData = partnerRes.data.result;
            if (partnerName && partnerName !== 'undefined') {
  setHeaderName(partnerName as string);
} else {
  setHeaderName(partnerData.fullName || 'Cửa hàng');
}
            if (partnerData.avatarUrl) {
              setHeaderAvatar(partnerData.avatarUrl);
            }
          }
        } catch (err) {
          console.error("Lỗi lấy thông tin partner:", err);
          setHeaderName(typeof partnerName === 'string' ? partnerName : 'Cửa hàng');
        }

        // 2. LOAD LỊCH SỬ TIN NHẮN
        const msgRes = await axiosClient.get(`/chat/messages/${currentRoom}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (msgRes.data.code === 0) {
          const fetchedMessages = msgRes.data.result || [];
          setMessages(fetchedMessages.reverse()); 
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
    
    // 🚨 VẪN ĐANG CHỜ API GỬI TIN NHẮN TỪ BACKEND 🚨
    Alert.alert("Chưa nối dây mạng!", "Bạn hãy hỏi dev Backend xem cái API POST để gửi tin nhắn ổng giấu ở đâu nhé?");

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
      {/* HEADER ĐÃ ĐƯỢC CẬP NHẬT ĐỂ HIỆN AVATAR VÀ TÊN CHUẨN */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4A3B6B" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {headerAvatar ? (
             <Image source={{ uri: headerAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarMini}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
          )}
          <Text style={styles.headerName}>{headerName}</Text>
        </View>
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
             <Text style={{textAlign: 'center', color: '#999', marginTop: 20}}>Hãy gửi tin nhắn đầu tiên!</Text>
          }
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.inputContainer}>
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
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', elevation: 2 },
  backBtn: { marginRight: 10 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#B59DFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarImage: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#E0D7FF' },
  headerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  messageList: { paddingHorizontal: 15, paddingVertical: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  
  messageText: { fontSize: 15, lineHeight: 22 }, 

  partnerMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  partnerMessageText: { color: '#333' }, 
  
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#B59DFF', borderBottomRightRadius: 4, elevation: 1 },
  myMessageText: { color: '#fff' }, 

  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, paddingTop: 12, maxHeight: 100, fontSize: 15, color: '#333' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#B59DFF', justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
});