import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
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

type CostumeRow = {
  id: number;
  name?: string;
  pricePerDay?: number;
  status?: string;
  size?: string;
  city?: string;
  district?: string;
  province?: string;
  address?: string;
  location?: string;
  pickupAddress?: string;
  imageUrls?: string[];
  provider?: Record<string, unknown>;
  [key: string]: unknown;
};

type PriceFilterKey = "all" | "lt200k" | "200k-500k" | "500k-1m" | "gt1m";
type StatusFilterKey = "all" | "available" | "rented";

const PRICE_FILTER_OPTIONS: { key: PriceFilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "lt200k", label: "< 200k" },
  { key: "200k-500k", label: "200k–500k" },
  { key: "500k-1m", label: "500k–1tr" },
  { key: "gt1m", label: "> 1tr" },
];

function isCostumeAvailable(item: CostumeRow) {
  return item.status !== "RENTED";
}

function costumeMatchesPrice(item: CostumeRow, key: PriceFilterKey) {
  const p = Number(item.pricePerDay) || 0;
  switch (key) {
    case "all":
      return true;
    case "lt200k":
      return p < 200_000;
    case "200k-500k":
      return p >= 200_000 && p < 500_000;
    case "500k-1m":
      return p >= 500_000 && p < 1_000_000;
    case "gt1m":
      return p >= 1_000_000;
    default:
      return true;
  }
}

