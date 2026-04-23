import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { providerService } from "@/src/services/providerService";
import { costumeService } from "@/src/services/costumeService";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 45) / 2;

export default function ProviderRentalShopScreen() {
  // 🚩 THAY ĐỔI: Nhận providerId từ trang chi tiết trang phục truyền sang
  const { providerId } = useLocalSearchParams();
  const [provider, setProvider] = useState<any>(null);
  const [costumes, setCostumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Chỉ fetch khi có providerId hợp lệ
    if (providerId && providerId !== "undefined") {
      fetchShopData();
    }
  }, [providerId]);

  const fetchShopData = async () => {
    setIsLoading(true);
    try {
      // 🚩 BƯỚC 1: Lấy thông tin Shop bằng providerId
      // Endpoint: /api/providers/id/{providerId}
      const shopRes = await providerService.getById(Number(providerId));

      if (shopRes.data.code === 0) {
        setProvider(shopRes.data.result);
      }

      // 🚩 BƯỚC 2: Lấy trang phục bằng providerId
      // Endpoint: /api/costumes/provider/{providerId}
      const costumeRes = await costumeService.getByProvider(Number(providerId));

      if (costumeRes.data.code === 0) {
        setCostumes(costumeRes.data.result);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu shop:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p || 0);

  if (isLoading)
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* THANH ĐIỀU HƯỚNG */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Gian hàng Cosplay</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* BANNER SHOP */}
      <View style={styles.shopCard}>
        {provider?.coverImageUrl && (
          <Image
            source={{ uri: provider.coverImageUrl }}
            style={styles.coverBg}
          />
        )}
        <View style={styles.profileInfo}>
          <View style={styles.avatarCircle}>
            {provider?.avatarUrl ? (
              <Image
                source={{ uri: provider.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <Ionicons name="storefront" size={35} color="#fff" />
            )}
          </View>
          <Text style={styles.shopNameText}>
            {provider?.shopName || "Tên Shop"}
          </Text>
          <Text style={styles.shopBioText} numberOfLines={2}>
            {provider?.bio ||
              "Chào mừng bạn đến với gian hàng của chúng tôi! ✨"}
          </Text>
        </View>

        <View style={styles.statContainer}>
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>{costumes.length}</Text>
            <Text style={styles.statDesc}>Sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>
              {provider?.totalRating > 0
                ? provider.totalRating.toFixed(1)
                : "5.0"}
            </Text>
            <Text style={styles.statDesc}>Đánh giá</Text>
          </View>
        </View>
      </View>

      {/* DANH SÁCH TRANG PHỤC */}
      <FlatList
        data={costumes}
        numColumns={2}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => {
          // Lấy ảnh đầu tiên trong mảng imageUrls hoặc dùng imageUrl làm dự phòng
          const coverImage =
            item.imageUrls && item.imageUrls.length > 0
              ? item.imageUrls[0]
              : item.imageUrl;

          return (
            <TouchableOpacity
              style={styles.costumeCard}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/costume-detail",
                  params: { id: item.id },
                } as any)
              }
            >
              <Image
                source={{
                  uri: coverImage || "https://via.placeholder.com/150",
                }}
                style={styles.costumeImg}
              />
              <View style={styles.costumeData}>
                <Text style={styles.costumeTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {/* Hiển thị giá theo ngày */}
                <Text style={styles.costumePriceText}>
                  {formatPrice(item.pricePerDay)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyLabel}>
            Shop chưa cập nhật trang phục nào. 😅
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
  },
  navTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  backBtn: { padding: 5 },
  shopCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 3,
    overflow: "hidden",
  },
  coverBg: { width: "100%", height: 120, position: "absolute" },
  profileInfo: { alignItems: "center", marginTop: 60, paddingHorizontal: 20 },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#B59DFF",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 35 },
  shopNameText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginTop: 10,
  },
  shopBioText: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 5,
  },
  statContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: 20,
    paddingVertical: 15,
  },
  statCell: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "bold", color: "#4A3B6B" },
  statDesc: { fontSize: 12, color: "#999", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0" },
  listPadding: { padding: 15 },
  listHeader: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 15,
  },
  costumeCard: {
    width: COLUMN_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    marginRight: 15,
    elevation: 2,
    overflow: "hidden",
  },
  costumeImg: { width: "100%", height: 180 },
  costumeData: { padding: 10 },
  costumeTitle: { fontSize: 14, color: "#333", fontWeight: "600" },
  costumePriceText: {
    fontSize: 14,
    color: "#B59DFF",
    fontWeight: "bold",
    marginTop: 4,
  },
  emptyLabel: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontStyle: "italic",
  },
});
