import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient';
import { refreshUnreadCount } from '../../hooks/useUnreadChatCount';

export default function ProviderChatListScreen() {
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      // Provider (shop) dùng providerId
      const activeId = decoded.providerId ? Number(decoded.providerId) : Number(decoded.sub);

      const response = await axiosClient.get(`/chat/rooms/user/${activeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.code === 0) {
        setChatRooms(response.data.result || []);
        refreshUnreadCount();
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
    const partnerName = item.partnerName || "Khách hàng";
    const partnerAvatar = item.partnerAvatar || "https://via.placeholder.com/100";
    const lastMsgTime = item.lastMessageAt
      ? new Date(item.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '';

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
          keyExtractor={(item) => item.roomId?.toString() || item.id?.toString()}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A3B6B' },
  listContainer: { padding: 15, paddingBottom: 50 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 1,
    alignItems: 'center'
  },
  avatar: { width: 55, height: 55, borderRadius: 27, backgroundColor: '#E0D7FF', marginRight: 15 },
  textContainer: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  partnerName: { fontSize: 17, fontWeight: '600', color: '#333', flex: 1 },
  time: { fontSize: 12, color: '#A0A0A0', marginLeft: 8 },
  lastMessage: { fontSize: 14, color: '#888', lineHeight: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, fontSize: 16, color: '#A0A0A0' }
});
