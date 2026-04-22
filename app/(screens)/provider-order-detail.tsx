import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { orderService } from "@/src/services/orderService";
import { reviewService } from "@/src/services/reviewService";
import { chatService } from "@/src/services/chatService";
import { costumeService } from "@/src/services/costumeService";
import { userService } from "@/src/services/userService";

const { width: screenWidth } = Dimensions.get("window");

export default function ProviderOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [costumeNames, setCostumeNames] = useState<Record<number, string>>({});
  const [customerName, setCustomerName] = useState<string>("");

  // --- STATE QUẢN LÝ ĐÁNH GIÁ (MỚI) ---
  const [review, setReview] = useState<any>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [openingChat, setOpeningChat] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
    fetchReviewInfo(); // Tự động lấy review nếu có
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const response = await orderService.getOrder(Number(id));
      if (response.data.code === 0) {
        const orderData = response.data.result;
        setOrder(orderData);

        // Lấy tên trang phục cho từng item
        const details = orderData.details || [];
        const newNames: Record<number, string> = { ...costumeNames };
        await Promise.all(
          details.map(async (item: any) => {
            if (item.costumeId && !newNames[item.costumeId]) {
              try {
                const cRes = await costumeService.getById(item.costumeId);
                if (cRes.data.code === 0 && cRes.data.result) {
                  newNames[item.costumeId] = cRes.data.result.name || "Trang phục";
                }
              } catch {}
            }
          }),
        );
        setCostumeNames(newNames);

        // Lấy tên khách hàng
        if (orderData.cosplayerId) {
          try {
            const uRes = await userService.getProfile(orderData.cosplayerId);
            if (uRes.data.code === 0 && uRes.data.result) {
              setCustomerName(uRes.data.result.fullName || uRes.data.result.name || "Khách hàng");
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết đơn (Provider):", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LẤY THÔNG TIN REVIEW TỪ KHÁCH HÀNG ---
  const fetchReviewInfo = async () => {
    try {
      const res = await reviewService.getByOrder(Number(id));
      // Backend trả về mảng result: [], lấy phần tử đầu tiên
      if (
        res.data.code === 0 &&
        res.data.result &&
        res.data.result.length > 0
      ) {
        setReview(res.data.result[0]);
      } else {
        setReview(null);
      }
    } catch (err) {
      setReview(null);
    }
  };

  const handleOpenChat = async () => {
    if (!order) return;
    if (openingChat) return;
    const customerUserId = order.cosplayerId;
    if (!customerUserId) {
      Alert.alert("Thông báo", "Không có thông tin khách hàng để liên hệ.");
      return;
    }
    setOpeningChat(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.push("/(auth)/login");
        return;
      }
      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.sub ?? decoded.userId ?? decoded.id;
      if (!currentUserId) {
        Alert.alert("Lỗi", "Không xác định được tài khoản của bạn.");
        return;
      }
      const chatRes = await chatService.getOrCreateRoom(
        Number(currentUserId),
        Number(customerUserId),
      );
      const roomId = chatRes.data?.result?.id ?? chatRes.data?.id;
      const chatPartnerName = customerName || order.userFullName || "Khách hàng";
      router.push({
        pathname: "/chat/[roomId]",
        params: {
          roomId: String(roomId),
          partnerId: String(customerUserId),
          partnerName: chatPartnerName,
        },
      });
    } catch (err) {
      console.error(">>> [handleOpenChat] ERROR:", err);
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setOpeningChat(false);
    }
  };

  const updateStatus = async (newStatus: string, message: string) => {
    Alert.alert("Xác nhận", message, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đồng ý",
        onPress: async () => {
          setIsUpdatingOrder(true);
          try {
            const res = await orderService.updateOrderStatus(Number(id), newStatus);
            if (res.data.code === 0) {
              Alert.alert("Thành công", "Đã cập nhật trạng thái!");
              fetchOrderDetail();
            }
          } catch (err) {
            Alert.alert("Lỗi", "Không thể cập nhật.");
          } finally {
            setIsUpdatingOrder(false);
          }
        },
      },
    ]);
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p || 0);

  if (isLoading)
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4A3B6B" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý đơn thuê</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBanner, { backgroundColor: "#4A3B6B" }]}>
          <View>
            <Text style={styles.statusText}>{order.status}</Text>
            <Text style={styles.statusSubText}>
              Khách hàng: {customerName || order.userFullName || "N/A"}
            </Text>
          </View>
          <Ionicons name="shield-checkmark-outline" size={40} color="#fff" />
        </View>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color="#4A3B6B" />
            <Text style={styles.cardTitle}>Thông tin người nhận</Text>
          </View>
          {order.addresses?.[0] ? (
            <View style={styles.infoContent}>
              <Text style={styles.infoName}>
                {order.addresses[0].name} | {order.addresses[0].phone}
              </Text>
              <Text style={styles.infoText}>{order.addresses[0].address}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Không có thông tin địa chỉ</Text>
          )}
        </View>

        {/* CHI TIẾT SẢN PHẨM */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shirt-outline" size={20} color="#4A3B6B" />
            <Text style={styles.cardTitle}>Sản phẩm khách đặt</Text>
          </View>
          {order.details?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {costumeNames[item.costumeId] || `Trang phục ID: ${item.costumeId}`}
                </Text>
                <Text style={styles.itemSub}>Size: {item.size}</Text>
              </View>
              <Text style={styles.itemPrice}>x{item.numberOfItems}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tiền cọc khách đã trả:</Text>
            <Text style={styles.depositPrice}>
              {formatPrice(order.totalDepositAmount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Tổng giá trị đơn:</Text>
            <Text style={styles.totalPriceBold}>
              {formatPrice(order.totalAmount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Doanh thu thực nhận:</Text>
            <Text style={[styles.totalPriceBold, { color: "#28A745" }]}>
              {formatPrice((order.totalAmount || 0) - (order.totalDepositAmount || 0))}
            </Text>
          </View>
        </View>

        {/* --- PHẦN MỚI: ĐÁNH GIÁ CỦA KHÁCH (CHỈ HIỆN KHI CÓ REVIEW) --- */}
        {review && (
          <View style={styles.reviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.cardTitle}>Khách hàng đánh giá</Text>
            </View>
            <View style={styles.reviewContent}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= review.rating ? "star" : "star-outline"}
                    size={18}
                    color="#FFD700"
                  />
                ))}
                <Text style={styles.ratingLabel}> - {review.rating}/5 sao</Text>
              </View>
              <Text style={styles.reviewComment}>
                {review.comment || "Khách không để lại bình luận."}
              </Text>

              {/* GALLERY ẢNH REVIEW */}
              {review?.images && review.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewImagesScroll}
                >
                  {review.images.map((img: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setInitialIndex(index);
                        setIsPreviewVisible(true);
                      }}
                    >
                      <Image
                        source={{ uri: img.url || img.imageUrl || img }}
                        style={styles.reviewPreviewImg}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* BỘ NÚT ĐIỀU KHIỂN */}
        <View style={styles.actionBox}>
          {order.status === "CREATED" && (
            <TouchableOpacity
              style={[styles.btnPrimary, isUpdatingOrder && { opacity: 0.7 }]}
              onPress={() =>
                updateStatus("DELIVERING_OUT", "Xác nhận đơn và đi giao ngay?")
              }
              disabled={isUpdatingOrder}
            >
              {isUpdatingOrder ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Xác nhận & Giao hàng</Text>
              )}
            </TouchableOpacity>
          )}
          {order.status === "SHIPPING_BACK" && (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btnGreen, { flex: 1, marginRight: 8 }, isUpdatingOrder && { opacity: 0.7 }]}
                onPress={() =>
                  updateStatus("COMPLETED", "Xác nhận nhận đồ & Hoàn cọc?")
                }
                disabled={isUpdatingOrder}
              >
                <View style={styles.btnRowCenter}>
                  {isUpdatingOrder ? (
                    <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.btnGreenText}>
                    {isUpdatingOrder ? "Đang xử lý..." : "Hoàn tất đơn hàng"}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnRed, { flex: 1 }]}
                onPress={() =>
                  router.push({
                    pathname: "/(screens)/create-dispute",
                    params: { orderId: order.id },
                  } as any)
                }
              >
                <View style={styles.btnRowCenter}>
                  <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnRedText}>Báo cáo hư hỏng</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.btnChat, openingChat && { opacity: 0.7 }]}
            onPress={handleOpenChat}
            disabled={openingChat || isUpdatingOrder}
          >
            {openingChat ? (
              <ActivityIndicator color="#4A3B6B" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color="#4A3B6B"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.btnChatText}>
              {openingChat ? "Đang mở..." : "Nhắn tin cho khách"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* KHIẾU NẠI */}
        {order.status === "DISPUTE" && (
          <TouchableOpacity
            style={styles.disputeCard}
            onPress={() =>
              router.push({
                pathname: "/(screens)/dispute-detail",
                params: { orderId: order.id },
              } as any)
            }
          >
            <View style={styles.disputeCardLeft}>
              <View style={styles.disputeIconWrap}>
                <Ionicons name="warning" size={22} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.disputeTitle}>Khiếu nại đang xử lý</Text>
                <Text style={styles.disputeSub}>Xem chi tiết</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL XEM ẢNH FULL MÀN HÌNH */}
      <Modal
        visible={isPreviewVisible && !!review}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setIsPreviewVisible(false)}
          >
            <Ionicons name="close-circle" size={45} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={review?.images || []}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: item.url || item.imageUrl || item }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statusBanner: {
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusSubText: { color: "#D1C4E9", fontSize: 14, marginTop: 5 },
  card: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginLeft: 8,
  },
  infoContent: { paddingLeft: 5 },
  infoName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  infoText: { fontSize: 14, color: "#666", lineHeight: 20 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemName: { fontSize: 14, color: "#4A3B6B", fontWeight: "600" },
  itemInfo: { flex: 1 },
  itemSub: { fontSize: 13, color: "#888", marginTop: 2 },
  itemPrice: { fontWeight: "bold", color: "#333" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, color: "#666" },
  totalLabelBold: { fontSize: 14, fontWeight: "bold", color: "#333" },
  depositPrice: { fontSize: 14, color: "#FF9900" },
  totalPriceBold: { fontSize: 18, fontWeight: "bold", color: "#B59DFF" },
  actionBox: { padding: 20, gap: 12 },
  btnRow: { flexDirection: "row" },
  btnRowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnPrimary: {
    backgroundColor: "#B59DFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnGreen: {
    backgroundColor: "#28A745",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnGreenText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnRed: {
    backgroundColor: "#DC3545",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnRedText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnChat: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#4A3B6B",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnChatText: { color: "#4A3B6B", fontWeight: "bold" },
  emptyText: { color: "#999", fontStyle: "italic", textAlign: "center" },

  // Dispute card
  disputeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  disputeCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  disputeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  disputeTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
  disputeSub: { fontSize: 13, color: "#999", marginTop: 2 },

  // REVIEW STYLES
  reviewCard: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#FFD700",
  },
  reviewContent: { paddingLeft: 5 },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ratingLabel: { marginLeft: 5, color: "#FFD700", fontWeight: "bold" },
  reviewComment: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
    marginBottom: 12,
  },
  reviewImagesScroll: { marginBottom: 10 },
  reviewPreviewImg: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
  },
  fullImage: { width: "100%", height: "80%" },
  closePreview: { position: "absolute", top: 50, right: 20, zIndex: 99 },
});
