import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../api/axiosClient"; 
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal, // Thêm Modal
} from "react-native";
import * as ImagePicker from 'expo-image-picker'; // Thêm thư viện chọn ảnh
import { Ionicons } from '@expo/vector-icons'; // Thêm Icon

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleReturnItem = (orderId: number) => {
    router.push({
      pathname: "/(screens)/return-camera" as any,
      params: { id: orderId },
    });
  };

  // --- THÊM STATE CHO MODAL XÁC NHẬN NHẬN HÀNG ---
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState<number | null>(null);
  const [confirmImage, setConfirmImage] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        setIsLoading(false);
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const response = await axiosClient.get(`/orders/user/${userId}`);

      if (response.data.code === 0) {
        setOrders(response.data.result);
      } else {
        Alert.alert("Lỗi dữ liệu", response.data.message);
      }
    } catch (error: any) {
      console.error("Lỗi lấy đơn hàng User:", error);
      Alert.alert("Lỗi mạng", "Không thể lấy danh sách đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  };
  

  // --- THÊM CÁC HÀM XỬ LÝ ẢNH & GỌI API ---
  const openConfirmModal = (orderId: number) => {
    setConfirmOrderId(orderId);
    setConfirmImage(null);
    setIsConfirmModalVisible(true);
  };

  const pickImage = async () => {
    // 1. Xin quyền mở Camera trước
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Cấp quyền Camera", "Bạn cần cho phép ứng dụng dùng Camera để chụp ảnh xác nhận nhé!");
      return;
    }

    // 2. Mở Camera (Thay vì launchImageLibraryAsync)
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], // Chỉ cho phép chụp ảnh
      allowsEditing: true,    // Cho phép khách crop ảnh cho vuông vức
      quality: 0.7,           // Giảm quality xuống 0.7 cho ảnh nhẹ, upload API cho lẹ
    });

    if (!result.canceled) { 
      setConfirmImage(result.assets[0]); 
    }
  };

  const submitConfirmDelivery = async () => {
    if (!confirmImage) {
      Alert.alert("Lỗi", "Vui lòng chụp hoặc chọn ảnh tình trạng đồ để làm bằng chứng nhé!");
      return;
    }

    try {
      const formData = new FormData();
      const localUri = confirmImage.uri;
      const filename = localUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // Gắn ảnh vào field "images" (giống trong Swagger)
      formData.append('images', { uri: localUri, name: filename, type } as any);

      // Gọi API confirm-delivery
      const res = await axiosClient.post(`/orders/${confirmOrderId}/confirm-delivery`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Cảm ơn bạn! Đơn hàng đã chuyển sang trạng thái Đang Thuê.");
        setIsConfirmModalVisible(false);
        fetchOrders(); // Load lại danh sách
      } else {
        Alert.alert("Lỗi", res.data.message);
      }
    } catch (error) {
      console.error("Lỗi confirm delivery:", error);
      Alert.alert("Lỗi hệ thống", "Không thể xác nhận nhận hàng lúc này.");
    }
  };
  // ---------------------------------------------

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const firstItem = item.details && item.details.length > 0 ? item.details[0] : null;
    const coverImage = item.images && item.images.length > 0
        ? item.images[0].imageUrl
        : "https://via.placeholder.com/200x200.png?text=No+Image";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>Mã đơn: #{item.id}</Text>
          <Text
            style={[
              styles.statusText,
              { color: item.status === "COMPLETED" ? "#28A745" : "#FF9900" },
            ]}
          >
            {item.status || "Đang xử lý"}
          </Text>
        </View>

        <View style={styles.productInfo}>
          <Image source={{ uri: coverImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              Trang phục ID: {firstItem ? firstItem.costumeId : "..."}
              {firstItem && firstItem.size ? ` (Size: ${firstItem.size})` : ""}
            </Text>
            <Text style={styles.price}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          
          {/* 1. NÚT NHẬN HÀNG (Chỉ hiện khi Đang giao) */}
          {item.status === 'DELIVERING_OUT' && (
            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#28A745', backgroundColor: '#F0FFF4' }]}
              onPress={() => openConfirmModal(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: '#28A745' }]}>Đã nhận được hàng</Text>
            </TouchableOpacity>
          )}

          {/* 2. NÚT TRẢ ĐỒ (Chỉ hiện khi Đang thuê) */}
          {(item.status === 'IN_USE')&& (
            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#FF9900', backgroundColor: '#FFF9F0' }]}
              onPress={() => handleReturnItem(item.id)} 
            >
              <Text style={[styles.btnOutlineText, { color: '#FF9900' }]}>Trả đồ & Nhận cọc</Text>
            </TouchableOpacity>
          )}

          {/* 3. NÚT XEM CHI TIẾT (Lúc nào cũng hiện) */}
          <TouchableOpacity 
            style={styles.btnOutline}
            onPress={() => router.push({ 
              pathname: '/(screens)/order-detail' as any, 
              params: { id: item.id } 
            })}
          >
            <Text style={styles.btnOutlineText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50, color: "#8E7AB5" }}>
            Bạn chưa có đơn hàng nào.
          </Text>
        }
      />

      {/* --- MÀN HÌNH MODAL CHỤP ẢNH XÁC NHẬN --- */}
      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={isConfirmModalVisible} 
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận nhận đồ</Text>
              <TouchableOpacity onPress={() => setIsConfirmModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubText}>
              Vui lòng chụp ảnh tình trạng đồ lúc nhận để bảo vệ quyền lợi của bạn nhé!
            </Text>

            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {confirmImage ? (
                <Image source={{ uri: confirmImage.uri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={40} color="#A090C5" />
                  <Text style={styles.uploadText}>Bấm để mở Camera chụp ảnh</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitConfirmDelivery}>
              <Text style={styles.modalSubmitText}>Gửi & Chốt đơn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: "#B59DFF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingBottom: 10, marginBottom: 10 },
  shopName: { fontSize: 14, fontWeight: "bold", color: "#4A3B6B" },
  statusText: { fontSize: 12, fontWeight: "bold" },
  productInfo: { flexDirection: "row", marginBottom: 15 },
  productImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  productDetails: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 15, color: "#333", marginBottom: 5 },
  price: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 10 },
  btnOutline: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#B59DFF', backgroundColor: '#fff' },
  btnOutlineText: { color: '#B59DFF', fontWeight: 'bold' },

  // --- STYLE CHO MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  modalSubText: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 20 },
  uploadBox: { height: 150, borderWidth: 1, borderColor: '#D1C4E9', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#FAF9FF', overflow: 'hidden' },
  uploadText: { marginTop: 8, color: '#8E7AB5', fontSize: 14 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalSubmitBtn: { backgroundColor: '#28A745', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});