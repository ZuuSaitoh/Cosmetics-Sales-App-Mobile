import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Image, RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient';

export default function ChatListScreen() {
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      
      // ---> MAGIC NẰM Ở ĐÂY NÈ <---
      // Ưu tiên lấy providerId (cho Shop), nếu không có thì lấy sub (cho User)
      const activeId = decoded.providerId ? Number(decoded.providerId) : Number(decoded.sub);
      setCurrentUserId(activeId);

      // GỌI API BẰNG activeId MỚI CHUẨN BÀI
      const response = await axiosClient.get(`/chat/rooms/user/${activeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.code === 0) {
        setChatRooms(response.data.result || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách chat:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChatRooms();
  };

  const renderItem = ({ item }: { item: any }) => {
    // Lấy đúng field từ Swagger
    const partnerName = item.partnerName || "Khách hàng";
    const partnerAvatar = item.partnerAvatar || "https://via.placeholder.com/100";
    const lastMsgTime = item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '';

    return (
      <TouchableOpacity 
        style={styles.chatCard} 
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/(screens)/chat-detail' as any,
          params: { roomId: item.roomId, partnerName: partnerName, partnerId: item.partnerId }
        })}
      >
        <Image source={{ uri: partnerAvatar }} style={styles.avatar} />
        
        <View style={styles.textContainer}>
          <View style={styles.topLine}>
            <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
            <Text style={styles.time}>{lastMsgTime}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>Nhấn để xem cuộc trò chuyện...</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#B59DFF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      {chatRooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color="#D1C4E9" />
          <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào!</Text>
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={(item) => item.roomId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#B59DFF']} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#4A3B6B' },
  listContainer: { paddingVertical: 10 },
  chatCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F4F5F7', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0D7FF', marginRight: 15 },
  textContainer: { flex: 1, justifyContent: 'center' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  partnerName: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1, marginRight: 10 },
  time: { fontSize: 12, color: '#A0A0A0' },
  lastMessage: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, fontSize: 16, color: '#A0A0A0' }
});