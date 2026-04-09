import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
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
  Modal, // Thêm Modal vào đây
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Thêm icon cho đẹp
import axiosClient from "../api/axiosClient";

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [costumeImages, setCostumeImages] = useState<Record<number, string>>({});

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
        const fetchedOrders = response.data.result;
        setOrders(fetchedOrders);
        fetchImagesForOrders(fetchedOrders);
      } else {
        Alert.alert("Lỗi dữ liệu", response.data.message);
      }
    } catch (error: any) {
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImagesForOrders = async (ordersList: any[]) => {
    const newImageMap: Record<number, string> = { ...costumeImages };
    let hasNewImages = false;

    for (const order of ordersList) {
      const firstItem = order.details && order.details.length > 0 ? order.details[0] : null;
      if (firstItem && firstItem.costumeId) {
        const cId = firstItem.costumeId;
        if (!newImageMap[cId]) {
          try {
            const imgRes = await axiosClient.get(`/images/costume/${cId}`);
            if (imgRes.data.code === 0 && imgRes.data.result && imgRes.data.result.length > 0) {
              newImageMap[cId] = imgRes.data.result[0].imageUrl || imgRes.data.result[0];
              hasNewImages = true;
            }
          } catch (err) {
            console.log(`Không thể lấy ảnh cho costume ${cId}`);
          }
        }
      }
    }

    if (hasNewImages) {
      setCostumeImages(newImageMap);
    }
  };

  const handleReturnItem = (orderId: number) => {
    router.push({
      pathname: "/(screens)/return-camera" as any,
      params: { id: orderId },
    });
  };

  const openConfirmModal = (orderId: number) => {
    setConfirmOrderId(orderId);
    setConfirmImage(null);
    setIsConfirmModalVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền camera để chụp ảnh xác nhận.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) setConfirmImage(result.assets[0]);
  };

  const submitConfirmDelivery = async () => {
    if (!confirmImage) {
      Alert.alert("Thông báo", "Vui lòng chụp ảnh tình trạng đồ để làm bằng chứng.");
      return;
    }

    try {
      const formData = new FormData();
      const localUri = confirmImage.uri;
      const filename = localUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("images", { uri: localUri, name: filename, type } as any);

      const res = await axiosClient.post(
        `/orders/${confirmOrderId}/confirm-delivery`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Đã xác nhận nhận hàng!");
        setIsConfirmModalVisible(false);
        fetchOrders();
      }
    } catch (error) {
      console.error("Lỗi confirm delivery:", error);
      Alert.alert("Lỗi", "Không thể gửi xác nhận lúc này.");
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
    const costumeId = firstItem ? firstItem.costumeId : null;
    const coverImage = costumeId && costumeImages[costumeId] ? costumeImages[costumeId] : "https://via.placeholder.com/200x200.png?text=Loading...";
    const costumeName = firstItem ? `Trang phục ID: ${costumeId}` : "Đơn hàng Cosplay";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>Cửa hàng ID: {item.providerId}</Text>
          <Text style={[styles.statusText, { color: item.status === "COMPLETED" ? "#28A745" : "#B59DFF" }]}>
            {item.status || "Đang xử lý"}
          </Text>
        </View>

        <View style={styles.productInfo}>
          <Image source={{ uri: coverImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {costumeName} {firstItem && firstItem.size ? `(Size: ${firstItem.size})` : ""}
            </Text>
            <Text style={styles.price}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {item.status === "DELIVERING_OUT" && (
            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: "#28A745", backgroundColor: "#F0FFF4" }]}
              onPress={() => openConfirmModal(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: "#28A745" }]}>Đã nhận được hàng</Text>
            </TouchableOpacity>
          )}

          {item.status === "IN_USE" && (
            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: "#FF9900", backgroundColor: "#FFF9F0" }]}
              onPress={() => handleReturnItem(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: "#FF9900" }]}>Trả đồ & Nhận cọc</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => router.push({ pathname: "/(screens)/order-detail" as any, params: { id: item.id } })}
          >
            <Text style={styles.btnOutlineText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* MODAL ĐÃ ĐƯỢC THÊM LẠI ĐẦY ĐỦ Ở ĐÂY */}
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
              Vui lòng chụp ảnh tình trạng đồ lúc nhận để làm bằng chứng bảo vệ bạn nhé!
            </Text>

            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {confirmImage ? (
                <Image source={{ uri: confirmImage.uri }} style={styles.previewImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="camera-outline" size={40} color="#A090C5" />
                  <Text style={{ marginTop: 8, color: "#8E7AB5" }}>Bấm để mở Camera</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitConfirmDelivery}>
              <Text style={styles.modalSubmitText}>Gửi xác nhận & Thuê đồ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingBottom: 10, marginBottom: 10 },
  shopName: { fontSize: 14, fontWeight: "bold", color: "#4A3B6B" },
  statusText: { fontSize: 12, fontWeight: "bold" },
  productInfo: { flexDirection: "row", marginBottom: 15 },
  productImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12, backgroundColor: "#E0D7FF" },
  productDetails: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 15, color: "#333", marginBottom: 5 },
  price: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 15, gap: 10 },
  btnOutline: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: "#B59DFF", backgroundColor: "#fff" },
  btnOutlineText: { color: "#B59DFF", fontWeight: "bold" },

  // STYLES CHO MODAL MỚI THÊM
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  modalSubText: { fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 18 },
  uploadBox: { height: 160, borderWidth: 1, borderColor: "#D1C4E9", borderStyle: "dashed", borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 20, backgroundColor: "#FAF9FF", overflow: "hidden" },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  modalSubmitBtn: { backgroundColor: "#B59DFF", paddingVertical: 15, borderRadius: 8, alignItems: "center" },
  modalSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});