import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrdersScreen() {
  // 1. Khai báo State chứa dữ liệu từ API
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Hàm xử lý khi bấm nút "Trả hàng"
  const handleReturnItem = (orderId: number) => {
    // Tạm thời báo Alert để test
    Alert.alert('Chuyển trang', `Đang mở Camera để chụp bằng chứng cho đơn hàng #${orderId}`);
    
    // BƯỚC TIẾP THEO MÌNH SẼ DÙNG DÒNG NÀY ĐỂ CHUYỂN SANG MÀN HÌNH CAMERA:
    // router.push({ pathname: '/(screens)/return-camera', params: { id: orderId } });
  };

  // ⚠️ THAY BẰNG IPV4 CỦA MÁY TÍNH BẠN
  const API_URL = 'http://192.168.101.107:8080/api/orders';

  // 2. Tự động gọi API ngay khi vào màn hình này
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // 2.1 Móc cái chìa khóa Token đã lưu lúc đăng nhập ra
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
        setIsLoading(false);
        return;
      }

      // 2.2 Gọi API kèm theo ổ khóa bảo mật (Bearer Token)
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 2.3 Đổ dữ liệu thật vào mảng
      if (response.data.code === 0) {
        setOrders(response.data.result);
      } else {
        Alert.alert('Lỗi lấy dữ liệu', response.data.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false); // Tắt vòng tròn loading
    }
  };

  // Hàm phụ: Format tiền tệ (Ví dụ: 120000 -> 120.000 đ)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // 3. Giao diện cho TỪNG ĐƠN HÀNG lấy từ API
  const renderOrderItem = ({ item }: { item: any }) => {
    // 1. Lấy thông tin đồ thuê (Size, ID)
    const firstItem = item.details && item.details.length > 0 ? item.details[0] : null;
    
    // 2. Lấy URL ảnh thật từ mảng images (Lấy tấm ảnh đầu tiên)
    // Nếu mảng images rỗng (chưa có ảnh), xài tạm ảnh xám để app không bị sập
    const coverImage = item.images && item.images.length > 0 
      ? item.images[0].imageUrl 
      : 'https://via.placeholder.com/200x200.png?text=No+Image';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* Lấy mã Order ID thật */}
          <Text style={styles.shopName}>Mã đơn: #{item.id}</Text>
          <Text style={[
            styles.statusText,
            { color: item.status === 'COMPLETED' ? '#28A745' : '#FF9900' } 
          ]}>
            {item.status || 'Đang xử lý'}
          </Text>
        </View>

        <View style={styles.productInfo}>
          {/* ẢNH THẬT LẤY TỪ DB ĐÂY! */}
          <Image source={{ uri: coverImage }} style={styles.productImage} />
          
          <View style={styles.productDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              Trang phục ID: {firstItem ? firstItem.costumeId : '...'} 
              {/* Hiện thêm cái Size cho nó chuyên nghiệp */}
              {firstItem && firstItem.size ? ` (Size: ${firstItem.size})` : ''}
            </Text>
            
            <Text style={styles.price}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Xem chi tiết</Text>
          </TouchableOpacity>
          
          {/* Bấm vào đây sẽ gọi hàm mở Camera */}
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={() => handleReturnItem(item.id)}
          >
            <Text style={styles.btnPrimaryText}>Trả hàng / Báo cáo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 4. Nếu đang load thì hiện vòng xoay
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  // 5. Render danh sách thực tế
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item: any) => item.id.toString()} // API trả id là số, ép sang chuỗi
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        // Giao diện khi khách hàng chưa có đơn nào
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#8E7AB5' }}>Bạn chưa có đơn hàng nào.</Text>}
      />
    </SafeAreaView>
  );
}

// Giữ nguyên đoạn code StyleSheet ở bài trước nhé, không cần thay đổi gì cả!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10, marginBottom: 10 },
  shopName: { fontSize: 14, fontWeight: 'bold', color: '#4A3B6B' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  productInfo: { flexDirection: 'row', marginBottom: 15 },
  productImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  productDetails: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 15, color: '#333', marginBottom: 5 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#B59DFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnSecondary: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, borderWidth: 1, borderColor: '#E0D7FF' },
  btnSecondaryText: { color: '#4A3B6B', fontWeight: '600' },
  btnPrimary: { backgroundColor: '#B59DFF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  btnPrimaryText: { color: 'white', fontWeight: '600' }
});