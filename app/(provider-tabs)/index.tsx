import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Alert, Modal, TextInput, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // IMPORT THƯ VIỆN ẢNH

const RENTAL_STATUSES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'PREPARING', label: 'Đang chuẩn bị' },
  { key: 'DELIVERED', label: 'Đang giao' },
  { key: 'RENTING', label: 'Đang thuê' },
  { key: 'RETURNING', label: 'Chờ trả đồ' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
];

const BASE_URL = 'http://192.168.101.107:8080/api';

export default function OrderManagementScreen() {
  const [orderType, setOrderType] = useState<'RENTAL' | 'SERVICE'>('RENTAL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE CHO MODAL GIAO HÀNG ---
  const [isShipModalVisible, setIsShipModalVisible] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<number | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [shipImage, setShipImage] = useState<any>(null); // State lưu ảnh bằng chứng

  useEffect(() => {
    fetchOrders();
  }, [orderType]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const providerRes = await axios.get(`${BASE_URL}/providers/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const providerId = providerRes.data.result.id;

      let apiUrl = orderType === 'RENTAL' 
        ? `${BASE_URL}/orders/provider/${providerId}` 
        : `${BASE_URL}/service-orders/provider`; 

      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.code === 0) {
        setOrders(response.data.result);
      }
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const filteredOrders = orders.filter((o: any) => {
    if (selectedStatus === 'ALL') return true;
    if (selectedStatus === 'PENDING') return o.status === 'PENDING' || o.status === 'PAID';
    return o.status === selectedStatus;
  });

  // ==========================================
  // HÀM CHUYỂN TRẠNG THÁI: PREPARE & COMPLETE
  // ==========================================
  const handlePrepareOrder = (orderId: number) => {
    Alert.alert("Xác nhận đơn", `Chuẩn bị đồ cho đơn #${orderId}?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xác nhận", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('cosmate_token');
            const res = await axios.post(`${BASE_URL}/orders/${orderId}/prepare`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.code === 0) {
              Alert.alert("Thành công", "Đã chuyển sang trạng thái Đang chuẩn bị!");
              fetchOrders(); 
            } else Alert.alert("Lỗi", res.data.message);
          } catch (error) { Alert.alert("Lỗi mạng"); }
        }
      }
    ]);
  };

  const handleCompleteOrder = (orderId: number) => {
    Alert.alert("Chốt đơn", `Nhận lại đồ đơn #${orderId} và hoàn cọc?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Chốt đơn", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('cosmate_token');
            const res = await axios.post(`${BASE_URL}/orders/${orderId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.code === 0) {
              Alert.alert("Hoàn tất", "Đã chốt đơn và hoàn cọc!");
              fetchOrders(); 
            } else Alert.alert("Lỗi", res.data.message);
          } catch (error) { Alert.alert("Lỗi mạng"); }
        }
      }
    ]);
  };

  // ==========================================
  // HÀM GIAO HÀNG (MỞ MODAL & CHỌN ẢNH)
  // ==========================================
  const openShipModal = (orderId: number) => {
    setShipOrderId(orderId);
    setTrackingCode('');
    setShipImage(null); // Xóa ảnh cũ
    setIsShipModalVisible(true);
  };

  // Hàm mở thư viện ảnh
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      // SỬA DÒNG NÀY (Dùng mảng chữ thay vì object kiểu cũ)
      mediaTypes: ['images'], 
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setShipImage(result.assets[0]);
    }
  };

  const submitShipOrder = async () => {
    if (!trackingCode.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã vận đơn!");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      const formData = new FormData();

      // Nếu chủ shop có chọn ảnh bằng chứng thì đẩy vào mảng 'images'
      if (shipImage) {
        const localUri = shipImage.uri;
        const filename = localUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('images', { uri: localUri, name: filename, type } as any);
      }

      // Nối mã vận đơn vào URL theo đúng chuẩn API Swagger của bạn
      const url = `${BASE_URL}/orders/${shipOrderId}/ship?trackingCode=${encodeURIComponent(trackingCode)}`;

      const res = await axios.post(url, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.code === 0) {
        Alert.alert("Giao hàng thành công", "Mã vận đơn và hình ảnh đã được lưu lại!");
        setIsShipModalVisible(false);
        fetchOrders(); 
      } else {
        Alert.alert("Lỗi", res.data.message);
      }
    } catch (error) { 
      console.error(error); 
      Alert.alert("Lỗi hệ thống", "Không thể upload dữ liệu giao hàng."); 
    }
  };

  // -------------------------------------------------------------
  const renderDynamicButton = (item: any) => {
    if (orderType === 'RENTAL') {
      if (item.status === 'PENDING' || item.status === 'PAID') {
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrepareOrder(item.id)}>
            <Text style={styles.actionBtnText}>Xác nhận & Chuẩn bị</Text>
          </TouchableOpacity>
        );
      }
      if (item.status === 'PREPARING') {
        return (
          // Thay vì gọi API liền, giờ mình mở cái Modal lên
          <TouchableOpacity style={styles.actionBtn} onPress={() => openShipModal(item.id)}>
            <Text style={styles.actionBtnText}>Giao cho vận chuyển</Text>
          </TouchableOpacity>
        );
      }
      if (item.status === 'RETURNING') {
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleCompleteOrder(item.id)}>
            <Text style={styles.actionBtnText}>Xác nhận nhận đồ</Text>
          </TouchableOpacity>
        );
      }
      if (item.status === 'COMPLETED') {
        return (
          <TouchableOpacity style={[styles.defaultBtn, { opacity: 0.5 }]} disabled>
            <Text style={styles.defaultBtnText}>Đã hoàn thành</Text>
          </TouchableOpacity>
        );
      }
    }
    return (
      <TouchableOpacity style={styles.defaultBtn} onPress={() => router.push({ pathname: '/(screens)/order-detail', params: { id: item.id } })}>
        <Text style={styles.defaultBtnText}>Xem chi tiết</Text>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.avatarPlaceholder}><Ionicons name="person" size={16} color="#fff" /></View>
          <Text style={styles.customerName}>Khách ID: {item.cosplayerId || 'Ẩn danh'}</Text>
        </View>
        <Text style={[styles.statusBadge, { color: item.status === 'COMPLETED' ? '#28A745' : '#FF9900' }]}>{item.status}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.orderId}>Mã đơn: #{item.id}</Text>
        {orderType === 'RENTAL' ? (
          <Text style={styles.orderDesc} numberOfLines={2}>Gồm {item.details?.length || 0} món đồ (Cọc: {formatPrice(item.totalDepositAmount)})</Text>
        ) : (
          <Text style={styles.orderDesc}>Đơn dịch vụ Make-up / Chụp ảnh</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Tổng tiền:</Text>
          <Text style={styles.priceValue}>{formatPrice(item.totalAmount)}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.btnOutline} onPress={() => router.push({ pathname: '/(screens)/order-detail', params: { id: item.id } })}>
          <Text style={styles.btnOutlineText}>Chi tiết</Text>
        </TouchableOpacity>
        {renderDynamicButton(item)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Quản lý Đơn hàng</Text>
        <View style={styles.segmentContainer}>
          <TouchableOpacity style={[styles.segmentBtn, orderType === 'RENTAL' && styles.segmentActive]} onPress={() => setOrderType('RENTAL')}>
            <Text style={[styles.segmentText, orderType === 'RENTAL' && styles.segmentTextActive]}>👕 Thuê Đồ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, orderType === 'SERVICE' && styles.segmentActive]} onPress={() => setOrderType('SERVICE')}>
            <Text style={[styles.segmentText, orderType === 'SERVICE' && styles.segmentTextActive]}>💄 Dịch Vụ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {RENTAL_STATUSES.map((status) => (
            <TouchableOpacity key={status.key} style={[styles.filterChip, selectedStatus === status.key && styles.filterChipActive]} onPress={() => setSelectedStatus(status.key)}>
              <Text style={[styles.filterChipText, selectedStatus === status.key && styles.filterChipTextActive]}>{status.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#B59DFF" /></View>
      ) : (
        <FlatList data={filteredOrders} keyExtractor={(item: any) => item.id.toString()} renderItem={renderOrderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đơn hàng nào.</Text>} />
      )}

      {/* ========================================================= */}
      {/* POPUP NHẬP MÃ VẬN ĐƠN VÀ CHỌN ẢNH BẰNG CHỨNG                */}
      {/* ========================================================= */}
      <Modal animationType="fade" transparent={true} visible={isShipModalVisible} onRequestClose={() => setIsShipModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Giao cho vận chuyển</Text>
              <TouchableOpacity onPress={() => setIsShipModalVisible(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mã vận đơn (VD: GHTK123...)"
              value={trackingCode}
              onChangeText={setTrackingCode}
              autoCapitalize="characters"
            />

            {/* Khu vực up ảnh bằng chứng */}
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {shipImage ? (
                <Image source={{ uri: shipImage.uri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={30} color="#A090C5" />
                  <Text style={styles.uploadText}>Tải lên ảnh tình trạng đồ (Tùy chọn)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitShipOrder}>
              <Text style={styles.modalSubmitText}>Xác nhận Giao Hàng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#4A3B6B', marginBottom: 15 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#F4F5F7', borderRadius: 10, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#888' },
  segmentTextActive: { color: '#B59DFF' },
  filterWrapper: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterContainer: { paddingHorizontal: 15 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F4F5F7', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: '#F4F1FF', borderColor: '#B59DFF' },
  filterChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#B59DFF', fontWeight: 'bold' },
  listContainer: { padding: 15, paddingBottom: 100 }, 
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10, marginBottom: 10 },
  customerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C4B9DF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#333' },
  statusBadge: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { marginBottom: 15 },
  orderId: { fontSize: 13, color: '#888', marginBottom: 4 },
  orderDesc: { fontSize: 14, color: '#444', marginBottom: 8, lineHeight: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#666' },
  priceValue: { fontSize: 16, fontWeight: 'bold', color: '#B59DFF' },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnOutline: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, borderWidth: 1, borderColor: '#E0D7FF' },
  btnOutlineText: { color: '#4A3B6B', fontSize: 13, fontWeight: '600' },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, backgroundColor: '#B59DFF' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  defaultBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, backgroundColor: '#F4F5F7' },
  defaultBtnText: { color: '#666', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontStyle: 'italic' },

  // --- STYLE CHO MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  modalInput: { borderWidth: 1, borderColor: '#D1C4E9', borderRadius: 8, padding: 15, fontSize: 16, backgroundColor: '#F8F9FA', marginBottom: 15, color: '#333' },
  uploadBox: { height: 120, borderWidth: 1, borderColor: '#D1C4E9', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#FAF9FF', overflow: 'hidden' },
  uploadText: { marginTop: 8, color: '#8E7AB5', fontSize: 14 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalSubmitBtn: { backgroundColor: '#B59DFF', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});