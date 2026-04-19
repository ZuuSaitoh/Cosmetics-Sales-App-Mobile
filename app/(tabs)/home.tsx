import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { costumeService } from "@/src/services/costumeService";
import { providerService } from "@/src/services/providerService";

interface Provider {
  id: number;
  userId: number;
  shopName: string;
  shopAddressId: number;
  avatarUrl: string;
  coverImageUrl: string;
  bio: string;
  socialAccount: string;
  bankName: string;
  verified: boolean;
  completedOrders: number;
  totalRating: number;
  totalReviews: number;
}

export default function UserHomeScreen() {
  const [costumes, setCostumes] = useState<any[]>([]);
  const [photographers, setPhotographers] = useState<Provider[]>([]);
  const [staffs, setStaffs] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDataSilentlyRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      fetchDataSilentlyRef.current();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [costumeRes, photoRes, staffRes] = await Promise.all([
        costumeService.getAll(),
        providerService.getByRole("PROVIDER_PHOTOGRAPH"),
        providerService.getByRole("PROVIDER_EVENT_STAFF"),
      ]);

      if (costumeRes.data.code === 0) setCostumes(costumeRes.data.result || []);
      if (photoRes.data.code === 0) setPhotographers(photoRes.data.result || []);
      if (staffRes.data.code === 0) setStaffs(staffRes.data.result || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  fetchDataSilentlyRef.current = fetchData;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    try {
      setIsLoading(true);
      const response = await costumeService.search({ keyword: searchQuery });
      if (response.data.code === 0) setCostumes(response.data.result || []);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraSearch = () => {
    router.push("/image-search" as any);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  const renderServiceItem = ({ item }: { item: Provider }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() =>
        router.push({
          pathname: "/(screens)/photographer" as any,
          params: { providerId: item.id },
        })
      }
    >
      <Image source={{ uri: item.coverImageUrl || item.avatarUrl || "https://via.placeholder.com/150" }} style={styles.serviceImage} />
      <View style={styles.serviceInfo}>
        <View style={styles.serviceNameRow}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.shopName}
          </Text>
          {item.verified && (
            <Ionicons name="checkmark-circle" size={14} color="#28A745" style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.serviceMeta}>{item.completedOrders} đơn hoàn thành</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>
            {item.totalRating > 0 ? item.totalRating.toFixed(1) : "Mới"}
            {item.totalReviews > 0 ? ` (${item.totalReviews})` : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // UI cho từng trang phục
  const renderCostumeItem = ({ item }: { item: any }) => {
    const coverImage = item.imageUrls?.[0] || "https://via.placeholder.com/200";
    const isAvailable = item.status !== "RENTED";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(screens)/costume-detail" as any,
            params: { id: item.id },
          })
        }
      >
        <Image source={{ uri: coverImage }} style={styles.cardImage} />
        <View style={[styles.badge, { backgroundColor: isAvailable ? "#28A745" : "#FF6B6B" }]}>
          <Text style={styles.badgeText}>{isAvailable ? "Sẵn sàng" : "Đang thuê"}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.priceText}>
            {formatPrice(item.pricePerDay)}
            <Text style={styles.perDay}>/ngày</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <View style={styles.homeHeader}>
        <Text style={styles.brandText}>CosMate</Text>
        <TouchableOpacity onPress={() => router.push("/profile" as any)} style={styles.avatarButton}>
          <Image
            source={{ uri: "https://via.placeholder.com/72x72.png?text=U" }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trang phục, nháy, staff..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleCameraSearch} style={styles.cameraButton} hitSlop={8}>
            <Ionicons name="camera" size={20} color="#B59DFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thợ ảnh nổi bật</Text>
        <TouchableOpacity onPress={() => router.push("/(screens)/all-photographers" as any)}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={photographers}
        renderItem={renderServiceItem}
        keyExtractor={(item) => "photo-" + item.id}
        contentContainerStyle={styles.horizontalList}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff sự kiện</Text>
        <TouchableOpacity onPress={() => router.push("/(screens)/all-event-staff" as any)}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={staffs}
        renderItem={renderServiceItem}
        keyExtractor={(item) => "staff-" + item.id}
        contentContainerStyle={styles.horizontalList}
      />

      <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
        <Text style={styles.sectionTitle}>Trang phục Cosplay</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={ListHeader}
          data={costumes}
          keyExtractor={(item) => "costume-" + item.id}
          renderItem={renderCostumeItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#B59DFF"]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  brandText: { fontSize: 22, fontWeight: "900", color: "#B59DFF" },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F4F5F7",
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  header: {
    backgroundColor: "#fff",
    padding: 15,
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
    paddingRight: 6,
  },
  searchIcon: { paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  cameraButton: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  seeAllText: { color: "#B59DFF", fontWeight: "600" },
  horizontalList: { paddingLeft: 15, paddingVertical: 15 },
  serviceCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginBottom: 5,
  },
  serviceImage: { width: "100%", height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  serviceInfo: { padding: 8 },
  serviceNameRow: { flexDirection: "row", alignItems: "center" },
  serviceName: { fontSize: 13, fontWeight: "600", color: "#333", flex: 1 },
  serviceMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 3 },
  ratingText: { fontSize: 11, color: "#666" },
  servicePrice: { fontSize: 13, color: "#B59DFF", fontWeight: "bold", marginTop: 4 },
  listContainer: { paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 10, marginBottom: 15 },
  card: { width: "48%", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", elevation: 2 },
  cardImage: { width: "100%", height: 180 },
  badge: { position: "absolute", top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#333", height: 38 },
  priceText: { fontSize: 15, fontWeight: "bold", color: "#B59DFF" },
  perDay: { fontSize: 11, color: "#888", fontWeight: "normal" },
});
