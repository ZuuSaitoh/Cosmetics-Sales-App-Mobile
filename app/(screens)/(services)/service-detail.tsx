import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/src/api/axiosClient";
import { chatService } from "@/src/services/chatService";
import { providerService } from "@/src/services/providerService";
import { serviceControllerService } from "@/src/services/serviceControllerService";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoverImageError, setIsCoverImageError] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setIsLoading(true);
      const res = await serviceControllerService.getServiceById(Number(id));
      if (res.data.code === 0) setService(res.data.result || null);
    } catch (err) {
      console.error("Lỗi lấy service:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  const apiHost = API_BASE_URL.replace(/\/api$/, "");
  const rawCoverImage = service?.imageUrls?.[0];
  const coverImageUri =
    typeof rawCoverImage === "string" && rawCoverImage.trim()
      ? rawCoverImage.startsWith("http")
        ? rawCoverImage
        : `${apiHost}${rawCoverImage.startsWith("/") ? rawCoverImage : `/${rawCoverImage}`}`
      : "";
  const areaLabels = Array.isArray(service?.areas)
    ? service.areas
        .map((area: any) => {
          if (typeof area === "string") return area;
          if (area?.district || area?.city) {
            return [area.district, area.city].filter(Boolean).join(", ");
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const handleContactProvider = async () => {
    if (openingChat) return;
    try {
      setOpeningChat(true);
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.push("/(auth)/login");
        return;
      }
      const decoded: any = jwtDecode(token);
      const currentUserId = Number(decoded.userId || decoded.sub || decoded.id);
      if (!currentUserId) {
        Alert.alert("Lỗi", "Không xác định được tài khoản của bạn.");
        return;
      }
      const providerId = Number(service?.providerId);
      if (!providerId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin provider.");
        return;
      }
      const providerRes = await providerService.getById(providerId);
      const providerUserId = Number(providerRes.data?.result?.userId);
      const providerName = providerRes.data?.result?.shopName || "Provider";
      const providerAvatar = providerRes.data?.result?.avatarUrl || "";
      if (!providerUserId) {
        Alert.alert("Lỗi", "Không tìm thấy tài khoản provider.");
        return;
      }

      const chatRes = await chatService.getOrCreateRoom(currentUserId, providerUserId);
      const roomId = chatRes.data?.result?.id ?? chatRes.data?.id;
      if (!roomId) {
        Alert.alert("Lỗi", "Không thể tạo phòng chat.");
        return;
      }

      router.push({
        pathname: "/chat/[roomId]",
        params: {
          roomId: String(roomId),
          partnerId: String(providerUserId),
          partnerName: providerName,
          partnerAvatar: providerAvatar,
        },
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể mở chat. Vui lòng thử lại.");
    } finally {
      setOpeningChat(false);
    }
  };

  if (isLoading || !service) return <ActivityIndicator style={{ flex: 1 }} color="#B59DFF" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!coverImageUri || isCoverImageError ? (
          <View style={styles.coverImagePlaceholder}>
            <Ionicons name="image-outline" size={34} color="#B59DFF" />
            <Text style={styles.coverImagePlaceholderText}>Chưa có ảnh dịch vụ</Text>
          </View>
        ) : (
          <Image
            source={{ uri: coverImageUri }}
            style={styles.coverImage}
            onError={() => setIsCoverImageError(true)}
          />
        )}
        <View style={styles.heroCard}>
          <Text style={styles.serviceName}>{service.serviceName}</Text>
          <Text style={styles.serviceType}>{String(service.serviceType || "").replace("_", " ")}</Text>
          <Text style={styles.description}>{service.description}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{service.status || "UNKNOWN"}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Khu vực hoạt động</Text>
          <View style={styles.areaWrap}>
            {areaLabels.length > 0 ? (
              areaLabels.map((area: string, idx: number) => (
                <View key={`${area}-${idx}`} style={styles.areaChip}>
                  <Ionicons name="location-outline" size={13} color="#7D6AA5" />
                  <Text style={styles.areaChipText}>{area}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.description}>Chưa cập nhật khu vực.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin dịch vụ</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá/slot</Text>
              <Text style={styles.metaValue}>{formatPrice(service.pricePerSlot)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Thời lượng</Text>
              <Text style={styles.metaValue}>{service.slotDurationHours || 0} giờ</Text>
            </View>
          </View>
          <View style={styles.metaBoxFull}>
            <Text style={styles.metaLabel}>Khấu hao thiết bị</Text>
            <Text style={styles.metaValue}>
              {formatPrice(service.equipmentDepreciationCost)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá tối thiểu</Text>
              <Text style={styles.metaValue}>{formatPrice(service.minPrice)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá tối đa</Text>
              <Text style={styles.metaValue}>{formatPrice(service.maxPrice)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.contactBtn, openingChat && { opacity: 0.7 }]}
          onPress={handleContactProvider}
          disabled={openingChat}
        >
          {openingChat ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Liên hệ provider</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  scrollContent: { padding: 14, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  coverImage: { width: "100%", height: 250, borderRadius: 16 },
  coverImagePlaceholder: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    backgroundColor: "#F2EEFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  coverImagePlaceholderText: {
    color: "#8E7AB5",
    fontSize: 13,
    fontWeight: "600",
  },
  heroCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECE9F6",
  },
  serviceName: { fontSize: 20, fontWeight: "bold", color: "#4A3B6B", marginBottom: 4 },
  serviceType: { fontSize: 13, color: "#B59DFF", textTransform: "uppercase", marginBottom: 8 },
  description: { fontSize: 14, color: "#666", lineHeight: 22 },
  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#F1EDFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#6C53A3" },
  sectionCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECE9F6",
  },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  metaBox: {
    flex: 1,
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    borderRadius: 10,
    padding: 10,
  },
  metaBoxFull: {
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  metaLabel: { fontSize: 12, color: "#888" },
  metaValue: { fontSize: 14, color: "#4A3B6B", fontWeight: "700", marginTop: 4 },
  areaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  areaChip: {
    backgroundColor: "#F1EDFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  areaChipText: { color: "#6B5B91", fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#4A3B6B", marginBottom: 10 },
  contactBtn: {
    marginTop: 14,
    backgroundColor: "#8F74D8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 8,
  },
  contactBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
