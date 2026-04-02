import AsyncStorage from "@react-native-async-storage/async-storage";
// 1. Dùng axiosClient thay cho axios mặc định
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
} from "react-native";

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleReturnItem = (orderId: number) => {
    // Sửa đường dẫn có (screens) và as any để hết báo đỏ
    router.push({
      pathname: "/(screens)/return-camera" as any,
      params: { id: orderId },
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        setIsLoading(false);
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      // 2. GỌI API QUA axiosClient: Không cần headers, không cần IP
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const firstItem = item.details && item.details.length > 0 ? item.details[0] : null;
    
    // Check ảnh: Nếu Backend trả về trong details hoặc mảng images
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
          {/* Sửa đường dẫn có (screens) và as any để hết báo đỏ */}
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
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }} // Padding lớn để né Tab Bar "chân dài" của bạn
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50, color: "#8E7AB5" }}>
            Bạn chưa có đơn hàng nào.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#B59DFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 10,
    marginBottom: 10,
  },
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
});