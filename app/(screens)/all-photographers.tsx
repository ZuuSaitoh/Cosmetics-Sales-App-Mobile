import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";

// Định nghĩa Interface cho Provider
interface Provider {
  id: number;
  shopName: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  verified: boolean;
  completedOrders: number;
  totalRating: number;
  totalReviews: number;
  bio: string | null;
}

export default function AllPhotographersScreen() {
  const [list, setList] = useState<Provider[]>([]); // 🚩 Fix lỗi 'never' ở đây
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPhotographers();
  }, []);

  const fetchPhotographers = async () => {
    try {
      setIsLoading(true);
      // Gọi API lấy danh sách thợ ảnh
      const res = await axiosClient.get("/providers/role/PROVIDER_PHOTOGRAPH");
      if (res.data.code === 0) {
        setList(res.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách thợ ảnh:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Provider }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/(screens)/photographer" as any,
          params: { providerId: item.id },
        })
      }
    >
      {/* Ảnh bìa - Xử lý trường hợp null */}
      <Image
        source={{
          uri:
            item.coverImageUrl ||
            item.avatarUrl ||
            "https://via.placeholder.com/350x150",
        }}
        style={styles.coverImage}
      />

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          {/* Xử lý shopName bị null */}
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shopName || `Thợ ảnh #${item.id}`}
          </Text>
          {item.verified && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#28A745"
              style={{ marginLeft: 5 }}
            />
          )}
        </View>

        {/* Bio ngắn gọn */}
        <Text style={styles.bioText} numberOfLines={1}>
          {item.bio || "Chưa có giới thiệu về thợ ảnh này."}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.statText}>
              {item.totalRating > 0 ? item.totalRating.toFixed(1) : "Mới"}
              {item.totalReviews > 0 ? ` (${item.totalReviews})` : ""}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="cart-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.completedOrders} đơn</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header có nút Back */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả thợ ảnh</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Hiện chưa có thợ ảnh nào khả dụng.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 2,
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginLeft: 15,
  },
  loadingArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  coverImage: { width: "100%", height: 120, backgroundColor: "#E0D7FF" },
  infoContainer: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  shopName: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1 },
  bioText: { fontSize: 13, color: "#666", marginVertical: 4 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: "#555" },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: "#DDD",
    marginHorizontal: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
    fontStyle: "italic",
  },
});
