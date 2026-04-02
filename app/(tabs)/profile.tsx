import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Alert, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient'; // "Đầu não" chứa IP của bạn

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // 1. Lấy token để giải mã lấy ID người dùng
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.sub; // Lấy ID từ trường 'sub' của JWT

      // 2. Gọi API lấy Profile dựa theo ID (Khớp với Swagger bạn gửi)
      const response = await axiosClient.get(`/users/${userId}/profile`);

      if (response.data.code === 0) {
        setProfile(response.data.result);
      }
    } catch (error) {
      console.error("Lỗi lấy profile:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin cá nhân.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Hàm Đăng xuất "sạch sành sanh"
  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Thoát", 
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem('cosmate_token'); // Xóa Token
          router.replace('/(auth)/login'); // Đá về trang Login
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#B59DFF" /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER: AVATAR & NAME */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profile?.avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fullName}>{profile?.fullName || 'Người dùng CosMate'}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
        </View>

        {/* CHI TIẾT THÔNG TIN */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{profile?.phone || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
              <Text style={[styles.infoValue, { color: '#28A745' }]}>{profile?.status}</Text>
            </View>
          </View>
        </View>

        {/* NÚT HÀNH ĐỘNG */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="settings-outline" size={22} color="#4A3B6B" />
            <Text style={styles.actionBtnText}>Cài đặt tài khoản</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
            <Text style={[styles.actionBtnText, { color: '#FF4D4D' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#F4F1FF' },
  editBadge: { position: 'absolute', bottom: 0, right: 5, backgroundColor: '#B59DFF', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  fullName: { fontSize: 22, fontWeight: 'bold', color: '#4A3B6B' },
  username: { fontSize: 14, color: '#8E7AB5', marginTop: 4 },
  
  infoSection: { backgroundColor: '#fff', marginTop: 20, marginHorizontal: 20, borderRadius: 20, padding: 20, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoTextColumn: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: '#A090C5', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#333' },

  actionSection: { marginTop: 20, marginHorizontal: 20, paddingBottom: 100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10 },
  actionBtnText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '600', color: '#4A3B6B' },
  logoutBtn: { marginTop: 10, borderWidth: 1, borderColor: '#FFE5E5' }
});