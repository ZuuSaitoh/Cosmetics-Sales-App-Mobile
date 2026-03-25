import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
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
  // Khai báo State chứa dữ liệu từ API
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hàm xử lý khi bấm nút "Trả hàng"
  const handleReturnItem = (orderId: number) => {
    // Chuyển sang trang Camera, đồng thời nhét cái ID vào trong hành lý (params) mang theo
    router.push({
      pathname: "/(screens)/return-camera",
      params: { id: orderId },
    });
  };
  // Tự động gọi API ngay khi vào màn hình này
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // 1. Lấy token từ điện thoại
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        setIsLoading(false);
        return;
      }

      // 2. GIẢI MÃ TOKEN ĐỂ LẤY USER ID
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub; // Bạn check log xem Backend trả ID bằng tên gì nhé
      console.log("Token giải mã ra được:", decoded);

      // 3. Gọi API lấy danh sách đơn hàng
      const DYNAMIC_API_URL = `http://192.168.101.107:8080/api/orders/user/${userId}`;

      const response = await axios.get(DYNAMIC_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 4. Đổ dữ liệu thật vào mảng
      if (response.data.code === 0) {
        setOrders(response.data.result);
      } else {
        Alert.alert("Lỗi dữ liệu", response.data.message);
      }
    } catch (error: any) {
      console.error(error);
      if (error.response && error.response.status === 403) {
        Alert.alert("Lỗi quyền", "Vẫn bị chặn 403, kiểm tra lại Role nhé!");
      } else {
        Alert.alert("Lỗi mạng", "Không thể lấy danh sách đơn hàng.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm phụ: Format tiền tệ
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Giao diện cho TỪNG ĐƠN HÀNG
  const renderOrderItem = ({ item }: { item: any }) => {
    const firstItem =
      item.details && item.details.length > 0 ? item.details[0] : null;
    const coverImage =
      item.images && item.images.length > 0
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
          <TouchableOpacity 
   style={styles.btnSecondary}
   onPress={() => router.push({ 
      pathname: '/(screens)/order-detail', 
      params: { id: item.id } 
   })}
>
   <Text style={styles.btnSecondaryText}>Xem chi tiết</Text>
</TouchableOpacity>

          {/* Tạo một biến kiểm tra xem đơn hàng đã COMPLETED chưa */}
{/* 💡 Mẹo: Ở thực tế, khách đang giữ đồ (RENTING) thì mới cần bấm nút Trả. 
    Nếu bạn muốn gộp cả 2 trạng thái thì dùng: item.status === 'COMPLETED' || item.status === 'RENTING' nhé! */}
{(() => {
  const isReadyToReturn = item.status === 'COMPLETED'; 

  return (
    <TouchableOpacity 
      style={[
        styles.btnPrimary, 
        !isReadyToReturn && styles.btnDisabled // Nếu chưa hoàn thành thì nhét thêm style màu xám vào
      ]}
      disabled={!isReadyToReturn} // Khóa luôn không cho bấm
      onPress={() => console.log('Chuyển sang trang Trả đồ!')}
    >
      <Text style={[
        styles.btnPrimaryText, 
        !isReadyToReturn && styles.btnDisabledText // Làm mờ chữ đi
      ]}>
        Trả hàng / Báo cáo
      </Text>
    </TouchableOpacity>
  );
})()}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
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
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", marginTop: 50, color: "#8E7AB5" }}
          >
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
    shadowColor: "#000",
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
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  btnSecondaryText: { color: "#4A3B6B", fontWeight: "600" },
  btnPrimary: {
    backgroundColor: "#B59DFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  btnPrimaryText: { color: "white", fontWeight: "600" },
  btnDisabled: {
    backgroundColor: '#E0E0E0', // Nền xám mờ
    borderWidth: 0, // Bỏ viền cho chìm luôn
    elevation: 0, // Xóa bóng (đối với Android)
    shadowOpacity: 0, // Xóa bóng (đối với iOS)
  },
  btnDisabledText: {
    color: '#A0A0A0', // Chữ màu xám nhạt
  }
});
