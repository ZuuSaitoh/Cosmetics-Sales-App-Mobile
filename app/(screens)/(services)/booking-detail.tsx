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
import { serviceControllerService } from "@/src/services/serviceControllerService";

interface ServiceDetail {
  id: number;
  serviceName: string;
  serviceType: string;
  description: string;
  slotDurationHours: number;
  pricePerSlot: number;
  equipmentDepreciationCost: number;
  status: string;
  depositAmount: number;
  providerId: number;
  areas: string[];
  imageUrls: string[];
  minPrice: number;
  maxPrice: number;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await serviceControllerService.getServiceById(Number(id));
      if (res.data?.code === 0) {
        setService(res.data.result ?? null);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết booking/service:", error);
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
        return "#22C55E";
      case "INACTIVE":
      case "CANCELLED":
        return "#EF4444";
      default:
        return "#B59DFF";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!service) {
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
          source={{ uri: service.imageUrls?.[0] || "https://via.placeholder.com/600x400" }}
          style={styles.coverImage}
        />

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.serviceName}>{service.serviceName || "Dịch vụ"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(service.status)}22` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(service.status) }]}>
                {service.status || "UNKNOWN"}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceType}>{service.serviceType || "-"}</Text>
          <Text style={styles.description}>{service.description || "Không có mô tả."}</Text>
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
