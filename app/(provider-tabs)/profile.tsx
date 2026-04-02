import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Alert, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient';

export default function ProviderProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  const fetchProviderProfile = async () => {
    try {
      // 1. Lấy token & userId
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      // 2. Lấy providerId từ userId
      const userRes = await axiosClient.get(`/providers/user/${userId}`);
      if (userRes.data.code !== 0 || !userRes.data.result) {
        Alert.alert("Lỗi", "Không tìm thấy hồ sơ Shop.");
        setIsLoading(false); return;
      }
      const providerId = userRes.data.result.id;

      // 3. GỌI API BẠN VỪA TÌM THẤY ĐỂ LẤY FULL PROFILE
      const profileRes = await axiosClient.get(`/providers/id/${providerId}`);
      if (profileRes.data.code === 0) {
        setProfile(profileRes.data.result);
      }
    } catch (error) {
      console.error("Lỗi lấy profile provider:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin cửa hàng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn thoát tài khoản Shop?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Thoát", 
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem('cosmate_token');
          router.replace('/(auth)/login');
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 1. ẢNH BÌA & AVATAR */}
        <View style={styles.headerImages}>
          <Image 
            source={{ uri: profile?.coverImageUrl || 'https://via.placeholder.com/400x150' }} 
            style={styles.coverImage} 
          />
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: profile?.avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            {profile?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
              </View>
            )}
          </View>
        </View>

        {/* 2. THÔNG TIN CƠ BẢN */}
        <View style={styles.basicInfo}>
          <Text style={styles.shopName}>{profile?.shopName || 'Tên Shop'}</Text>
          <Text style={styles.bioText}>{profile?.bio || 'Chưa có tiểu sử giới thiệu.'}</Text>
        </View>

        {/* 3. THỐNG KÊ (Stats) */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.totalRating || 0} ⭐</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.completedOrders || 0}</Text>
            <Text style={styles.statLabel}>Đơn hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.totalReviews || 0}</Text>
            <Text style={styles.statLabel}>Nhận xét</Text>
          </View>
        </View>

        {/* 4. THÔNG TIN THANH TOÁN (Bank) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="card-outline" size={24} color="#B59DFF" />
              <View style={styles.cardText}>
                <Text style={styles.bankName}>{profile?.bankName || 'Chưa cập nhật ngân hàng'}</Text>
                <Text style={styles.bankNumber}>{profile?.bankAccountNumber || '---'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. CÁC NÚT HÀNH ĐỘNG */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Tính năng', 'Sắp tới code chỉnh sửa nè!')}>
            <Ionicons name="create-outline" size={22} color="#4A3B6B" />
            <Text style={styles.actionBtnText}>Chỉnh sửa hồ sơ Shop</Text>
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
  
  headerImages: { alignItems: 'center', marginBottom: 50 },
  coverImage: { width: '100%', height: 160, backgroundColor: '#E0D7FF' },
  avatarWrapper: { position: 'absolute', bottom: -45, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff', backgroundColor: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12 },

  basicInfo: { alignItems: 'center', paddingHorizontal: 20 },
  shopName: { fontSize: 24, fontWeight: '900', color: '#4A3B6B', marginBottom: 5 },
  bioText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, borderRadius: 15, padding: 15, elevation: 2, shadowColor: '#B59DFF', shadowOpacity: 0.1, shadowRadius: 8 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#8E7AB5' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 5 },

  section: { marginHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B6B', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardText: { marginLeft: 15 },
  bankName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  bankNumber: { fontSize: 14, color: '#666', marginTop: 2 },

  actionSection: { marginTop: 30, marginHorizontal: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  actionBtnText: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '600', color: '#4A3B6B' },
  logoutBtn: { marginTop: 10, borderWidth: 1, borderColor: '#FFE5E5' }
});