import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { providerService } from "@/src/services/providerService";
import { serviceControllerService } from "@/src/services/serviceControllerService";

interface ProviderServiceItem {
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

export default function ProviderServicesScreen() {
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, []),
  );

  const fetchServices = async () => {
    try {
      setIsLoading(true);

      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        setServices([]);
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = Number(decoded.userId || decoded.sub);
      if (!userId) {
        setServices([]);
        return;
      }

      const providerRes = await providerService.getByUser(userId);
      const providerId = providerRes.data?.result?.id;
      if (!providerId) {
        setServices([]);
        return;
      }

      const res = await serviceControllerService.getServicesByProvider(
        Number(providerId),
      );
      if (res.data?.code === 0) {
        setServices(res.data.result || []);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách dịch vụ provider:", error);
      setServices([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      value || 0,
    );

  const getTypeLabel = (type: string) => {
    if (type === "PHOTOGRAPHER") return "📸 Thợ ảnh";
    if (type === "EVENT_STAFF") return "🎪 Staff sự kiện";
    return type || "Không xác định";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dịch vụ đã đăng</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchServices();
              }}
              colors={["#B59DFF"]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                {item.imageUrls?.[0] ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={styles.serviceImage} />
                ) : (
                  <View style={[styles.serviceImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color="#B59DFF" />
                  </View>
                )}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {item.serviceName}
                  </Text>
                  <Text style={styles.serviceType}>{getTypeLabel(item.serviceType)}</Text>
                  <Text style={styles.serviceStatus}>Trạng thái: {item.status}</Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {item.description || "Không có mô tả."}
              </Text>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Giá / slot</Text>
                  <Text style={styles.priceValue}>{formatPrice(item.pricePerSlot)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.priceLabel}>Tiền cọc</Text>
                  <Text style={styles.priceValue}>{formatPrice(item.depositAmount)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(screens)/service-detail" as any,
                    params: { id: item.id },
                  })
                }
              >
                <Text style={styles.detailBtnText}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={60} color="#D4C4F0" />
              <Text style={styles.emptyTitle}>Chưa có dịch vụ nào</Text>
              <Text style={styles.emptySubtitle}>
                Danh sách dịch vụ PHOTOGRAPH/EVENT STAFF sẽ hiển thị ở đây
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
  listContainer: { padding: 15, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  topRow: { flexDirection: "row", marginBottom: 10 },
  serviceImage: { width: 72, height: 72, borderRadius: 10, marginRight: 12 },
  imagePlaceholder: {
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: { flex: 1, justifyContent: "center" },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 4 },
  serviceType: { fontSize: 12, color: "#8E7AB5", marginBottom: 2 },
  serviceStatus: { fontSize: 12, color: "#666" },
  description: { fontSize: 13, color: "#666", marginBottom: 10 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    paddingVertical: 10,
    marginBottom: 10,
  },
  priceLabel: { fontSize: 12, color: "#888" },
  priceValue: { fontSize: 15, fontWeight: "bold", color: "#B59DFF", marginTop: 2 },
  detailBtn: {
    backgroundColor: "#B59DFF",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  detailBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyContainer: { alignItems: "center", marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#4A3B6B", marginTop: 15 },
  emptySubtitle: {
    fontSize: 13,
    color: "#8E7AB5",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
