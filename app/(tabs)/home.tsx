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

// 🚩 1. Định nghĩa Interface để tránh lỗi 'never'
interface Service {
  id: number;
  serviceType: string;
  description: string;
  pricePerSlot: number;
  imageUrls: string[];
}

export default function UserHomeScreen() {
  const [costumes, setCostumes] = useState<any[]>([]);
  const [photographers, setPhotographers] = useState<Service[]>([]); // 🚩 State thợ ảnh
  const [staffs, setStaffs] = useState<Service[]>([]); // 🚩 State staff
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // 🚩 2. Cập nhật hàm lấy dữ liệu để lấy cả dịch vụ
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Gọi song song để tối ưu tốc độ
      const [costumeRes, photoRes, staffRes] = await Promise.all([
        axiosClient.get("/costumes"),
        axiosClient.get("/services/type/PHOTOGRAPHER"),
        axiosClient.get("/services/type/EVENT_STAFF"),
      ]);

      if (costumeRes.data.code === 0) setCostumes(costumeRes.data.result || []);
      if (photoRes.data.code === 0)
        setPhotographers(photoRes.data.result || []);
      if (staffRes.data.code === 0) setStaffs(staffRes.data.result || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    try {
      setIsLoading(true);
      const response = await axiosClient.get(`/costumes/search`, {
        params: { keyword: searchQuery },
      });
      if (response.data.code === 0) setCostumes(response.data.result || []);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  // 🚩 3. UI cho từng ô Dịch vụ (Photographer/Staff)
  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() =>
        router.push({
          pathname: "/(screens)/service-detail" as any,
          params: { id: item.id },
        })
      }
    >
      <Image
        source={{
          uri: item.imageUrls?.[0] || "https://via.placeholder.com/150",
        }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={styles.servicePrice}>
          {formatPrice(item.pricePerSlot)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // UI cho từng trang phục (Giữ nguyên của sếp)
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
        <View
          style={[
            styles.badge,
            { backgroundColor: isAvailable ? "#28A745" : "#FF6B6B" },
          ]}
        >
          <Text style={styles.badgeText}>
            {isAvailable ? "Sẵn sàng" : "Đang thuê"}
          </Text>
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

  // 🚩 4. PHẦN HEADER CHỨA CÁC MỤC MỚI
  const ListHeader = () => (
    <View>
      {/* Photographer Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thợ ảnh nổi bật</Text>
        <TouchableOpacity
          onPress={() =>
            router.push("/(provider-service-tabs)/photographer" as any)
          }
        >
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

      {/* Staff Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff sự kiện</Text>
        <TouchableOpacity
          onPress={() =>
            router.push("/(provider-service-tabs)/event-staff" as any)
          }
        >
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

      {/* Tiêu đề cho phần Trang phục bên dưới */}
      <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
        <Text style={styles.sectionTitle}>Trang phục Cosplay</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* SEARCH BAR (Giữ cố định ở trên) */}
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
            placeholder="Tìm kiếm trang phục, nháy, staff..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={ListHeader} // 🚩 Đưa Photographer & Staff vào đây
          data={costumes}
          keyExtractor={(item) => "costume-" + item.id}
          renderItem={renderCostumeItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchData}
              colors={["#B59DFF"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  },
  searchIcon: { paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },

  // Section Styles
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

  // Service Card (Horizontal)
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
  serviceImage: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  serviceInfo: { padding: 8 },
  serviceName: { fontSize: 13, fontWeight: "600", color: "#333" },
  servicePrice: {
    fontSize: 13,
    color: "#B59DFF",
    fontWeight: "bold",
    marginTop: 4,
  },

  // Costume Card (Grid)
  listContainer: { paddingBottom: 20 },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
  },
  cardImage: { width: "100%", height: 180 },
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
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#333", height: 38 },
  priceText: { fontSize: 15, fontWeight: "bold", color: "#B59DFF" },
  perDay: { fontSize: 11, color: "#888", fontWeight: "normal" },
});
