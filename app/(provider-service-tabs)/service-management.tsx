import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const SERVICE_TYPES = [
  { key: "ALL", label: "Tất cả" },
  { key: "PHOTOGRAPHER", label: "Thợ ảnh" },
  { key: "EVENT_STAFF", label: "Staff sự kiện" },
];

export default function ServiceManagementScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        setIsLoading(false);
        return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const providerRes = await axiosClient.get(`/providers/user/${userId}`);
      if (providerRes.data.code !== 0 || !providerRes.data.result) {
        Alert.alert("Thông báo", "Bạn chưa thiết lập hồ sơ nhà cung cấp!");
        setIsLoading(false);
        return;
      }

      const myProvider = providerRes.data.result;
      setProviderInfo(myProvider);

      const servicesRes = await axiosClient.get(`/services/provider/${myProvider.id}`);
      if (servicesRes.data.code === 0) {
        setServices(servicesRes.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi fetchData:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu dịch vụ.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  const filteredServices = services.filter((s: any) => {
    if (selectedType === "ALL") return true;
    return s.serviceType === selectedType;
  });

  const renderServiceItem = ({ item }: { item: any }) => {
    const coverImage =
      item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls[0]
        : "https://via.placeholder.com/200x200.png?text=No+Image";

    const typeLabel =
      item.serviceType === "PHOTOGRAPHER" ? "Thợ ảnh" : "Staff sự kiện";
    const typeColor = item.serviceType === "PHOTOGRAPHER" ? "#B59DFF" : "#FF9900";

    return (
      <View style={styles.card}>
        <Image source={{ uri: coverImage }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.serviceName}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + "22" }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {typeLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || "Chưa có mô tả"}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{formatPrice(item.pricePerSlot)}</Text>
            <Text style={styles.priceUnit}>/{item.slotDurationHours}h</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.statusBadge}>
              <Text
                style={[
                  styles.statusText,
                  { color: item.status === "AVAILABLE" ? "#28A745" : "#FF9900" },
                ]}
              >
                {item.status === "AVAILABLE" ? "Đang hoạt động" : item.status}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() =>
                item.serviceType === "PHOTOGRAPHER"
                  ? null // placeholder for photographer-edit
                  : null
              }
            >
              <Text style={styles.btnEditText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri:
                providerInfo?.avatarUrl ||
                "https://via.placeholder.com/100",
            }}
            style={styles.shopAvatar}
          />
          <View>
            <Text style={styles.title}>
              {providerInfo?.name || "Dịch vụ của tôi"}
            </Text>
            <Text style={styles.providerIdText}>
              Provider ID: {providerInfo?.id}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.btnAdd}
          onPress={() => Alert.alert("Thông báo", "Chức năng thêm dịch vụ sắp ra mắt!")}
        >
          <Text style={styles.btnAddText}>+ Thêm dịch vụ</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {SERVICE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.filterChip,
                selectedType === type.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(type.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === type.key && styles.filterChipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* SERVICE LIST */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderServiceItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={50} color="#C4B9DF" />
            <Text style={styles.emptyText}>
              {selectedType === "ALL"
                ? "Bạn chưa đăng dịch vụ nào."
                : "Không có dịch vụ loại này."}
            </Text>
          </View>
        }
        refreshing={isLoading}
        onRefresh={fetchData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  shopAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#F4F1FF",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#4A3B6B" },
  providerIdText: { fontSize: 12, color: "#8E7AB5", marginTop: 2 },
  btnAdd: {
    backgroundColor: "#B59DFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  btnAddText: { color: "#fff", fontWeight: "bold" },
  filterWrapper: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterContainer: { paddingHorizontal: 15 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F5F7",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: { backgroundColor: "#F4F1FF", borderColor: "#B59DFF" },
  filterChipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  filterChipTextActive: { color: "#B59DFF", fontWeight: "bold" },
  listContainer: { padding: 15, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    shadowColor: "#B59DFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: { width: 100, height: 130, borderRadius: 10, marginRight: 15 },
  cardInfo: { flex: 1, justifyContent: "space-between" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  cardDesc: { fontSize: 13, color: "#666", marginBottom: 8 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  priceValue: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  priceUnit: { fontSize: 12, color: "#888", marginLeft: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  btnEdit: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    backgroundColor: "#fff",
  },
  btnEditText: { color: "#4A3B6B", fontSize: 12, fontWeight: "700" },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#8E7AB5", fontSize: 15, fontStyle: "italic" },
});