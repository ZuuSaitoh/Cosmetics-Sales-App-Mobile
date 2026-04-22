import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '@/src/services/notificationService';

export default function UserNotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMarkAllLoading, setIsMarkAllLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 1. LẤY DANH SÁCH THÔNG BÁO DÀNH CHO USER
  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getAll();
      
      if (response.data.code === 0) {
        setNotifications(response.data.result || []);
      }
    } catch (error) {
      console.error('Lỗi tải thông báo user:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // 2. ĐÁNH DẤU 1 THÔNG BÁO LÀ ĐÃ ĐỌC
  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    if (isRead) return;
    if (markingReadId === id) return;

    setMarkingReadId(id);
    try {
      const response = await notificationService.markAsRead(id);

      if (response.data.code === 0) {
        setNotifications(prev => prev.map(notif => 
          notif.id === id ? { ...notif, read: true, isRead: true } : notif
        ));
      }
    } catch (error) {
      console.error('Lỗi đánh dấu đọc:', error);
    } finally {
      setMarkingReadId(null);
    }
  };

  // 3. ĐÁNH DẤU TẤT CẢ LÀ ĐÃ ĐỌC
  const handleMarkAllAsRead = async () => {
    if (isMarkAllLoading) return;
    setIsMarkAllLoading(true);
    try {
      const response = await notificationService.markAllAsRead();

      if (response.data.code === 0) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true, isRead: true })));
        Alert.alert("Thành công", "Đã đánh dấu đọc tất cả!");
      }
    } catch (error) {
      console.error('Lỗi đánh dấu đọc tất cả:', error);
    } finally {
      setIsMarkAllLoading(false);
    }
  };

  // 4. XÓA THÔNG BÁO
  const handleDelete = (id: number) => {
    Alert.alert("Xóa thông báo", "Bạn có chắc muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Xóa", style: "destructive", 
        onPress: async () => {
          setDeletingId(id);
          try {
            const response = await notificationService.delete(id);

            if (response.data.code === 0) {
              setNotifications(prev => prev.filter(notif => notif.id !== id));
            }
          } catch (error) {
            console.error('Lỗi xóa thông báo:', error);
            Alert.alert("Lỗi", "Không thể xóa thông báo lúc này.");
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isItemRead = item.isRead || item.read || false; 

    return (
      <TouchableOpacity 
        style={[
          styles.notifCard,
          !isItemRead && styles.unreadCard,
          markingReadId === item.id && { opacity: 0.7 },
        ]} 
        activeOpacity={0.7}
        onPress={() => handleMarkAsRead(item.id, isItemRead)}
        disabled={markingReadId === item.id}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={isItemRead ? "notifications-outline" : "notifications"} size={24} color={isItemRead ? "#A0A0A0" : "#B59DFF"} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, !isItemRead && styles.unreadText]}>{item.title || "Thông báo hệ thống"}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.message || item.content || item.body}</Text>
          <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, deletingId === item.id && { opacity: 0.5 }]}
          onPress={() => handleDelete(item.id)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#B59DFF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo của bạn</Text>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          style={[styles.markAllBtn, isMarkAllLoading && { opacity: 0.5 }]}
          disabled={isMarkAllLoading}
        >
          {isMarkAllLoading ? (
            <ActivityIndicator size="small" color="#B59DFF" />
          ) : (
            <Ionicons name="checkmark-done-circle-outline" size={24} color="#B59DFF" />
          )}
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={60} color="#D1C4E9" />
          <Text style={styles.emptyText}>Bạn chưa có thông báo nào!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A3B6B' },
  markAllBtn: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 50 },
  notifCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1, alignItems: 'center' },
  unreadCard: { backgroundColor: '#F4F0FF', borderColor: '#E0D7FF', borderWidth: 1 }, 
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 4 },
  unreadText: { color: '#4A3B6B', fontWeight: 'bold' },
  message: { fontSize: 14, color: '#666', lineHeight: 20 },
  time: { fontSize: 12, color: '#A0A0A0', marginTop: 6 },
  deleteBtn: { padding: 10, marginLeft: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, fontSize: 16, color: '#A0A0A0' }
});