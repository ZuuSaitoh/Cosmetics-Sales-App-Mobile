import { serviceControllerService } from "@/src/services/serviceControllerService";
import { API_BASE_URL } from "@/src/api/axiosClient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BOOKING_STATUSES = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "IN_PROGRESS", label: "Đang thực hiện" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

interface BookingService {
  id: number;
  serviceName: string;
  serviceType: string;
  description: string;
  pricePerSlot: number;
  slotDurationHours: number;
  imageUrls: string[];
}

interface Booking {
  id: number;
  cosplayerId: number;
  providerId: number;
  serviceId: number;
  status: string;
  totalAmount: number;
  depositAmount: number;
  bookingDate: string;
  service: BookingService;
}

export default function BookingHistoryScreen() {
  const apiHost = API_BASE_URL.replace(/\/api$/, "");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, []),
  );

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const res = await serviceControllerService.getProviderServiceOrders();
      if (res.data.code === 0) {
        setBookings(res.data.result || []);
      }
    } catch (err) {
      console.error("Lỗi lấy booking:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus === "ALL") return true;
    if (selectedStatus === "PENDING")
      return b.status === "PENDING" || b.status === "PAID";
    return b.status === selectedStatus;
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);

  const resolveImageUrl = (uri?: string) => {
    if (!uri || typeof uri !== "string" || !uri.trim()) return "";
    if (uri.startsWith("http")) return uri;
    return `${apiHost}${uri.startsWith("/") ? uri : `/${uri}`}`;
  };

  const handleConfirmBooking = (bookingId: number) => {
    Alert.alert("Xác nhận đơn", "Chấp nhận đơn thuê này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          setProcessingBookingId(bookingId);
          try {
            const res =
              await serviceControllerService.providerSetWaiting(bookingId);
            if (res.data.code === 0) {
              Alert.alert("Thành công", "Đã cập nhật trạng thái đơn!");
              fetchBookings();
            } else {
              Alert.alert("Lỗi", res.data.message);
            }
          } catch {
            Alert.alert("Lỗi", "Không thể xác nhận đơn.");
          } finally {
            setProcessingBookingId(null);
          }
        },
      },
    ]);
  };

  const handleCancelBooking = (bookingId: number) => {
    Alert.alert("Hủy đơn", "Bạn chắc chắn muốn hủy đơn này?", [
      { text: "Quay lại", style: "cancel" },
      {
        text: "Hủy",
        style: "destructive",
        onPress: async () => {
          setProcessingBookingId(bookingId);
          try {
            const res =
              await serviceControllerService.cancelServiceOrder(bookingId);
            if (res.data.code === 0) {
              Alert.alert("Thành công", "Đã hủy đơn!");
              fetchBookings();
            }
          } catch {
            Alert.alert("Lỗi", "Không thể hủy đơn.");
          } finally {
            setProcessingBookingId(null);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "#28A745";
      case "CANCELLED":
        return "#FF4D4D";
      case "IN_PROGRESS":
        return "#FF9900";
      case "CONFIRMED":
        return "#4A90D9";
      default:
        return "#B59DFF";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ xác nhận";
      case "PAID":
        return "Đã thanh toán";
      case "CONFIRMED":
        return "Đã xác nhận";
      case "IN_PROGRESS":
        return "Đang thực hiện";
      case "COMPLETED":
        return "Hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử thuê dịch vụ</Text>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {BOOKING_STATUSES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.filterChip,
                selectedStatus === s.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(s.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === s.key && styles.filterChipTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBookings();
              }}
              colors={["#B59DFF"]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {(() => {
                const serviceImageUrl = resolveImageUrl(item.service?.imageUrls?.[0]);
                return (
                  <>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.bookingId}>Đơn #{item.id}</Text>
                  <Text style={styles.bookingDate}>
                    {item.bookingDate
                      ? new Date(item.bookingDate).toLocaleDateString("vi-VN")
                      : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.serviceRow}>
                {serviceImageUrl ? (
                  <Image
                    source={{ uri: serviceImageUrl }}
                    style={styles.serviceImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.serviceImage,
                      styles.serviceImagePlaceholder,
                    ]}
                  >
                    <Ionicons name="camera-outline" size={24} color="#B59DFF" />
                  </View>
                )}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {item.service?.serviceName || "Dịch vụ"}
                  </Text>
                  <Text style={styles.serviceType}>
                    {item.service?.serviceType === "PHOTOGRAPHER"
                      ? "📸 Thợ ảnh"
                      : "🎪 Staff sự kiện"}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Tổng cộng</Text>
                  <Text style={styles.priceValue}>
                    {formatPrice(item.totalAmount)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.priceLabel}>Đã cọc</Text>
                  <Text style={styles.priceValue}>
                    {formatPrice(item.depositAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {(item.status === "PENDING" || item.status === "PAID") && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.btnOutline,
                        { borderColor: "#FF4D4D" },
                        processingBookingId === item.id && { opacity: 0.6 },
                      ]}
                      onPress={() => handleCancelBooking(item.id)}
                      disabled={processingBookingId === item.id}
                    >
                      {processingBookingId === item.id ? (
                        <ActivityIndicator size="small" color="#FF4D4D" />
                      ) : (
                        <Text
                          style={[styles.btnOutlineText, { color: "#FF4D4D" }]}
                        >
                          Hủy đơn
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.btnPrimary,
                        processingBookingId === item.id && { opacity: 0.7 },
                      ]}
                      onPress={() => handleConfirmBooking(item.id)}
                      disabled={processingBookingId === item.id}
                    >
                      {processingBookingId === item.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Xác nhận</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.btnOutline}
                  onPress={() =>
                    router.push({
                      pathname: "/(screens)/booking-detail" as any,
                      params: { id: item.id },
                    })
                  }
                >
                  <Text style={styles.btnOutlineText}>Chi tiết</Text>
                </TouchableOpacity>
              </View>
                  </>
                );
              })()}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#D4C4F0" />
              <Text style={styles.emptyTitle}>Chưa có đơn đặt nào</Text>
              <Text style={styles.emptySubtitle}>
                Đơn đặt dịch vụ sẽ xuất hiện ở đây
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#4A3B6B" },
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
  listContainer: { padding: 15, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bookingId: { fontSize: 14, fontWeight: "bold", color: "#4A3B6B" },
  bookingDate: { fontSize: 12, color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "bold" },
  serviceRow: { flexDirection: "row", marginBottom: 12 },
  serviceImage: { width: 70, height: 70, borderRadius: 10, marginRight: 12 },
  serviceImagePlaceholder: {
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: { flex: 1, justifyContent: "center" },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  serviceType: { fontSize: 12, color: "#888" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 12,
  },
  priceLabel: { fontSize: 12, color: "#888" },
  priceValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#B59DFF",
    marginTop: 2,
  },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnOutline: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B59DFF",
  },
  btnOutlineText: { color: "#B59DFF", fontWeight: "bold", fontSize: 13 },
  btnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "#B59DFF",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#4A3B6B",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#8E7AB5",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