function costumeLocationText(item: CostumeRow) {
  const prov = item.provider;
  const fromProvider: string[] = [];
  if (prov && typeof prov === "object") {
    const p = prov as Record<string, unknown>;
    for (const k of ["city", "district", "province", "address", "shopAddress", "location"] as const) {
      const v = p[k];
      if (typeof v === "string" && v.trim()) fromProvider.push(v);
    }
  }
  const parts = [
    ...fromProvider,
    item.city,
    item.district,
    item.province,
    item.address,
    item.location,
    item.pickupAddress,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return parts.join(" ").toLowerCase();
}

function normalizeSizeLabel(size: string | undefined) {
  const s = (size ?? "").trim();
  return s.length ? s : "Freesize";
}

export default function UserHomeScreen() {
  const [costumeCatalog, setCostumeCatalog] = useState<CostumeRow[]>([]);
  const [photographers, setPhotographers] = useState<Provider[]>([]);
  const [staffs, setStaffs] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilterKey>("all");
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [locationQuery, setLocationQuery] = useState("");
  const [costumeFiltersVisible, setCostumeFiltersVisible] = useState(false);

  const fetchDataSilentlyRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      fetchDataSilentlyRef.current();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(false);
  }, []);

  const fetchData = async (showFullScreenLoading = false) => {
    try {
      if (showFullScreenLoading) {
        setIsLoading(true);
      }
      const [costumeRes, photoRes, staffRes] = await Promise.all([
        costumeService.getAll(),
        providerService.getByRole("PROVIDER_PHOTOGRAPH"),
        providerService.getByRole("PROVIDER_EVENT_STAFF"),
      ]);

      if (costumeRes.data.code === 0) {
        setCostumeCatalog((costumeRes.data.result || []) as CostumeRow[]);
      }
      if (photoRes.data.code === 0) setPhotographers(photoRes.data.result || []);
      if (staffRes.data.code === 0) setStaffs(staffRes.data.result || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      if (showFullScreenLoading) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  };

  fetchDataSilentlyRef.current = fetchData;

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    try {
      setIsLoading(true);
      const response = await costumeService.search({ keyword: searchQuery });
      if (response.data.code === 0) {
        setCostumeCatalog((response.data.result || []) as CostumeRow[]);
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraSearch = () => {
    router.push("/ai/image-search" as any);
  };

  const resetCostumeFilters = useCallback(() => {
    setPriceFilter("all");
    setSizeFilter(null);
    setStatusFilter("all");
    setLocationQuery("");
  }, []);

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of costumeCatalog) {
      set.add(normalizeSizeLabel(typeof c.size === "string" ? c.size : undefined));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [costumeCatalog]);

  const filteredCostumes = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    return costumeCatalog.filter((item) => {
      if (!costumeMatchesPrice(item, priceFilter)) return false;
      if (sizeFilter != null) {
        const itemSize = normalizeSizeLabel(typeof item.size === "string" ? item.size : undefined);
        if (itemSize.toLowerCase() !== sizeFilter.toLowerCase()) return false;
      }
      if (statusFilter === "available" && !isCostumeAvailable(item)) return false;
      if (statusFilter === "rented" && isCostumeAvailable(item)) return false;
      if (q.length > 0 && !costumeLocationText(item).includes(q)) return false;
      return true;
    });
  }, [costumeCatalog, priceFilter, sizeFilter, statusFilter, locationQuery]);

  const hasActiveCostumeFilters = useMemo(() => {
    return (
      priceFilter !== "all" ||
      sizeFilter != null ||
      statusFilter !== "all" ||
      locationQuery.trim().length > 0
    );
  }, [priceFilter, sizeFilter, statusFilter, locationQuery]);

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
  const renderCostumeItem = ({ item }: { item: CostumeRow }) => {
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
        <View style={styles.searchRow}>
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
          </View>
          <TouchableOpacity
            style={[
              styles.searchSideButton,
              costumeFiltersVisible && styles.searchSideButtonActive,
            ]}
            onPress={() => setCostumeFiltersVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mở bộ lọc trang phục"
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={costumeFiltersVisible || hasActiveCostumeFilters ? "#B59DFF" : "#666"}
            />
            {hasActiveCostumeFilters ? <View style={styles.filterActiveDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCameraSearch} style={styles.searchSideButton} hitSlop={8}>
            <Ionicons name="camera" size={20} color="#B59DFF" />
          </TouchableOpacity>
        </View>

        {costumeFiltersVisible ? (
        <View style={styles.filterSection}>
          <View style={styles.filterSectionTitleRow}>
            <Text style={styles.filterSectionTitle}>Lọc trang phục</Text>
            <TouchableOpacity onPress={resetCostumeFilters} hitSlop={10}>
              <Text style={styles.filterResetText}>Đặt lại</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Giá / ngày</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {PRICE_FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, priceFilter === opt.key && styles.filterChipActive]}
                onPress={() => setPriceFilter(opt.key)}
              >
                <Text style={[styles.filterChipText, priceFilter === opt.key && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Size</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, sizeFilter === null && styles.filterChipActive]}
              onPress={() => setSizeFilter(null)}
            >
              <Text style={[styles.filterChipText, sizeFilter === null && styles.filterChipTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            {sizeOptions.map((sz) => (
              <TouchableOpacity
                key={sz}
                style={[styles.filterChip, sizeFilter === sz && styles.filterChipActive]}
                onPress={() => setSizeFilter(sz)}
              >
                <Text style={[styles.filterChipText, sizeFilter === sz && styles.filterChipTextActive]}>{sz}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Tình trạng</Text>
          <View style={styles.filterChipsRowStatic}>
            {(
              [
                { key: "all" as const, label: "Tất cả" },
                { key: "available" as const, label: "Sẵn sàng" },
                { key: "rented" as const, label: "Đang thuê" },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, statusFilter === opt.key && styles.filterChipActive]}
                onPress={() => setStatusFilter(opt.key)}
              >
                <Text style={[styles.filterChipText, statusFilter === opt.key && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Vị trí</Text>
          <View style={styles.locationInputWrap}>
            <Ionicons name="location-outline" size={18} color="#888" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="Tỉnh/thành, quận, địa chỉ..."
              placeholderTextColor="#aaa"
              value={locationQuery}
              onChangeText={setLocationQuery}
              returnKeyType="done"
            />
          </View>
        </View>
        ) : null}
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
          data={filteredCostumes}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingRight: 10,
    minWidth: 0,
  },
  searchIcon: { paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  searchSideButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchSideButtonActive: {
    backgroundColor: "#EDE8FF",
    borderColor: "#B59DFF",
  },
  filterActiveDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B59DFF",
    borderWidth: 1,
    borderColor: "#fff",
  },
  filterSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  filterSectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterSectionTitle: { fontSize: 14, fontWeight: "700", color: "#4A3B6B" },
  filterResetText: { fontSize: 13, color: "#B59DFF", fontWeight: "600" },
  filterLabel: { fontSize: 12, color: "#888", marginBottom: 8, marginTop: 4 },
  filterChipsRow: { flexDirection: "row", alignItems: "center", paddingBottom: 4, gap: 8 },
  filterChipsRowStatic: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  filterChipActive: {
    backgroundColor: "#EDE8FF",
    borderColor: "#B59DFF",
  },
  filterChipText: { fontSize: 13, color: "#555", fontWeight: "500" },
  filterChipTextActive: { color: "#4A3B6B", fontWeight: "700" },
  locationInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  locationIcon: { marginRight: 4 },
  locationInput: { flex: 1, height: 40, fontSize: 14, color: "#333" },
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
