import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";

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

export default function ProviderProfileScreen() {
  const { providerId } = useLocalSearchParams();
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (providerId) fetchProviderDetails();
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setIsLoading(true);
      // Gọi API lấy thông tin thợ ảnh theo providerId
      const res = await axiosClient.get(`/providers/id/${providerId}`);
      if (res.data.code === 0) {
        setProvider(res.data.result);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin thợ ảnh:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* 4. Portfolio/Services Placeholder */}
        <View style={styles.tabSection}>
          <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
          <View style={styles.placeholderBox}>
            <Ionicons name="images-outline" size={40} color="#CCC" />
            <Text style={styles.placeholderText}>
              Thợ ảnh chưa đăng sản phẩm mẫu.
            </Text>
          </View>
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
