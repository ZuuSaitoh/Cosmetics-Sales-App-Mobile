import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "../../api/axiosClient";

const { width } = Dimensions.get("window");

export default function CostumeDetailScreen() {
  const { id } = useLocalSearchParams();
  const [costume, setCostume] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [provider, setProvider] = useState<any>(null); // State lưu thông tin shop
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState<number | null>(null);
  const [isProcessingWishlist, setIsProcessingWishlist] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (id) fetchCostumeDetail();
  }, [id]);

  useEffect(() => {
    if (id) checkWishlistStatus();
    if (id) fetchReviews(Number(id));
  }, [id]);

  const checkWishlistStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      // Lấy danh sách yêu thích của user
      const res = await axiosClient.get(`/users/${userId}/wishlist`);
      if (res.data.code === 0) {
        // Tìm xem trang phục hiện tại (id) có trong danh sách không
        const item = res.data.result.find(
          (w: any) => w.costume.id === Number(id),
        );
        if (item) {
          setIsWishlisted(true);
          setWishlistId(item.id);
        }
      }
    } catch (error) {
      console.error("Lỗi check wishlist:", error);
    }
  };

  const toggleWishlist = async () => {
    if (isProcessingWishlist) return;
    setIsProcessingWishlist(true);

    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.push("/(auth)/login");
        return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      if (isWishlisted && wishlistId) {
        // 🚩 DELETE: Bỏ yêu thích
        const res = await axiosClient.delete(
          `/users/${userId}/wishlist/${wishlistId}`,
        );
        if (res.data.code === 0) {
          setIsWishlisted(false);
          setWishlistId(null);
        }
      } else {
        // 🚩 POST: Thêm vào yêu thích
        // Truyền costumeId vào body theo đúng yêu cầu API của bạn
        const res = await axiosClient.post(`/users/${userId}/wishlist`, {
          costumeId: Number(id),
        });
        if (res.data.code === 0) {
          setIsWishlisted(true);
          setWishlistId(res.data.result.id);
        }
      }
    } catch (error) {
      console.error("Lỗi toggle wishlist:", error);
    } finally {
      setIsProcessingWishlist(false);
    }
  };

  const fetchCostumeDetail = async () => {
    try {
      if (!costume) setIsLoading(true);

      const response = await axiosClient.get(`/costumes/${id}`);

      if (response.data.code === 0) {
        const costumeData = response.data.result;
        setCostume(costumeData);

        if (costumeData.providerId) {
          const shopRes = await axiosClient.get(
            `/providers/id/${costumeData.providerId}`,
          );

          if (shopRes.data.code === 0) {
            setProvider(shopRes.data.result);
          }
        }

        // Lấy danh sách đánh giá của trang phục này
        fetchReviews(costumeData.id);
      }
    } catch (error) {
      console.error("Lỗi tải thông tin chi tiết:", error);
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

  const fetchReviews = async (costumeId: number) => {
    try {
      const res = await axiosClient.get(`/reviews/costume/${costumeId}`);
      console.log(
        "[CostumeDetail] Reviews API response:",
        JSON.stringify(res.data),
      );
      if (res.data.code === 0 && Array.isArray(res.data.result)) {
        setReviews(res.data.result);
      }
    } catch (err) {
      console.error("Lỗi lấy đánh giá:", err);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={14}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: any }) => {
    const avatarUrl = item.avatarUrl || item.user?.avatarUrl;
    const userName = item.userName || item.user?.fullName || "Người dùng";

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
            {renderStars(item.rating || 0)}
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
            keyExtractor={(img: any) =>
              img.id?.toString() || Math.random().toString()
            }
            renderItem={({ item: img }: any) => (
              <Image
                source={{ uri: img.url || img }}
                style={styles.reviewImage}
              />
            )}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
    );
  };

  const renderAverageRating = () => {
    if (reviews.length === 0) return null;
    const avg =
      reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    return (
      <View style={styles.avgRatingRow}>
        <View style={styles.avgRatingLeft}>
          <Text style={styles.avgRatingNumber}>{avg.toFixed(1)}</Text>
          {renderStars(Math.round(avg))}
          <Text style={styles.reviewCount}>{reviews.length} đánh giá</Text>
        </View>
      </View>
    );
  };

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveImageIndex(Math.round(index));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!costume) return null;

  const images =
    costume.imageUrls && costume.imageUrls.length > 0
      ? costume.imageUrls
      : ["https://via.placeholder.com/400"];

  return (
    <SafeAreaView style={styles.container}>
      {/* NÚT BACK NỔI */}
      <View style={styles.headerFloating}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        {/* NÚT TRÁI TIM MỚI */}
        <TouchableOpacity
          style={[styles.backBtn, styles.wishlistBtn]}
          onPress={toggleWishlist}
          disabled={isProcessingWishlist}
        >
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={24}
            color={isWishlisted ? "#FF5252" : "#333"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* SLIDER ẢNH */}
        <View style={styles.imageSliderContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.mainImage}
                resizeMode="cover"
              />
            )}
          />
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeImageIndex === index ? styles.activeDot : null,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* THÔNG TIN CƠ BẢN */}
        <View style={styles.section}>
          <Text style={styles.costumeName}>{costume.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {formatPrice(costume.pricePerDay)}
              <Text style={styles.perDay}>/ngày</Text>
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    costume.status === "AVAILABLE" ? "#E8F5E9" : "#FFEBEE",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      costume.status === "AVAILABLE" ? "#28A745" : "#DC3545",
                  },
                ]}
              >
                {costume.status === "AVAILABLE" ? "Sẵn sàng" : "Đang thuê"}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION THÔNG TIN SHOP */}
        <View style={styles.shopSection}>
          <View style={styles.shopInfoLeft}>
            <View style={styles.shopAvatar}>
              {provider?.avatarUrl ? (
                <Image
                  source={{ uri: provider.avatarUrl }}
                  style={styles.avatarImg}
                />
              ) : (
                <Ionicons name="storefront" size={24} color="#B59DFF" />
              )}
            </View>
            <View>
              <Text style={styles.shopName}>
                {provider?.shopName || "Đang tải..."}
              </Text>
              <Text style={styles.shopSubtitle}>
                Người đăng: ID {costume.providerId || "N/A"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (costume?.providerId) {
                router.push({
                  pathname: "/(screens)/(order)/provider-rental-shop" as any,
                  params: { providerId: costume.providerId }, // Chuyển sang dùng providerId
                });
              }
            }}
          >
            <Text>Xem Shop</Text>
          </TouchableOpacity>
        </View>

        {/* --- PHẦN 1: THÔNG SỐ KỸ THUẬT --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color="#B59DFF" />
            <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
          </View>

          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Kích cỡ (Size)</Text>
              <Text style={styles.specValue}>{costume.size || "Freesize"}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Số lượng món</Text>
              <Text style={styles.specValue}>
                {costume.numberOfItems || 0} món
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Tiền cọc</Text>
              <Text style={[styles.specValue, { color: "#FF9900" }]}>
                {formatPrice(costume.depositAmount)}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Mục đích</Text>
              <Text style={styles.specValue}>
                {costume.rentPurpose || "Cosplay"}
              </Text>
            </View>
          </View>
        </View>

        {/* --- PHẦN 2: MÔ TẢ CHI TIẾT --- */}
        <View style={[styles.section, { borderBottomWidth: 0 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#B59DFF" />
            <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          </View>
          <Text style={styles.descriptionText}>
            {costume.description ||
              "Hiện chưa có mô tả chi tiết cho trang phục này."}
          </Text>
        </View>

        {/* --- PHẦN 3: ĐÁNH GIÁ --- */}
        <View style={[styles.section, { borderBottomWidth: 0 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color="#B59DFF" />
            <Text style={styles.sectionTitle}>Đánh giá</Text>
            <Text style={styles.reviewCountBadge}>
              {reviews.length} đánh giá
            </Text>
          </View>

          {renderAverageRating()}

          {reviews.length === 0 ? (
            <Text style={styles.noReviewText}>
              Chưa có đánh giá nào cho trang phục này.
            </Text>
          ) : (
            <View>
              {/* Hiển thị 1 đánh giá mới nhất */}
              {renderReviewItem({ item: reviews[0] })}
              {/* Nút Xem thêm */}
              {reviews.length > 1 && (
                <TouchableOpacity
                  style={styles.viewMoreBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(screens)/(review)/all-reviews" as any,
                      params: {
                        costumeId: costume.id,
                        costumeName: costume.name,
                      },
                    })
                  }
                >
                  <Text style={styles.viewMoreBtnText}>
                    Xem toàn bộ {reviews.length} đánh giá
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#B59DFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() =>
            router.push({
              pathname: "/(screens)/chat-detail" as any,
              params: {
                partnerId: costume.providerId,
                partnerName: costume.shopName || "Cửa hàng Cosplay",
              },
            })
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color="#B59DFF"
          />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.rentButton,
            costume.status !== "AVAILABLE" && { backgroundColor: "#ccc" },
          ]}
          disabled={costume.status !== "AVAILABLE"}
          onPress={() => {
            // THAY CÁI alert BẰNG LỆNH NÀY:
            router.push({
              pathname: "/(screens)/(order)/booking" as any,
              params: {
                id: costume.id, // Truyền ID sang để trang Booking gọi API lấy lại data
              },
            });
          }}
        >
          <Text style={styles.rentButtonText}>
            {costume.status === "AVAILABLE" ? "Thuê Ngay" : "Đã Thuê"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerFloating: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 15,
    right: 15,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  imageSliderContainer: {
    width: width,
    height: width,
    backgroundColor: "#F0F0F0",
  },
  mainImage: { width: width, height: width },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 3,
  },
  activeDot: { backgroundColor: "#B59DFF", width: 15 },
  section: { padding: 20, borderBottomWidth: 8, borderBottomColor: "#F8F9FB" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  costumeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceText: { fontSize: 24, fontWeight: "bold", color: "#B59DFF" },
  perDay: { fontSize: 14, color: "#888", fontWeight: "normal" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "bold" },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F9F9FF",
    borderRadius: 12,
    padding: 10,
  },
  specItem: { width: "50%", padding: 10 },
  specLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  specValue: { fontSize: 14, fontWeight: "600", color: "#444" },
  descriptionText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 24,
    textAlign: "justify",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  chatButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#EEE",
  },
  chatText: { fontSize: 11, color: "#B59DFF", marginTop: 2, fontWeight: "600" },
  rentButton: {
    flex: 3,
    backgroundColor: "#B59DFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  rentButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  // Bổ sung vào styles
  shopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    // Đổ bóng nhẹ cho sang bạn nhé
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shopInfoLeft: { flexDirection: "row", alignItems: "center" },
  shopAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  shopName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  shopSubtitle: { fontSize: 12, color: "#999", marginTop: 2 },
  btnViewShop: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#B59DFF",
  },
  btnViewShopText: {
    color: "#B59DFF",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  wishlistBtn: {
    // Kế thừa style của backBtn bạn đã viết
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  starsRow: { flexDirection: "row", marginTop: 3 },
  reviewCard: {
    backgroundColor: "#F9F9FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
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
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: "bold", color: "#333" },
  reviewDate: { fontSize: 11, color: "#999" },
  reviewComment: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginTop: 4,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  avgRatingRow: {
    backgroundColor: "#FFF9F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avgRatingLeft: { flexDirection: "row", alignItems: "center" },
  avgRatingNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  reviewCountBadge: {
    marginLeft: 8,
    fontSize: 12,
    color: "#888",
    backgroundColor: "#F4F1FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  reviewCount: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
  },
  viewMoreBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F4F1FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewMoreBtnText: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  noReviewText: {
    textAlign: "center",
    color: "#B0A8C4",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 10,
    marginBottom: 10,
  },
});
