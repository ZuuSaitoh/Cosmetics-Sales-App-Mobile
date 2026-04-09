import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";

export default function UserHomeScreen() {
  const [costumes, setCostumes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // GỌI API LẤY TẤT CẢ TRANG PHỤC KHI VỪA MỞ APP
  useEffect(() => {
    fetchCostumes();
  }, []);

  const fetchCostumes = async () => {
    try {
      setIsLoading(true);
      // Gọi API /api/costumes (Lấy danh sách tất cả đồ Cosplay)
      const response = await axiosClient.get("/costumes");

      if (response.data.code === 0) {
        setCostumes(response.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách trang phục:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // HÀM TÌM KIẾM THEO TỪ KHÓA
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchCostumes(); // Nếu ô tìm kiếm trống thì gọi lại danh sách gốc
      return;
    }

    try {
      setIsLoading(true);
      // Gọi API /api/costumes/search?keyword=...
      const response = await axiosClient.get(`/costumes/search`, {
        params: { keyword: searchQuery },
      });

      if (response.data.code === 0) {
        setCostumes(response.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCostumes();
  };

  // HÀM FORMAT TIỀN TỆ VNĐ
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  // UI CHO TỪNG Ô SẢN PHẨM (DẠNG LƯỚI - GRID)
  const renderItem = ({ item }: { item: any }) => {
    // 1. LẤY ẢNH TỪ MẢNG imageUrls (Lấy tấm đầu tiên)
    const coverImage =
      item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls[0]
        : "https://via.placeholder.com/200"; // Ảnh mặc định nếu lỡ shop quên up ảnh

    // 2. STATUS TÌNH TRẠNG
    const isAvailable = item.status !== "RENTED"; // Nếu không phải RENTED thì coi như Sẵn sàng

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        // Khi bấm vào thì nhảy sang màn hình Chi tiết sản phẩm
        onPress={() =>
          router.push({
            pathname: "/(screens)/costume-detail" as any,
            params: { id: item.id },
          })
        }
      >
        {/* Ảnh Sản Phẩm */}
        <Image
          source={{ uri: coverImage }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Badge Tình Trạng */}
        {isAvailable ? (
          <View style={[styles.badge, { backgroundColor: "#28A745" }]}>
            <Text style={styles.badgeText}>Sẵn sàng</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: "#FF6B6B" }]}>
            <Text style={styles.badgeText}>Đang thuê</Text>
          </View>
        )}

        {/* Thông tin sản phẩm */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name || "Tên trang phục"}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {formatPrice(item.pricePerDay)}
              <Text style={styles.perDay}>/ngày</Text>
            </Text>
          </View>

          {/* Thông tin Shop & Đánh giá */}
          <View style={styles.footerRow}>
            <View style={styles.shopInfo}>
              <Ionicons name="storefront-outline" size={12} color="#888" />
              <Text style={styles.shopName} numberOfLines={1}>
                Cửa hàng ID: {item.providerId}
              </Text>
            </View>
            <View style={styles.ratingInfo}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>5.0</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER & THANH TÌM KIẾM */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trang phục, nhân vật..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch} // Chạy tìm kiếm khi bấm Enter/Search trên bàn phím
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                fetchCostumes();
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#ccc"
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* DANH SÁCH SẢN PHẨM */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={costumes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2} // Chia làm 2 cột giống Shopee
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#B59DFF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={60} color="#D1C4E9" />
              <Text style={styles.emptyText}>Chưa có trang phục nào!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header Search
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: { paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: "#333" },

  // Grid List
  listContainer: { padding: 10, paddingBottom: 20 },
  row: { justifyContent: "space-between", marginBottom: 15 },

  // Card Sản phẩm
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    position: "relative",
  },
  cardImage: { width: "100%", height: 180, backgroundColor: "#E0D7FF" },

  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  cardInfo: { padding: 10 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    height: 38,
  }, // Height cố định để tên 1 hay 2 dòng thẻ vẫn đều

  priceRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  priceText: { fontSize: 15, fontWeight: "bold", color: "#B59DFF" },
  perDay: { fontSize: 11, color: "#888", fontWeight: "normal" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 8,
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 5,
  },
  shopName: { fontSize: 11, color: "#666", marginLeft: 4 },
  ratingInfo: { flexDirection: "row", alignItems: "center" },
  ratingText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 2,
    fontWeight: "bold",
  },

  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: "#A0A0A0" },
});
