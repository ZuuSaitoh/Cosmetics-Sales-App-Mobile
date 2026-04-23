import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { providerService } from "@/src/services/providerService";
import { serviceControllerService } from "@/src/services/serviceControllerService";

// Định nghĩa Interface cho Provider
interface ProviderDetail {
  id: number;
  shopName: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  verified: boolean;
  completedOrders: number;
  totalRating: number;
  totalReviews: number;
  bankName: string | null;
}

interface ProviderServiceItem {
  id: number;
  serviceName: string;
  serviceType: string;
  description: string;
  pricePerSlot: number;
  minPrice: number;
  maxPrice: number;
  imageUrls: string[];
}

export default function ProviderProfileScreen() {
  const { providerId } = useLocalSearchParams();
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const fetchProviderServices = useCallback(async (pid: number) => {
    try {
      setIsLoadingServices(true);
      const res = await serviceControllerService.getAllServicesByProvider(pid);
      if (res.data?.code === 0) {
        setServices(res.data.result || []);
      } else {
        setServices([]);
      }
    } catch {
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  const fetchProviderDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      // Gọi API lấy thông tin thợ ảnh theo providerId
      const res = await providerService.getById(Number(providerId));
      if (res.data.code === 0) {
        setProvider(res.data.result);
        await fetchProviderServices(res.data.result.id);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin thợ ảnh:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProviderServices, providerId]);

  useEffect(() => {
    if (providerId) fetchProviderDetails();
  }, [fetchProviderDetails, providerId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      price || 0,
    );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. Header & Cover Image */}
        <View style={styles.headerSection}>
          <Image
            source={{
              uri:
                provider?.coverImageUrl ||
                "https://via.placeholder.com/500x200",
            }}
            style={styles.coverImage}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 2. Avatar & Shop Info */}
        <View style={styles.profileInfoSection}>
          <Image
            source={{
              uri: provider?.avatarUrl || "https://via.placeholder.com/150",
            }}
            style={styles.avatar}
          />
          <View style={styles.mainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.shopName}>
                {provider?.shopName || "Thợ ảnh ẩn danh"}
              </Text>
              {provider?.verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#28A745"
                  style={{ marginLeft: 5 }}
                />
              )}
            </View>
            <Text style={styles.bioText}>
              {provider?.bio || "Chưa có giới thiệu."}
            </Text>
          </View>
        </View>

        {/* 3. Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {provider?.totalRating.toFixed(1) || "0.0"}
            </Text>
            <Text style={styles.statLabel}>
              Đánh giá ({provider?.totalReviews})
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {provider?.completedOrders || 0}
            </Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
        </View>

        {/* 4. Services */}
        <View style={styles.tabSection}>
          <Text style={styles.sectionTitle}>Dịch vụ đang có</Text>
          {isLoadingServices ? (
            <ActivityIndicator color="#B59DFF" />
          ) : services.length > 0 ? (
            <FlatList
              data={services}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(screens)/service-detail",
                      params: { id: item.id },
                    } as any)
                  }
                >
                  {item.imageUrls?.[0] ? (
                    <Image source={{ uri: item.imageUrls[0] }} style={styles.serviceImage} />
                  ) : (
                    <View style={[styles.serviceImage, styles.serviceImagePlaceholder]}>
                      <Ionicons name="image-outline" size={20} color="#B59DFF" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {item.serviceName}
                    </Text>
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {item.description || "Không có mô tả."}
                    </Text>
                    <Text style={styles.servicePrice}>
                      {formatPrice(item.minPrice || item.pricePerSlot)} -{" "}
                      {formatPrice(item.maxPrice || item.pricePerSlot)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons name="briefcase-outline" size={40} color="#CCC" />
              <Text style={styles.placeholderText}>
                Provider chưa đăng dịch vụ nào.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 5. Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            router.push({
              pathname: "/(screens)/chat",
              params: { providerId: provider?.id },
            } as any)
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color="#B59DFF"
          />
          <Text style={styles.chatBtnText}>Nhắn tin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>Đặt thợ ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { height: 200, width: "100%" },
  coverImage: { width: "100%", height: "100%", backgroundColor: "#E0D7FF" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 20,
  },
  profileInfoSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    alignItems: "flex-start",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#F0F0F0",
  },
  mainInfo: { marginTop: 10, width: "100%" },
  nameRow: { flexDirection: "row", alignItems: "center" },
  shopName: { fontSize: 22, fontWeight: "bold", color: "#333" },
  bioText: { fontSize: 14, color: "#666", marginTop: 5, lineHeight: 20 },
  statsContainer: {
    flexDirection: "row",
    margin: 20,
    padding: 15,
    backgroundColor: "#F8F9FB",
    borderRadius: 12,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  statDivider: { width: 1, height: "100%", backgroundColor: "#DDD" },
  tabSection: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  placeholderBox: {
    height: 150,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#999", marginTop: 10, fontSize: 13 },
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  serviceImage: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#F4F1FF",
  },
  serviceImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 12,
    color: "#B59DFF",
    fontWeight: "700",
  },
  bottomBar: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B59DFF",
    borderRadius: 8,
    marginRight: 10,
    height: 48,
  },
  chatBtnText: { color: "#B59DFF", fontWeight: "bold", marginLeft: 8 },
  bookBtn: {
    flex: 2,
    backgroundColor: "#B59DFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  bookBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
