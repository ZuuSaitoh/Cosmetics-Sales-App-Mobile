import { orderService } from "@/src/services/orderService";
import { reviewService } from "@/src/services/reviewService";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [costumeImages, setCostumeImages] = useState<Record<number, string>>(
    {},
  );

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState<number | null>(null);
  const [confirmImage, setConfirmImage] = useState<any>(null);
  // Ref track review status — không trigger re-render trong lúc fetch
  const reviewedOrdersRef = React.useRef<Record<number, boolean>>({});
  const ORDER_STATUS_TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "WAITING", label: "Chờ hàng" },
    { key: "DELIVERING_OUT", label: "Đang giao" },
    { key: "IN_USE", label: "Đang thuê" },
    { key: "SHIPPING_BACK", label: "Trả đồ" },
    { key: "COMPLETED", label: "Hoàn thành" },
    { key: "CANCELLED", label: "Đã hủy" },
  ];
  const [selectedTab, setSelectedTab] = useState("ALL");
  const filteredOrders = (orders || []).filter((order: any) => {
    if (selectedTab === "ALL") return true;
    if (selectedTab === "WAITING") {
      return ["UNPAID", "PAID", "PREPARING", "SHIPPING_OUT"].includes(
        order.status,
      );
    }
    return order.status === selectedTab;
  });

    const fetchOrdersSilentlyRef = React.useRef<() => void>(() => {});

  useFocusEffect(
    React.useCallback(() => {
      fetchOrdersSilentlyRef.current();
    }, []),
  );

  const fetchOrdersSilently = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;
      const response = await orderService.getUserOrders(userId);
      if (response.data.code === 0) {
        const fetchedOrders = response.data.result || [];

        // Cập nhật review status khi login lại
        const reviewStatusMap: Record<number, boolean> = {};
        const completedOrders = fetchedOrders.filter(
          (o: any) => o.status === "COMPLETED",
        );
        await Promise.all(
          completedOrders.map(async (order: any) => {
            try {
              const revRes = await reviewService.getByOrder(order.id);
              if (
                revRes.data.code === 0 &&
                revRes.data.result &&
                Array.isArray(revRes.data.result) &&
                revRes.data.result.length > 0
              ) {
                reviewStatusMap[Number(order.id)] = true;
              }
            } catch {}
          }),
        );
        reviewedOrdersRef.current = reviewStatusMap;

        setOrders(fetchedOrders);
        fetchImagesForOrders(fetchedOrders);
      }
    } catch {}
  };

  fetchOrdersSilentlyRef.current = fetchOrdersSilently;

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
      const response = await orderService.getUserOrders(userId);

      if (response.data.code === 0) {
        const fetchedOrders = response.data.result;

        // BƯỚC 1: Lấy trước toàn bộ trạng thái đánh giá của các đơn COMPLETED
        const reviewStatusMap: Record<number, boolean> = {};
        const completedOrders = fetchedOrders.filter(
          (o: any) => o.status === "COMPLETED",
        );

        await Promise.all(
          completedOrders.map(async (order: any) => {
            try {
              const revRes = await reviewService.getByOrder(order.id);
              if (
                revRes.data.code === 0 &&
                revRes.data.result &&
                Array.isArray(revRes.data.result) &&
                revRes.data.result.length > 0
              ) {
                reviewStatusMap[Number(order.id)] = true;
              }
            } catch (err) {
              // API lỗi thì mặc định là chưa đánh giá
            }
          }),
        );

        // BƯỚC 2: Cập nhật Ref trạng thái đánh giá
        reviewedOrdersRef.current = reviewStatusMap;

        // BƯỚC 3: SAU KHI CÓ ĐỦ TRẠNG THÁI RỒI MỚI SET ORDERS ĐỂ HIỂN THỊ
        setOrders(fetchedOrders);

        // BƯỚC 4: Load ảnh chạy ngầm phía sau (không ảnh hưởng UI nút bấm)
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

  const handleCancelOrder = (orderId: number) => {
    Alert.alert("Xác nhận hủy", "Bạn chắc chắn muốn hủy đơn hàng này không?", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy đơn",
        style: "destructive",
        onPress: async () => {
          try {
            // Gửi yêu cầu cập nhật trạng thái sang CANCELLED
            const res = await orderService.cancelOrder(orderId);

            if (res.data.code === 0) {
              Alert.alert("Thành công", "Đã hủy đơn hàng thành công!");
              fetchOrders(); // Load lại danh sách để cập nhật UI
            }
          } catch (err) {
            Alert.alert(
              "Lỗi",
              "Không thể hủy đơn lúc này, bạn thử lại sau nha!",
            );
          }
        },
      },
    ]);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true); // Bắt đầu hiện icon xoay
    await fetchOrders(); // Gọi lại hàm lấy dữ liệu cũ của bạn
    setRefreshing(false); // Tắt icon xoay sau khi xong
  }, []);

  const fetchImagesForOrders = async (ordersList: any[]) => {
    const newImageMap: Record<number, string> = { ...costumeImages };
    let hasNewImages = false;

    for (const order of ordersList) {
      const firstItem =
        order.details && order.details.length > 0 ? order.details[0] : null;
      if (firstItem && firstItem.costumeId) {
        const cId = firstItem.costumeId;
        if (!newImageMap[cId]) {
          try {
            const imgRes = await orderService.getCostumeImage(cId);
            if (
              imgRes.data.code === 0 &&
              imgRes.data.result &&
              imgRes.data.result.length > 0
            ) {
              newImageMap[cId] =
                imgRes.data.result[0].imageUrl || imgRes.data.result[0];
              hasNewImages = true;
            }
          } catch (err) {}
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

  // === STATE CHO MODAL THANH TOÁN LẠI ===
  const [isRepayModalVisible, setIsRepayModalVisible] = useState(false);
  const [repayOrderId, setRepayOrderId] = useState<number | null>(null);
  const [selectedRepayMethod, setSelectedRepayMethod] = useState<string | null>(
    null,
  );
  const [isRepaying, setIsRepaying] = useState(false);

  const repayMethods = [
    { id: "VNPAY", label: "Ví VNPAY", icon: "credit-card" as const },
    { id: "MOMO", label: "Ví MoMo", icon: "phone-portrait" as const },
    { id: "WALLET", label: "Ví CosMate", icon: "pocket" as const },
  ];

  const openRepayModal = (orderId: number) => {
    setRepayOrderId(orderId);
    setSelectedRepayMethod(null);
    setIsRepayModalVisible(true);
  };

  const handleRepay = async () => {
    if (!selectedRepayMethod) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán!");
      return;
    }
    if (!repayOrderId) return;

    try {
      setIsRepaying(true);
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        setIsRepaying(false);
        return;
      }
      const decoded: any = jwtDecode(token);
      const cosplayerId = decoded.sub;
      const SERVER_IP = "171.232.184.122";
      const returnUrl =
        selectedRepayMethod === "VNPAY"
          ? `http://${SERVER_IP}:8080/api/payment/api/vnpay/return`
          : `http://${SERVER_IP}:8080/api/payment/api/momo/return`;

      const res = await orderService.repayOrder(repayOrderId, {
        cosplayerId,
        paymentMethod: selectedRepayMethod,
        returnUrl,
      });

      if (res.data.code === 0) {
        const orderData = res.data.result || res.data;
        const paymentUrl =
          orderData.paymentUrl ||
          orderData.url ||
          orderData.payUrl ||
          orderData.deeplink;

        if (paymentUrl && typeof paymentUrl === "string") {
          setIsRepayModalVisible(false);
          await Linking.openURL(paymentUrl);
          router.replace("/(tabs)/profile" as any);
        } else if (selectedRepayMethod === "WALLET") {
          setIsRepayModalVisible(false);
          Alert.alert("Thành công", "Thanh toán thành công qua ví CosMate!");
          fetchOrders();
        } else {
          Alert.alert("Lỗi", "Không nhận được link thanh toán từ Backend.");
        }
      } else {
        Alert.alert("Lỗi", res.data.message || "Thanh toán thất bại.");
      }
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể thanh toán lại lúc này.",
      );
    } finally {
      setIsRepaying(false);
    }
  };

  const openConfirmModal = (orderId: number) => {
    setConfirmOrderId(orderId);
    setConfirmImage(null);
    setIsConfirmModalVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Quyền truy cập",
        "Bạn cần cấp quyền camera để chụp ảnh xác nhận.",
      );
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
      Alert.alert(
        "Thông báo",
        "Vui lòng chụp ảnh tình trạng đồ để làm bằng chứng.",
      );
      return;
    }

    try {
      const formData = new FormData();
      const localUri = confirmImage.uri;
      const filename = localUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("images", { uri: localUri, name: filename, type } as any);

      const res = await orderService.confirmDelivery(confirmOrderId!, [
        { uri: localUri, name: filename, type },
      ]);

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
    // Dùng ref để đọc review status ngay lập tức, tránh stale state
    const isReviewed = !!reviewedOrdersRef.current[Number(item.id)];
    const firstItem =
      item.details && item.details.length > 0 ? item.details[0] : null;
    const costumeId = firstItem ? firstItem.costumeId : null;
    const coverImage =
      costumeId && costumeImages[costumeId]
        ? costumeImages[costumeId]
        : "https://via.placeholder.com/200x200.png?text=Loading...";
    const costumeName = firstItem
      ? `Trang phục ID: ${costumeId}`
      : "Đơn hàng Cosplay";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>Cửa hàng ID: {item.providerId}</Text>
          <Text
            style={[
              styles.statusText,
              { color: item.status === "COMPLETED" ? "#28A745" : "#B59DFF" },
            ]}
          >
            {item.status || "Đang xử lý"}
          </Text>
        </View>

        <View style={styles.productInfo}>
          <Image source={{ uri: coverImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {costumeName}{" "}
              {firstItem && firstItem.size ? `(Size: ${firstItem.size})` : ""}
            </Text>
            <Text style={styles.price}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {/* NÚT THANH TOÁN LẠI: CHỈ HIỆN KHI ĐƠN CHƯA THANH TOÁN */}
          {item.status === "UNPAID" && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                { borderColor: "#28A745", backgroundColor: "#F0FFF4" },
              ]}
              onPress={() => openRepayModal(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: "#28A745" }]}>
                Thanh toán lại
              </Text>
            </TouchableOpacity>
          )}
          {/* NÚT HỦY ĐƠN: CHỈ HIỆN KHI NGƯỜI BÁN CHƯA GỬI HÀNG */}
          {(item.status === "UNPAID" ||
            item.status === "PAID" ||
            item.status === "PREPARING") && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                { borderColor: "#FF4D4D", backgroundColor: "#FFF5F5" },
              ]}
              onPress={() => handleCancelOrder(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: "#FF4D4D" }]}>
                Hủy đơn hàng
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "COMPLETED" && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                {
                  borderColor: isReviewed ? "#CCC" : "#FFD700",
                  backgroundColor: isReviewed ? "#F5F5F5" : "#FFFDE7",
                },
              ]}
              onPress={() => {
                if (!isReviewed) {
                  router.push({
                    pathname: "/(screens)/review" as any,
                    params: { orderId: item.id, cosplayerId: item.cosplayerId },
                  } as any);
                }
              }}
              disabled={isReviewed} // KHÓA NÚT NẾU ĐÃ ĐÁNH GIÁ
            >
              <Text
                style={[
                  styles.btnOutlineText,
                  { color: isReviewed ? "#999" : "#FBC02D" },
                ]}
              >
                {isReviewed ? "Đã đánh giá" : "Đánh giá ngay"}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "DELIVERING_OUT" && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                { borderColor: "#28A745", backgroundColor: "#F0FFF4" },
              ]}
              onPress={() => openConfirmModal(item.id)}
            >
              <Text style={[styles.btnOutlineText, { color: "#28A745" }]}>
                Đã nhận được hàng
              </Text>
            </TouchableOpacity>
          )}

          {(item.status === "IN_USE" || item.status === "SHIPPING_BACK") && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                {
                  borderColor:
                    item.status === "SHIPPING_BACK" ? "#CCC" : "#FF9900",
                  backgroundColor:
                    item.status === "SHIPPING_BACK" ? "#F5F5F5" : "#FFF9F0",
                },
              ]}
              onPress={() => handleReturnItem(item.id)}
              disabled={item.status === "SHIPPING_BACK"} // VÔ HIỆU HÓA NÚT TẠI ĐÂY
            >
              <Text
                style={[
                  styles.btnOutlineText,
                  {
                    color: item.status === "SHIPPING_BACK" ? "#999" : "#FF9900",
                  },
                ]}
              >
                {item.status === "SHIPPING_BACK"
                  ? "Đang chờ xác nhận trả"
                  : "Trả đồ & Nhận cọc"}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "IN_USE" && (
            <TouchableOpacity
              style={[
                styles.btnOutline,
                { borderColor: "#FF9800", backgroundColor: "#FFF3E0" },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/create-dispute",
                  params: { orderId: item.id },
                } as any)
              }
            >
              <Text style={[styles.btnOutlineText, { color: "#FF9800" }]}>
                Khiếu nại
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() =>
              router.push({
                pathname: "/(screens)/order-detail" as any,
                params: { id: item.id },
              })
            }
          >
            <Text style={styles.btnOutlineText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Đơn thuê của tôi</Text>
      </View>
      {/* THANH TAB TRẠNG THÁI */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {ORDER_STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                selectedTab === tab.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTab === tab.key && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filteredOrders} // Luôn là filteredOrders bạn nhé!
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không tìm thấy đơn hàng nào.</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#B59DFF"]} // Màu tím chuẩn CosMate của bạn
            tintColor="#B59DFF" // Dành cho iOS
          />
        }
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
              Vui lòng chụp ảnh tình trạng đồ lúc nhận để làm bằng chứng bảo vệ
              bạn nhé!
            </Text>

            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {confirmImage ? (
                <Image
                  source={{ uri: confirmImage.uri }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="camera-outline" size={40} color="#A090C5" />
                  <Text style={{ marginTop: 8, color: "#8E7AB5" }}>
                    Bấm để mở Camera
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={submitConfirmDelivery}
            >
              <Text style={styles.modalSubmitText}>Gửi xác nhận & Thuê đồ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CHỌN PHƯƠNG THỨC THANH TOÁN LẠI */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isRepayModalVisible}
        onRequestClose={() => setIsRepayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
              <TouchableOpacity onPress={() => setIsRepayModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginBottom: 20 }}>
              {repayMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.repayMethodRow,
                    selectedRepayMethod === method.id &&
                      styles.repayMethodRowActive,
                  ]}
                  onPress={() => setSelectedRepayMethod(method.id)}
                >
                  <Feather
                    name={method.icon as any}
                    size={22}
                    color={
                      selectedRepayMethod === method.id ? "#B59DFF" : "#888"
                    }
                  />
                  <Text
                    style={[
                      styles.repayMethodText,
                      selectedRepayMethod === method.id &&
                        styles.repayMethodTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Feather
                    name={
                      selectedRepayMethod === method.id
                        ? "check-circle"
                        : "circle"
                    }
                    size={20}
                    color={
                      selectedRepayMethod === method.id ? "#B59DFF" : "#DDD"
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, isRepaying && { opacity: 0.7 }]}
              onPress={handleRepay}
              disabled={isRepaying}
            >
              <Text style={styles.modalSubmitText}>
                {isRepaying ? "Đang xử lý..." : "Thanh toán ngay"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E0D7FF",
  },
  productDetails: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 15, color: "#333", marginBottom: 5 },
  price: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 10,
  },
  btnOutline: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B59DFF",
    backgroundColor: "#fff",
  },
  btnOutlineText: { color: "#B59DFF", fontWeight: "bold" },

  // STYLES CHO MODAL MỚI THÊM
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  modalSubText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
    lineHeight: 18,
  },
  uploadBox: {
    height: 160,
    borderWidth: 1,
    borderColor: "#D1C4E9",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FAF9FF",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  modalSubmitBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  // Trong phần styles của index.tsx
  tabContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    gap: 10,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  tabItemActive: {
    backgroundColor: "#B59DFF", // Màu tím mộng mơ thương hiệu
    borderColor: "#B59DFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterWrapper: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterContainer: { paddingHorizontal: 15 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F5F7",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: { backgroundColor: "#F4F1FF", borderColor: "#B59DFF" },
  filterChipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  filterChipTextActive: { color: "#B59DFF", fontWeight: "bold" },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 50,
    fontStyle: "italic",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    // Xóa borderBottomWidth ở đây nếu bạn muốn Header và Tab Bar dính liền nhau
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4A3B6B", // Màu tím đậm đặc trưng của CosMate
  },
  repayMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    backgroundColor: "#FAF9FF",
    gap: 12,
  },
  repayMethodRowActive: {
    borderColor: "#B59DFF",
    backgroundColor: "#F4F1FF",
  },
  repayMethodText: {
    flex: 1,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  repayMethodTextActive: {
    color: "#B59DFF",
    fontWeight: "bold",
  },
});
