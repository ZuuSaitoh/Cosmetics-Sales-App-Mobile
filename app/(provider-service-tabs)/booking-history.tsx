import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

const BOOKING_STATUSES = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "IN_PROGRESS", label: "Đang thực hiện" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#FF9900",
  CONFIRMED: "#007AFF",
  IN_PROGRESS: "#B59DFF",
  COMPLETED: "#28A745",
  CANCELLED: "#FF4D4D",
};

export default function BookingHistoryScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const providerRes = await axiosClient.get(`/providers/user/${userId}`);
      if (providerRes.data.code !== 0 || !providerRes.data.result) {
        setIsLoading(false);
        return;
      }
      const providerId = providerRes.data.result.id;

      // Fetch booking history for this service provider
      // Try multiple possible endpoints
      let response;
      try {
        response = await axiosClient.get(`/bookings/service-provider/${providerId}`);
      } catch {
        try {
          response = await axiosClient.get(`/bookings/provider/${providerId}`);
        } catch {
          // Fallback: fetch all bookings and filter by provider's services
          response = await axiosClient.get(`/bookings`);
        }
      }

      if (response.data.code === 0) {
        setBookings(response.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử thuê:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredBookings = bookings.filter((b: any) => {
    if (selectedStatus === "ALL") return true;
    return b.status === selectedStatus;
  });

  const handleConfirmBooking = (bookingId: number) => {
    // Placeholder: call /bookings/{id}/confirm
  };

  const handleCancelBooking = (bookingId: number) => {
    // Placeholder: call /bookings/{id}/cancel
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || "#999";
    const statusLabel =
      BOOKING_STATUSES.find((s) => s.key === item.status)?.label ||
      item.status ||
      "Không rõ";

    return (
      <View style={styles.card}>
        {/* CARD HEADER */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.customerName}>
                {item.customerName || item.cosplayerName || `Khách #${item.cosplayerId || item.userId || "?"}`}
              </Text>
              {item.customerPhone && (
                <Text style={styles.customerPhone}>{item.customerPhone}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* SERVICE INFO */}
        <View style={styles.serviceInfoRow}>
          <Ionicons name="briefcase-outline" size={16} color="#888" />
          <Text style={styles.serviceLabel}>
            Dịch vụ:
          </Text>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.serviceName || `Dịch vụ ID: ${item.serviceId}`}
          </Text>
        </View>

        {/* BOOKING DETAILS */}
        <View style={styles.detailsGrid}>
          {item.bookingDate && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color="#B59DFF" />
              <Text style={styles.detailLabel}>Ngày thuê:</Text>
              <Text style={styles.detailValue}>{formatDate(item.bookingDate)}</Text>
            </View>
          )}
          {item.slotTime && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color="#B59DFF" />
              <Text style={styles.detailLabel}>Ca:</Text>
              <Text style={styles.detailValue}>{item.slotTime}</Text>
            </View>
          )}
          {item.location && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#B59DFF" />
              <Text style={styles.detailLabel}>Địa điểm:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.numberOfHours && (
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={14} color="#B59DFF" />
              <Text style={styles.detailLabel}>Số giờ:</Text>
              <Text style={styles.detailValue}>{item.numberOfHours}h</Text>
            </View>
          )}
        </View>

        {/* PRICE & FOOTER */}
        <View style={styles.cardFooter}>
          <View>
            {item.totalPrice !== undefined && (
              <Text style={styles.priceLabel}>Tổng tiền:</Text>
            )}
            {item.totalPrice !== undefined && (
              <Text style={styles.priceValue}>{formatPrice(item.totalPrice)}</Text>
            )}
          </View>
          <View style={styles.footerActions}>
            {(item.status === "PENDING") && (
              <>
                <TouchableOpacity
                  style={[styles.btnAction, { borderColor: "#FF4D4D" }]}
                  onPress={() => handleCancelBooking(item.id)}
                >
                  <Text style={[styles.btnActionText, { color: "#FF4D4D" }]}>
                    Từ chối
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnAction, styles.btnPrimary]}
                  onPress={() => handleConfirmBooking(item.id)}
                >
                  <Text style={styles.btnPrimaryText}>Xác nhận</Text>
                </TouchableOpacity>
              </>
            )}
            {item.status !== "CANCELLED" && item.status !== "COMPLETED" && item.status !== "PENDING" && (
              <TouchableOpacity style={styles.btnDetail}>
                <Text style={styles.btnDetailText}>Chi tiết</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Lịch sử thuê dịch vụ</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={22} color="#4A3B6B" />
        </TouchableOpacity>
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {BOOKING_STATUSES.map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.filterChip,
                selectedStatus === status.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(status.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === status.key && styles.filterChipTextActive,
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* BOOKING LIST */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={50} color="#C4B9DF" />
              <Text style={styles.emptyText}>Chưa có lịch thuê nào.</Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={fetchData}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainTitle: { fontSize: 20, fontWeight: "900", color: "#4A3B6B" },
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
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#B59DFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  customerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C4B9DF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  customerName: { fontSize: 15, fontWeight: "600", color: "#333" },
  customerPhone: { fontSize: 12, color: "#888", marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  serviceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#F8F7FF",
    padding: 10,
    borderRadius: 8,
  },
  serviceLabel: { fontSize: 13, color: "#888", marginLeft: 6, marginRight: 4 },
  serviceName: { fontSize: 14, fontWeight: "600", color: "#4A3B6B", flex: 1 },
  detailsGrid: { marginBottom: 12 },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 13, color: "#888", marginLeft: 6, marginRight: 6, minWidth: 60 },
  detailValue: { fontSize: 13, color: "#333", fontWeight: "500", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  priceLabel: { fontSize: 12, color: "#888", marginBottom: 2 },
  priceValue: { fontSize: 18, fontWeight: "bold", color: "#B59DFF" },
  footerActions: { flexDirection: "row", gap: 8 },
  btnAction: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnActionText: { fontSize: 13, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: "#B59DFF",
    borderColor: "#B59DFF",
  },
  btnPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  btnDetail: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F4F5F7",
  },
  btnDetailText: { color: "#666", fontSize: 13, fontWeight: "600" },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#8E7AB5", fontSize: 15, fontStyle: "italic" },
});