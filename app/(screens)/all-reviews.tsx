import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "../api/axiosClient";

const STAR_FILTERS = [
  { key: null, label: "Tất cả" },
  { key: 5, label: "5 sao" },
  { key: 4, label: "4 sao" },
  { key: 3, label: "3 sao" },
  { key: 2, label: "2 sao" },
  { key: 1, label: "1 sao" },
];

const IMAGE_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "with", label: "Có ảnh" },
  { key: "without", label: "Không ảnh" },
];

export default function CostumeReviewsScreen() {
  const { costumeId, costumeName } = useLocalSearchParams();

  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [imageFilter, setImageFilter] = useState<"all" | "with" | "without">("all");

  useEffect(() => {
    fetchReviews();
  }, [costumeId]);

  useEffect(() => {
    applyFilters();
  }, [allReviews, selectedStar, imageFilter]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(`/reviews/costume/${costumeId}`);
      if (res.data.code === 0) {
        const reviews = res.data.result || [];
        // Sắp xếp mới nhất trước
        const sorted = [...reviews].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setAllReviews(sorted);
      }
    } catch (err) {
      console.error("Lỗi fetch reviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allReviews;
    if (selectedStar !== null) {
      filtered = filtered.filter((r) => r.rating === selectedStar);
    }
    if (imageFilter === "with") {
      filtered = filtered.filter((r) => r.images && r.images.length > 0);
    } else if (imageFilter === "without") {
      filtered = filtered.filter(
        (r) => !r.images || r.images.length === 0,
      );
    }
    setFilteredReviews(filtered);
  };

  const avgRating =
    allReviews.length > 0
      ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
      : "0.0";

  const renderStars = (rating: number, size = 14) => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={size}
          color="#FFD700"
        />
      ))}
    </View>
  );

  const renderReviewItem = ({ item }: { item: any }) => {
    const userName = item.userName || item.user?.fullName || "Người dùng";
    const avatarUrl = item.avatarUrl || item.user?.avatarUrl;

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={18} color="#B59DFF" />
            )}
          </View>
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>{userName}</Text>
            {renderStars(item.rating, 13)}
          </View>
          <Text style={styles.reviewDate}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString("vi-VN")
              : ""}
          </Text>
        </View>
        {item.comment && (
          <Text style={styles.reviewComment}>{item.comment}</Text>
        )}
        {item.images && item.images.length > 0 && (
          <FlatList
            data={item.images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(img, idx) => img.id?.toString() || idx.toString()}
            renderItem={({ item: img }: any) => (
              <Image
                source={{ uri: img.url || img.imageUrl }}
                style={styles.reviewImage}
              />
            )}
            style={{ marginTop: 10 }}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {costumeName ? `Đánh giá: ${costumeName}` : "Tất cả đánh giá"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* AVG RATING HEADER */}
      {allReviews.length > 0 && (
        <View style={styles.avgSection}>
          <View style={styles.avgLeft}>
            <Text style={styles.avgNumber}>{avgRating}</Text>
            {renderStars(
              Math.round(
                allReviews.reduce((s, r) => s + r.rating, 0) /
                  allReviews.length,
              ),
              18,
            )}
            <Text style={styles.avgCount}>
              {allReviews.length} đánh giá
            </Text>
          </View>
        </View>
      )}

      {/* FILTER CHIPS */}
      <View style={styles.filterSection}>
        {/* Lọc sao */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {STAR_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key === null ? "all" : f.key}
              style={[
                styles.chip,
                selectedStar === f.key && styles.chipActive,
              ]}
              onPress={() => setSelectedStar(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedStar === f.key && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.chipDivider} />
          {IMAGE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                imageFilter === f.key && styles.chipActive,
              ]}
              onPress={() => setImageFilter(f.key as any)}
            >
              <Text
                style={[
                  styles.chipText,
                  imageFilter === f.key && styles.chipTextActive,
                ]}
              >
                {f.key === "with" ? "📷" : f.key === "without" ? "📭" : ""}{" "}
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* REVIEWS LIST */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={50} color="#C4B9DF" />
              <Text style={styles.emptyText}>
                Không có đánh giá nào phù hợp.
              </Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={fetchReviews}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#4A3B6B" },
  avgSection: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avgLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avgNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginRight: 10,
  },
  avgCount: { fontSize: 13, color: "#888", marginLeft: 10 },
  filterSection: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  chipRow: { paddingHorizontal: 15, flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F4F5F7",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#F4F1FF", borderColor: "#B59DFF" },
  chipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  chipTextActive: { color: "#B59DFF", fontWeight: "bold" },
  chipDivider: { width: 1, height: 20, backgroundColor: "#E0E0E0", marginHorizontal: 6 },
  listContainer: { padding: 15, paddingBottom: 100 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#B59DFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 2 },
  reviewDate: { fontSize: 11, color: "#AAA" },
  reviewComment: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginTop: 4,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#F0F0F0",
  },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyText: { marginTop: 10, color: "#8E7AB5", fontSize: 15, fontStyle: "italic" },
});
