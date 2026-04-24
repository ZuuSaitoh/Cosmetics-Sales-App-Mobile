import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatService } from "@/src/services/chatService";
import { costumeService } from "@/src/services/costumeService";
import {
  canShowOrderExtend,
  getOrderDetailRowId,
  getOrderDetailRows,
  isOrderStatusInUse,
  orderExtendService,
} from "@/src/services/orderExtendService";
import { orderService } from "@/src/services/orderService";
import { providerService } from "@/src/services/providerService";
import { reviewService } from "@/src/services/reviewService";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [trackings, setTrackings] = useState<any[]>([]); // 🚩 State mới cho tracking
  const [isLoading, setIsLoading] = useState(true);

  // === TIMELINE CỐ ĐỊNH THEO FLOW ĐƠN HÀNG ===
  const ORDER_STEPS = [
    { key: "UNPAID", label: "Chờ thanh toán" },
    { key: "PAID", label: "Đã thanh toán" },
    { key: "PREPARING", label: "Đang chuẩn bị" },
    { key: "SHIPPING_OUT", label: "Đang giao đi" },
    { key: "DELIVERY_OUT", label: "Đã giao hàng" },
    { key: "IN_USE", label: "Đang sử dụng" },
    { key: "SHIPPING_BACK", label: "Đang trả hàng" },
    { key: "COMPLETED", label: "Hoàn thành" },
  ];

  const getStepStatus = (stepKey: string): "completed" | "active" | "pending" => {
    if (!order) return "pending";
    const currentStatus = order.status;
    // CANCELLED → highlight dispute path
    if (currentStatus === "CANCELLED") {
      if (["UNPAID", "PAID"].includes(stepKey)) return "completed";
      return "pending";
    }
    // DISPUTE
    if (currentStatus === "DISPUTE") {
      if (["UNPAID", "PAID", "PREPARING", "SHIPPING_OUT", "DELIVERY_OUT"].includes(stepKey)) return "completed";
      return "pending";
    }
    const stepIndex = ORDER_STEPS.findIndex((s) => s.key === stepKey);
    const currentIndex = ORDER_STEPS.findIndex((s) => s.key === currentStatus);
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };
  const [initialIndex, setInitialIndex] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const { width: screenWidth } = Dimensions.get("window");
  const [review, setReview] = useState<any>(null);
  const reviewImages = Array.isArray(review?.images) ? review.images : [];
  const [costumeNames, setCostumeNames] = useState<Record<number, string>>({});

  // --- STATE CHO MODAL XÁC NHẬN NHẬN ĐỒ ---
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmImage, setConfirmImage] = useState<any>(null);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendDetailId, setExtendDetailId] = useState<number | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState("1");
  const [extendPayMethod, setExtendPayMethod] = useState<"VNPAY" | "MOMO" | "WALLET" | null>(
    null,
  );
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
      fetchReviewInfo();
      fetchOrderTrackings(); // 🚩 Gọi API tracking mới
    }
  }, [id]);

  // 🚩 HÀM MỚI: Lấy thông tin tracking từ controller chuyên biệt
  // Trong file order-detail.tsx

  const fetchOrderTrackings = async () => {
    try {
      const response = await orderService.getOrderTracking(Number(id));
      if (response.data.code === 0) {
        const sortedTrackings = response.data.result.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTrackings(sortedTrackings);
      }
    } catch (error) {
      console.error("Lỗi lấy tracking:", error);
    }
  };

  const fetchOrderDetail = async () => {
    try {
      const response = await orderService.getOrder(Number(id));
      if (response.data.code === 0) {
        const orderData = response.data.result;
        setOrder(orderData);

        // Load costume names
        const details = getOrderDetailRows(orderData as Record<string, unknown>);
        const newNames: Record<number, string> = { ...costumeNames };
        await Promise.all(
          details.map(async (item: any) => {
            const cid = Number(item.costumeId ?? item.costume_id);
            if (cid && !newNames[cid]) {
              try {
                const cRes = await costumeService.getById(cid);
                if (cRes.data.code === 0 && cRes.data.result) {
                  newNames[cid] = cRes.data.result.name || "Trang phục";
                }
              } catch {}
            }
          }),
        );
        setCostumeNames(newNames);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết đơn:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewInfo = async () => {
    try {
      const res = await reviewService.getByOrder(Number(id));
      if (
        res.data.code === 0 &&
        res.data.result &&
        res.data.result.length > 0
      ) {
        setReview(res.data.result[0]);
      }
    } catch (err) {
      setReview(null);
    }
  };

  // Lấy userId của provider (User B) từ providerId rồi mở phòng chat
  const handleOpenChat = async () => {
    if (!order) return;
    if (openingChat) return;
    const providerId = order.providerId;
    console.log(">>> [handleOpenChat] providerId:", providerId);
    if (!providerId) {
      Alert.alert("Thông báo", "Không có thông tin cửa hàng để liên hệ.");
      return;
    }
    setOpeningChat(true);
    try {
      // 1. Lấy userId của provider (User B) từ providerId
      const providerRes = await providerService.getById(providerId);
      console.log(">>> [handleOpenChat] providerRes:", providerRes?.data);
      const providerUserId = providerRes.data?.result?.userId;
      const providerShopName = providerRes.data?.result?.shopName;
      console.log(">>> [handleOpenChat] providerUserId (User B):", providerUserId);
      if (!providerUserId) {
        Alert.alert("Lỗi", "Không tìm thấy tài khoản cửa hàng.");
        return;
      }
      // 2. Lấy userId của current user (User A) từ token
      const token = await AsyncStorage.getItem("cosmate_token");
      console.log(">>> [handleOpenChat] token:", token);
      if (!token) {
        router.push("/(auth)/login");
        return;
      }
      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.sub ?? decoded.userId ?? decoded.id;
      console.log(">>> [handleOpenChat] decoded token:", decoded);
      console.log(">>> [handleOpenChat] currentUserId (User A):", currentUserId);
      if (!currentUserId) {
        Alert.alert("Lỗi", "Không xác định được tài khoản của bạn.");
        return;
      }
      // 3. Tạo hoặc tìm phòng chat giữa User A và User B
      console.log(">>> [handleOpenChat] calling getOrCreateRoom with:", {
        user1Id: Number(currentUserId),
        user2Id: Number(providerUserId),
      });
      const chatRes = await chatService.getOrCreateRoom(
        Number(currentUserId),
        Number(providerUserId),
      );
      console.log(">>> [handleOpenChat] chatRes:", chatRes?.data);
      const roomId = chatRes.data?.result?.id ?? chatRes.data?.id;
      console.log(">>> [handleOpenChat] roomId:", roomId);
      // 4. Điều hướng sang phòng chat
      router.push({
        pathname: "/chat/[roomId]",
        params: {
          roomId: String(roomId),
          partnerId: String(providerUserId),
          partnerName: providerShopName || order.shopName || "Cửa hàng Cosplay",
        },
      });
    } catch (err) {
      console.error(">>> [handleOpenChat] ERROR:", err);
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setOpeningChat(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);

  const openExtendModal = (detailId: number) => {
    setExtendDetailId(detailId);
    setExtendDaysInput("1");
    setExtendPayMethod(null);
    setExtendModalVisible(true);
  };

  const submitExtendRequest = async () => {
    if (!order || extendDetailId == null) return;
    const days = Math.floor(Number(extendDaysInput));
    if (!Number.isFinite(days) || days < 1) {
      Alert.alert("Thông báo", "Nhập số ngày gia hạn hợp lệ (tối thiểu 1).");
      return;
    }
    if (!extendPayMethod) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán.");
      return;
    }
    setExtendSubmitting(true);
    try {
      const SERVER_IP = "171.232.184.122";
      const returnUrl =
        extendPayMethod === "VNPAY"
          ? `http://${SERVER_IP}:8080/api/payment/api/vnpay/return`
          : extendPayMethod === "MOMO"
            ? `http://${SERVER_IP}:8080/api/payment/api/momo/return`
            : Linking.createURL("/");

      const res = await orderExtendService.requestExtend(order.id, extendDetailId, {
        extendDays: days,
        paymentMethod: extendPayMethod,
        returnUrl,
        payNow: true,
      });

      if (res.data?.code === 0) {
        const result = res.data.result as { paymentUrl?: string } | undefined;
        const paymentUrl =
          result?.paymentUrl &&
          typeof result.paymentUrl === "string" &&
          result.paymentUrl.trim()
            ? result.paymentUrl.trim()
            : "";

        if (paymentUrl && extendPayMethod !== "WALLET") {
          setExtendModalVisible(false);
          await Linking.openURL(paymentUrl);
        } else {
          Alert.alert("Thành công", "Đã tạo yêu cầu gia hạn.");
          setExtendModalVisible(false);
          await fetchOrderDetail();
        }
      } else {
        Alert.alert("Lỗi", res.data?.message || "Không thể gia hạn.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Không thể gia hạn lúc này.");
    } finally {
      setExtendSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}  |  ${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
  };


  const openConfirmModal = () => {
    setConfirmImage(null);
    setIsConfirmModalVisible(true);
  };

  const pickConfirmImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Quyền truy cập", "Cần cấp quyền camera.");
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
      Alert.alert("Thông báo", "Vui lòng chụp ảnh tình trạng đồ.");
      return;
    }
    setIsConfirmingDelivery(true);
    try {
      const formData = new FormData();
      const localUri = confirmImage.uri;
      const filename = localUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append("images", { uri: localUri, name: filename, type } as any);
      const res = await orderService.confirmDelivery(Number(id), [{ uri: localUri, name: filename, type }]);
      if (res.data.code === 0) {
        Alert.alert("Thành công", "Đã xác nhận nhận hàng!");
        setIsConfirmModalVisible(false);
        fetchOrderDetail();
      }
    } catch {
      Alert.alert("Lỗi", "Không thể gửi xác nhận lúc này.");
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  if (isLoading)
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  if (!order)
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={{ color: "#8E7AB5" }}>Không tìm thấy đơn hàng.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statusBanner}>
          <View>
            <Text style={styles.statusText}>{order.status}</Text>
            <Text style={styles.statusSubText}>Mã đơn: #{order.id}</Text>
          </View>
          <Ionicons name="cube-outline" size={40} color="#fff" />
        </View>

        {/* 1. TIMELINE TRACKING */}
        <View style={styles.card}>
          <View
            style={styles.cardHeaderClickable}
            onTouchEnd={() => setIsTimelineExpanded(!isTimelineExpanded)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="navigate-circle-outline" size={20} color="#B59DFF" />
              <Text style={styles.cardTitle}>Lịch sử đơn hàng</Text>
            </View>
            <Ionicons
              name={isTimelineExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </View>

          {/* THU GỌN: chỉ hiện bước hiện tại */}
          {!isTimelineExpanded && (
            <View style={styles.timelineCollapsed}>
              {(() => {
                const currentStep = ORDER_STEPS.find((s) => s.key === order.status) || ORDER_STEPS[0];
                return (
                  <View style={styles.stepRow}>
                    <View style={styles.stepLine}>
                      <View style={[styles.stepDot, styles.stepDotActive]} />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, styles.stepLabelActive]}>
                        {currentStep.label}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {/* MỞ RỘNG: hiện tất cả bước */}
          {isTimelineExpanded && (
            <View style={styles.timelineSteps}>
              {ORDER_STEPS.map((step, index) => {
                const status = getStepStatus(step.key);
                const isLast = index === ORDER_STEPS.length - 1;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepLine}>
                      <View
                        style={[
                          styles.stepDot,
                          status === "completed" && styles.stepDotDone,
                          status === "active" && styles.stepDotActive,
                          status === "pending" && styles.stepDotPending,
                        ]}
                      />
                      {!isLast && (
                        <View
                          style={[
                            styles.stepConnector,
                            status === "completed" && styles.stepConnectorDone,
                            status === "pending" && styles.stepConnectorPending,
                            status === "active" && styles.stepConnectorDone,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepLabel,
                          status === "completed" && styles.stepLabelDone,
                          status === "active" && styles.stepLabelActive,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {(order.status === "CANCELLED" || order.status === "DISPUTE") && (
                <View style={styles.stepRow}>
                  <View style={styles.stepLine}>
                    <View style={[styles.stepDot, styles.stepDotRed]} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepLabel, styles.stepLabelRed]}>
                      {order.status === "CANCELLED" ? "Đơn đã hủy" : "Khiếu nại"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
          </View>
          {order.addresses && order.addresses.length > 0 ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressName}>
                {order.addresses[0].name} | {order.addresses[0].phone}
              </Text>
              <Text style={styles.addressText}>
                {order.addresses[0].address}
              </Text>
              <Text style={styles.addressText}>
                {order.addresses[0].district}, {order.addresses[0].city}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Chưa cập nhật địa chỉ</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shirt-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Sản phẩm đã thuê</Text>
          </View>
          {getOrderDetailRows(order as Record<string, unknown>).map((raw: any, idx: number) => {
            const rowId = getOrderDetailRowId(raw as Record<string, unknown>);
            const costumeId = Number(raw.costumeId ?? raw.costume_id) || 0;
            return (
              <View key={rowId ?? `detail-${idx}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {costumeNames[costumeId] || `Trang phục ID: ${costumeId || "—"}`}
                  </Text>
                  <Text style={styles.itemSub}>
                    Size: {raw.size} | Số lượng: x{raw.numberOfItems ?? raw.quantity ?? 1}
                  </Text>
                  <Text style={styles.itemSub}>
                    Thời gian: {raw.rentDay} ngày
                  </Text>
                </View>
                <View style={styles.itemRightCol}>
                  <Text style={styles.itemPrice}>
                    {formatPrice(Number(raw.rentAmount ?? raw.amount ?? 0))}
                  </Text>
                  {isOrderStatusInUse(order.status) && canShowOrderExtend(order as Record<string, unknown>) && (
                    <TouchableOpacity
                      style={styles.extendChip}
                      onPress={() => {
                        if (rowId == null) {
                          Alert.alert(
                            "Lỗi",
                            "Không xác định được dòng đơn để gia hạn. Vui lòng thử lại sau.",
                          );
                          return;
                        }
                        openExtendModal(rowId);
                      }}
                    >
                      <Text style={styles.extendChipText}>Gia hạn</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tiền cọc (Hoàn trả sau):</Text>
            <Text style={styles.depositPrice}>
              {formatPrice(order.totalDepositAmount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Tổng thanh toán:</Text>
            <Text style={styles.totalPriceBold}>
              {formatPrice(order.totalAmount)}
            </Text>
          </View>
        </View>

        {review && (
          <View style={styles.reviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.cardTitle}>Đánh giá của bạn</Text>
            </View>
            <View style={styles.reviewContent}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= review.rating ? "star" : "star-outline"}
                    size={22}
                    color="#FFD700"
                  />
                ))}
                <Text style={styles.ratingLabel}> - {review.rating}/5 sao</Text>
              </View>
              <Text style={styles.reviewComment}>
                {review.comment || "Không có bình luận."}
              </Text>
              {reviewImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewImagesScroll}
                >
                  {reviewImages.map((img: any, index: number) => (
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
              <Text style={styles.reviewDate}>
                Đã đánh giá vào: {formatDate(review.createdAt)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnAction, { flex: 1, marginRight: 8 }, openingChat && { opacity: 0.7 }]}
            onPress={handleOpenChat}
            disabled={openingChat}
          >
            <View style={styles.btnRowCenter}>
              {openingChat ? (
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.btnActionText}>
                {openingChat ? "Đang mở..." : "Liên hệ cửa hàng"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {order.status === "DELIVERY_OUT" && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnGreen, { flex: 1, marginRight: 8 }]}
              onPress={openConfirmModal}
            >
              <View style={styles.btnRowCenter}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnGreenText}>Đã nhận đồ</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnRed, { flex: 1 }]}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/create-dispute",
                  params: { orderId: id },
                } as any)
              }
            >
              <View style={styles.btnRowCenter}>
                <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnRedText}>Khiếu nại</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL GALLERY GIỮ NGUYÊN NHƯ CŨ */}
      <Modal
        visible={isPreviewVisible && reviewImages.length > 0}
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
            data={reviewImages}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            keyExtractor={(_, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
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

      {/* MODAL XÁC NHẬN NHẬN ĐỒ */}
      <Modal
        animationType="fade"
        transparent
        visible={extendModalVisible}
        onRequestClose={() => {
          if (!extendSubmitting) setExtendModalVisible(false);
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Gia hạn thuê</Text>
              <TouchableOpacity
                onPress={() => !extendSubmitting && setExtendModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.confirmModalSub}>
              Nhập số ngày muốn gia hạn và chọn cách thanh toán phần gia hạn.
            </Text>
            <Text style={styles.extendLabel}>Số ngày gia hạn</Text>
            <TextInput
              style={styles.extendInput}
              value={extendDaysInput}
              onChangeText={setExtendDaysInput}
              keyboardType="number-pad"
              placeholder="VD: 2"
              placeholderTextColor="#A090C5"
            />
            <Text style={[styles.extendLabel, { marginTop: 12 }]}>Thanh toán</Text>
            <View style={styles.extendPayRow}>
              {(["VNPAY", "MOMO", "WALLET"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.extendPayChip,
                    extendPayMethod === m && styles.extendPayChipActive,
                  ]}
                  onPress={() => setExtendPayMethod(m)}
                >
                  <Text
                    style={[
                      styles.extendPayChipText,
                      extendPayMethod === m && styles.extendPayChipTextActive,
                    ]}
                  >
                    {m === "VNPAY" ? "VNPAY" : m === "MOMO" ? "MoMo" : "Ví CosMate"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmSubmitBtn, extendSubmitting && { opacity: 0.7 }]}
              onPress={submitExtendRequest}
              disabled={extendSubmitting}
            >
              {extendSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmSubmitText}>Xác nhận gia hạn</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isConfirmModalVisible}
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Xác nhận nhận đồ</Text>
              <TouchableOpacity onPress={() => setIsConfirmModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.confirmModalSub}>
              Vui lòng chụp ảnh tình trạng đồ lúc nhận để làm bằng chứng bảo vệ bạn nhé!
            </Text>
            <TouchableOpacity style={styles.confirmUploadBox} onPress={pickConfirmImage}>
              {confirmImage ? (
                <Image source={{ uri: confirmImage.uri }} style={styles.confirmPreviewImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="camera-outline" size={40} color="#A090C5" />
                  <Text style={{ marginTop: 8, color: "#8E7AB5" }}>Bấm để mở Camera</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSubmitBtn, isConfirmingDelivery && { opacity: 0.7 }]}
              onPress={submitConfirmDelivery}
              disabled={isConfirmingDelivery}
            >
              {isConfirmingDelivery ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmSubmitText}>Gửi xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... Styles giữ nguyên ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statusBanner: {
    backgroundColor: "#B59DFF",
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  statusSubText: { color: "#E0D7FF", fontSize: 14 },
  card: { backgroundColor: "#fff", marginTop: 10, padding: 15 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  cardHeaderClickable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginLeft: 10,
  },
  trackingContainer: { paddingLeft: 10 },
  trackingRow: { flexDirection: "row" },
  timelineColumn: { alignItems: "center", width: 20, marginRight: 15 },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 2 },
  dotActive: {
    backgroundColor: "#28A745",
    borderWidth: 2,
    borderColor: "#D4EDDA",
  },
  dotInactive: { backgroundColor: "#D1D1D1" },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginTop: -2,
    marginBottom: -2,
    zIndex: 1,
  },
  trackingContent: { flex: 1, paddingBottom: 25, marginTop: -3 },
  trackStage: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  textActive: { color: "#28A745" },
  trackTime: { fontSize: 12, color: "#999" },
  addressBox: { paddingLeft: 10 },
  addressName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  addressText: { fontSize: 14, color: "#666", marginBottom: 3 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  itemSub: { fontSize: 13, color: "#888", marginBottom: 2 },
  itemPrice: { fontSize: 15, fontWeight: "600", color: "#4A3B6B" },
  itemRightCol: { alignItems: "flex-end", minWidth: 88 },
  extendChip: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B59DFF",
    backgroundColor: "#F4F1FF",
  },
  extendChipText: { fontSize: 12, fontWeight: "700", color: "#6F58A8" },
  extendLabel: { fontSize: 13, fontWeight: "600", color: "#4A3B6B", marginBottom: 6 },
  extendInput: {
    borderWidth: 1,
    borderColor: "#E6DBFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAF9FF",
  },
  extendPayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  extendPayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    backgroundColor: "#fff",
  },
  extendPayChipActive: {
    borderColor: "#B59DFF",
    backgroundColor: "#F4F1FF",
  },
  extendPayChipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  extendPayChipTextActive: { color: "#6F58A8" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 15 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: { fontSize: 14, color: "#666" },
  depositPrice: { fontSize: 14, color: "#FF9900" },
  totalLabelBold: { fontSize: 16, fontWeight: "bold", color: "#333" },
  totalPriceBold: { fontSize: 18, fontWeight: "bold", color: "#B59DFF" },
  btnRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 50 },
  btnRowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnAction: {
    backgroundColor: "#4A3B6B",
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 50,
  },
  btnActionText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnDispute: {
    backgroundColor: "#FF9800",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 50,
  },
  btnDisputeText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  emptyText: { color: "#999", fontStyle: "italic", paddingLeft: 10 },
  reviewCard: {
    backgroundColor: "#fff",
    marginTop: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#B59DFF",
  },
  reviewContent: { paddingLeft: 10 },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  ratingLabel: { marginLeft: 5, color: "#FFD700", fontWeight: "bold" },
  reviewComment: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 15,
  },
  reviewImagesScroll: { flexDirection: "row", marginBottom: 10 },
  reviewPreviewImg: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  reviewDate: { fontSize: 12, color: "#999", textAlign: "right" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "100%", height: "80%" },
  closePreview: { position: "absolute", top: 50, right: 20, zIndex: 99 },
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
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  confirmModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  confirmModalTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  confirmModalSub: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmUploadBox: {
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
  confirmPreviewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  confirmSubmitBtn: {
    backgroundColor: "#28A745",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // === TIMELINE STYLES ===
  timelineSteps: { paddingLeft: 10, paddingTop: 5 },
  timelineCollapsed: { paddingLeft: 10, paddingTop: 5 },
  stepRow: { flexDirection: "row", minHeight: 45 },
  stepLine: { alignItems: "center", width: 24, marginRight: 12 },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
    zIndex: 2,
  },
  stepDotDone: { backgroundColor: "#28A745" },
  stepDotActive: { backgroundColor: "#B59DFF", borderWidth: 3, borderColor: "#E0D7FF" },
  stepDotPending: { backgroundColor: "#D1D1D1" },
  stepDotRed: { backgroundColor: "#DC3545" },
  stepConnector: {
    width: 2,
    flex: 1,
    marginTop: -1,
    marginBottom: -1,
    minHeight: 28,
  },
  stepConnectorDone: { backgroundColor: "#28A745" },
  stepConnectorPending: { backgroundColor: "#D1D1D1" },
  stepContent: { flex: 1, paddingBottom: 22, marginTop: -2 },
  stepLabel: { fontSize: 15, fontWeight: "600", color: "#999" },
  stepLabelDone: { color: "#666" },
  stepLabelActive: { color: "#B59DFF", fontWeight: "bold" },
  stepLabelRed: { color: "#DC3545", fontWeight: "bold" },
  stepCurrent: { fontSize: 12, color: "#B59DFF", marginTop: 2 },

  // Dispute card
  disputeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
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
});
