import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { orderService } from "@/src/services/orderService";

interface OrderDetail {
  id: number;
  cosplayerId: number;
  providerId: number;
  orderType: string;
  status: string;
  totalAmount: number;
  totalDepositAmount?: number;
  createdAt?: string;
  rentDate?: string;
  images?: Array<{ imageUrl?: string } | string>;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await orderService.getOrder(Number(id));
      if (res.data?.code === 0) {
        setOrder(res.data.result ?? null);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết đơn hàng:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ACTIVE":
      case "COMPLETED":
      case "CONFIRMED":
        return "#22C55E";
      case "INACTIVE":
      case "CANCELLED":
        return "#EF4444";
      case "UNCONFIRM":
      case "UNPAID":
      case "PAID":
      case "PREPARING":
      case "SHIPPING_OUT":
      case "DELIVERING_OUT":
      case "IN_USE":
      case "SHIPPING_BACK":
        return "#F59E0B";
      default:
        return "#B59DFF";
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN");
  };

  const coverImageUri = (() => {
    const firstImage = order?.images?.[0];
    if (!firstImage) return "https://via.placeholder.com/600x400";
    if (typeof firstImage === "string") return firstImage;
    return firstImage.imageUrl || "https://via.placeholder.com/600x400";
  })();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>Không tìm thấy dữ liệu chi tiết.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: coverImageUri }}
          style={styles.coverImage}
        />

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.serviceName}>Đơn #{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}22` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status || "UNKNOWN"}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceType}>{order.orderType || "-"}</Text>
          <Text style={styles.description}>Tổng tiền: {formatPrice(order.totalAmount)}</Text>
          <Text style={styles.description}>
            Tiền cọc: {formatPrice(order.totalDepositAmount || 0)}
          </Text>
          <Text style={styles.description}>Ngày tạo: {formatDateTime(order.createdAt)}</Text>
          <Text style={styles.description}>Ngày thuê: {formatDateTime(order.rentDate)}</Text>
          <Text style={styles.description}>Cosplayer ID: {order.cosplayerId ?? "-"}</Text>
          <Text style={styles.description}>Provider ID: {order.providerId ?? "-"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#4A3B6B" },
  content: { padding: 16, paddingBottom: 32 },
  coverImage: { width: "100%", height: 220, borderRadius: 12, marginBottom: 14, backgroundColor: "#EEE" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  serviceName: { flex: 1, fontSize: 18, fontWeight: "700", color: "#2D2342" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  serviceType: { marginTop: 6, fontSize: 12, color: "#8E7AB5", textTransform: "uppercase" },
  description: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#555" },
  emptyText: { color: "#666", marginBottom: 12 },
  backBtn: { backgroundColor: "#B59DFF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: "#fff", fontWeight: "700" },
});
