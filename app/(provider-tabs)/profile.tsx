import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient';
import * as ImagePicker from 'expo-image-picker';

export default function ProviderProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [userId, setUserId] = useState<number | null>(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editShopName, setEditShopName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  const fetchProviderProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      
      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.sub; 
      setUserId(currentUserId);

      const userRes = await axiosClient.get(`/providers/user/${currentUserId}`);
      
      if (userRes.data.code === 0 && userRes.data.result) {
        const data = userRes.data.result;
        setProfile(data);
        
        setEditShopName(data.shopName || '');
        setEditBio(data.bio || '');
        setEditBankName(data.bankName || '');
        setEditBankAccountNumber(data.bankBankAccountNumber || data.bankAccountNumber || '');
      } else {
        Alert.alert("Lỗi", "Không tìm thấy hồ sơ Shop.");
      }
    } catch (error) {
      console.error("Lỗi lấy profile provider:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin cửa hàng.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM LƯU TEXT ---
  const handleUpdateProfile = async () => {
    if (!editShopName.trim()) {
      Alert.alert("Lỗi", "Tên Shop không được để trống!");
      return;
    }
    if (!userId) return; 

    setIsSavingText(true);
    try {
      const payload = {
        shopName: editShopName,
        bio: editBio,
        bankName: editBankName,
        bankAccountNumber: editBankAccountNumber,
        shopAddressId: profile?.shopAddressId || null 
      };

      const token = await AsyncStorage.getItem('cosmate_token');
      const response = await axiosClient.put(`/providers/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật thông tin cửa hàng!");
        setProfile(response.data.result); 
        setIsEditModalVisible(false);     
      } else {
        Alert.alert("Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile shop:", error);
      Alert.alert("Lỗi", "Không thể cập nhật hồ sơ lúc này.");
    } finally {
      setIsSavingText(false);
    }
  };

  // --- HÀM UPLOAD ẢNH BÌA ---
  const handleChangeCoverImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [16, 9],     
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadCoverImage(result.assets[0].uri);
    }
  };

  const uploadCoverImage = async (uri: string) => {
    if (!userId) return;
    setIsUploadingCover(true);

    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      const formData = new FormData();
      
      const filename = uri.split('/').pop() || 'cover.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('coverImage', { uri: uri, name: filename, type: type } as any);

      const response = await axiosClient.put(`/providers/${userId}/cover-image`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật ảnh bìa!");
        setProfile(response.data.result); 
      } else {
        Alert.alert("Lỗi", response.data.message || "Upload ảnh thất bại");
      }
    } catch (error) {
      console.error("Lỗi upload ảnh bìa:", error);
      Alert.alert("Lỗi", "Không thể upload ảnh bìa lúc này.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  // --- HÀM UPLOAD AVATAR ---
  const handleChangeAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadAvatarImage(result.assets[0].uri);
    }
  };

  const uploadAvatarImage = async (uri: string) => {
    if (!userId) return;
    setIsUploadingAvatar(true);

    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      const formData = new FormData();
      
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('avatarImage', { uri: uri, name: filename, type: type } as any);

      const response = await axiosClient.put(`/providers/${userId}/avatar-image`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật ảnh đại diện!");
        setProfile(response.data.result); 
      } else {
        Alert.alert("Lỗi", response.data.message || "Upload ảnh thất bại");
      }
    } catch (error) {
      console.error("Lỗi upload avatar:", error);
      Alert.alert("Lỗi", "Không thể upload ảnh đại diện lúc này.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn thoát tài khoản Shop?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Thoát", style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem('cosmate_token');
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#B59DFF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 1. MÀN HÌNH CHÍNH (SẠCH SẼ, KHÔNG CÒN NÚT CHỒNG CHÉO) */}
        <View style={styles.headerImages}>
          <View style={styles.coverImageContainer}>
            <Image source={{ uri: profile?.coverImageUrl || 'https://via.placeholder.com/400x150' }} style={styles.coverImage} />
          </View>

          <View style={styles.avatarWrapper}>
            <Image source={{ uri: profile?.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
            {profile?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.basicInfo}>
          <Text style={styles.shopName}>{profile?.shopName || 'Tên Shop'}</Text>
          <Text style={styles.bioText}>{profile?.bio || 'Chưa có tiểu sử giới thiệu.'}</Text>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="card-outline" size={24} color="#B59DFF" />
              <View style={styles.cardText}>
                <Text style={styles.bankName}>{profile?.bankName || 'Chưa cập nhật ngân hàng'}</Text>
                <Text style={styles.bankNumber}>{profile?.bankBankAccountNumber || profile?.bankAccountNumber || '---'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditModalVisible(true)}>
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

      {/* 2. MODAL CHỈNH SỬA (ĐÃ THÊM PHẦN UPLOAD ẢNH) */}
      <Modal animationType="slide" transparent={true} visible={isEditModalVisible} onRequestClose={() => setIsEditModalVisible(false)}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật Cửa hàng</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* === KHU VỰC CẬP NHẬT ẢNH === */}
              <Text style={styles.inputLabel}>Hình ảnh Shop</Text>
              <View style={styles.imageActionRow}>
                <TouchableOpacity 
                  style={styles.imageBtn} 
                  onPress={handleChangeAvatar} 
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? <ActivityIndicator color="#B59DFF" /> : <Ionicons name="person-circle-outline" size={24} color="#B59DFF" />}
                  <Text style={styles.imageBtnText}>Đổi Avatar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.imageBtn} 
                  onPress={handleChangeCoverImage} 
                  disabled={isUploadingCover}
                >
                  {isUploadingCover ? <ActivityIndicator color="#B59DFF" /> : <Ionicons name="image-outline" size={24} color="#B59DFF" />}
                  <Text style={styles.imageBtnText}>Đổi Ảnh bìa</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />

              {/* === KHU VỰC CẬP NHẬT TEXT === */}
              <Text style={styles.inputLabel}>Tên Shop</Text>
              <TextInput style={styles.input} value={editShopName} onChangeText={setEditShopName} placeholder="Nhập tên Shop..." />
              
              <Text style={styles.inputLabel}>Tiểu sử (Bio)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={editBio} onChangeText={setEditBio} placeholder="Mô tả ngắn về Shop của bạn..." multiline />
              
              <Text style={styles.inputLabel}>Ngân hàng (Bank Name)</Text>
              <TextInput style={styles.input} value={editBankName} onChangeText={setEditBankName} placeholder="VD: Vietcombank, MB Bank..." />
              
              <Text style={styles.inputLabel}>Số tài khoản (Bank Account)</Text>
              <TextInput style={styles.input} value={editBankAccountNumber} onChangeText={setEditBankAccountNumber} placeholder="Nhập số tài khoản..." keyboardType="numeric" />
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, isSavingText && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={isSavingText}>
              {isSavingText ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thông tin chữ</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerImages: { alignItems: 'center', marginBottom: 50 },
  coverImageContainer: { width: '100%', height: 160 },
  coverImage: { width: '100%', height: '100%', backgroundColor: '#E0D7FF' },

  avatarWrapper: { position: 'absolute', bottom: -45, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, zIndex: 1 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff', backgroundColor: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, zIndex: 2 },

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
  logoutBtn: { marginTop: 10, borderWidth: 1, borderColor: '#FFE5E5' },

  // --- STYLE CHO MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  
  // --- STYLE MỚI CHO NÚT UPLOAD ẢNH ---
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  imageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0FF', paddingVertical: 12, borderRadius: 10, marginHorizontal: 5 },
  imageBtnText: { color: '#4A3B6B', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  divider: { height: 1, backgroundColor: '#EAEAEA', marginBottom: 15 },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1C4E9', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#F8F9FA', marginBottom: 20, color: '#333' },
  saveBtn: { backgroundColor: '#B59DFF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});