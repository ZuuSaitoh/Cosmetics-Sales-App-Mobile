import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/src/api/axiosClient";
import { serviceControllerService } from "@/src/services/serviceControllerService";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoverImageError, setIsCoverImageError] = useState(false);
  const [numSlotsStr, setNumSlotsStr] = useState("1");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethods = [
    { id: "VNPAY", label: "Ví điện tử VNPAY", icon: "credit-card" as const },
    { id: "MOMO", label: "Ví MoMo", icon: "phone-portrait" as const },
    { id: "WALLET", label: "Ví CosMate", icon: "pocket" as const },
  ];

  const numSlots = Math.max(1, Math.min(99, Number(numSlotsStr) || 1));

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setIsLoading(true);
      const res = await serviceControllerService.getServiceById(Number(id));
      if (res.data.code === 0) setService(res.data.result || null);
    } catch (err) {
      console.error("Lỗi lấy service:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  const totalAmount = (service?.pricePerSlot || 0) * numSlots;
  const apiHost = API_BASE_URL.replace(/\/api$/, "");
  const rawCoverImage = service?.imageUrls?.[0];
  const coverImageUri =
    typeof rawCoverImage === "string" && rawCoverImage.trim()
      ? rawCoverImage.startsWith("http")
        ? rawCoverImage
        : `${apiHost}${rawCoverImage.startsWith("/") ? rawCoverImage : `/${rawCoverImage}`}`
      : "";
  const areaLabels = Array.isArray(service?.areas)
    ? service.areas
        .map((area: any) => {
          if (typeof area === "string") return area;
          if (area?.district || area?.city) {
            return [area.district, area.city].filter(Boolean).join(", ");
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const handleBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán!");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const cosplayerId = Number(decoded.userId || decoded.sub);

      const payload = {
        serviceId: Number(id),
        bookingDate: new Date().toISOString(),
        numberOfSlots: numSlots,
        paymentMethod: selectedPaymentMethod,
        cosplayerAddressId: 1,
      };

      const res = await serviceControllerService.providerCreateServiceOrder(payload);

      if (res.data.code === 0) {
        const bookingId = res.data.result?.id || res.data.result;
        if (selectedPaymentMethod === "VNPAY" || selectedPaymentMethod === "MOMO") {
          const SERVER_IP = "171.232.184.122";
          const returnUrl =
            selectedPaymentMethod === "VNPAY"
              ? `http://${SERVER_IP}:8080/api/payment/api/vnpay/return`
              : `http://${SERVER_IP}:8080/api/payment/api/momo/return`;

          const paymentRes = await serviceControllerService.payServiceOrder(bookingId, {
            cosplayerId: cosplayerId,
            paymentMethod: selectedPaymentMethod,
            returnUrl: returnUrl,
          });

          if (paymentRes.data.code === 0) {
            const result = paymentRes.data.result;
            let paymentUrl: string | null = null;
            if (typeof result === "string") paymentUrl = result;
            else if (typeof result === "object") {
              paymentUrl = result.url || result.paymentUrl || result.deeplink || result.payUrl || result;
            }

            if (paymentUrl && typeof paymentUrl === "string") {
              await Linking.openURL(paymentUrl);
              router.replace("/(tabs)/profile" as any);
            } else {
              Alert.alert("Lỗi", "Không lấy được URL thanh toán.");
            }
          }
        } else {
          Alert.alert("Thành công", "Đã đặt dịch vụ thành công!", [
            { text: "OK", onPress: () => router.replace("/(tabs)") },
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err.response?.data?.message || "Đặt dịch vụ thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !service) return <ActivityIndicator style={{ flex: 1 }} color="#B59DFF" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!coverImageUri || isCoverImageError ? (
          <View style={styles.coverImagePlaceholder}>
            <Ionicons name="image-outline" size={34} color="#B59DFF" />
            <Text style={styles.coverImagePlaceholderText}>Chưa có ảnh dịch vụ</Text>
          </View>
        ) : (
          <Image
            source={{ uri: coverImageUri }}
            style={styles.coverImage}
            onError={() => setIsCoverImageError(true)}
          />
        )}
        <View style={styles.heroCard}>
          <Text style={styles.serviceName}>{service.serviceName}</Text>
          <Text style={styles.serviceType}>{String(service.serviceType || "").replace("_", " ")}</Text>
          <Text style={styles.description}>{service.description}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{service.status || "UNKNOWN"}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin dịch vụ</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá/slot</Text>
              <Text style={styles.metaValue}>{formatPrice(service.pricePerSlot)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Thời lượng</Text>
              <Text style={styles.metaValue}>{service.slotDurationHours || 0} giờ</Text>
            </View>
          </View>
          <View style={styles.metaBoxFull}>
            <Text style={styles.metaLabel}>Khấu hao thiết bị</Text>
            <Text style={styles.metaValue}>
              {formatPrice(service.equipmentDepreciationCost)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá tối thiểu</Text>
              <Text style={styles.metaValue}>{formatPrice(service.minPrice)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Giá tối đa</Text>
              <Text style={styles.metaValue}>{formatPrice(service.maxPrice)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Khu vực hoạt động</Text>
          <View style={styles.areaWrap}>
            {areaLabels.length > 0 ? (
              areaLabels.map((area: string, idx: number) => (
                <View key={`${area}-${idx}`} style={styles.areaChip}>
                  <Ionicons name="location-outline" size={13} color="#7D6AA5" />
                  <Text style={styles.areaChipText}>{area}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.description}>Chưa cập nhật khu vực.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Số slot thuê</Text>
          <View style={styles.slotRow}>
            <TouchableOpacity
              style={styles.slotBtn}
              onPress={() => setNumSlotsStr(String(Math.max(1, numSlots - 1)))}
            >
              <Ionicons name="remove" size={20} color="#B59DFF" />
            </TouchableOpacity>
            <TextInput
              style={styles.slotInput}
              value={numSlotsStr}
              onChangeText={setNumSlotsStr}
              keyboardType="numeric"
              maxLength={2}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.slotBtn}
              onPress={() => setNumSlotsStr(String(Math.min(99, numSlots + 1)))}
            >
              <Ionicons name="add" size={20} color="#B59DFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentRow,
                selectedPaymentMethod === method.id && styles.paymentRowActive,
              ]}
              onPress={() => setSelectedPaymentMethod(method.id)}
            >
              <Ionicons
                name={method.icon as any}
                size={20}
                color={selectedPaymentMethod === method.id ? "#B59DFF" : "#888"}
              />
              <Text
                style={[
                  styles.paymentLabel,
                  selectedPaymentMethod === method.id && styles.paymentLabelActive,
                ]}
              >
                {method.label}
              </Text>
              <Ionicons
                name={selectedPaymentMethod === method.id ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={selectedPaymentMethod === method.id ? "#B59DFF" : "#DDD"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Tạm tính</Text>
          <View style={styles.summaryRow}>
            <Text>{numSlots} slot × {service.slotDurationHours}h</Text>
            <Text>{formatPrice(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Tiền cọc</Text>
            <Text>{formatPrice(service.depositAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng</Text>
            <Text style={styles.totalValue}>{formatPrice(totalAmount + service.depositAmount)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.btnSubmit, isSubmitting && styles.btnSubmitDisabled]}
          onPress={handleBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Đặt dịch vụ</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  scrollContent: { padding: 14, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  coverImage: { width: "100%", height: 250, borderRadius: 16 },
  coverImagePlaceholder: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    backgroundColor: "#F2EEFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  coverImagePlaceholderText: {
    color: "#8E7AB5",
    fontSize: 13,
    fontWeight: "600",
  },
  heroCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECE9F6",
  },
  serviceName: { fontSize: 20, fontWeight: "bold", color: "#4A3B6B", marginBottom: 4 },
  serviceType: { fontSize: 13, color: "#B59DFF", textTransform: "uppercase", marginBottom: 8 },
  description: { fontSize: 14, color: "#666", lineHeight: 22 },
  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#F1EDFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#6C53A3" },
  sectionCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECE9F6",
  },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  metaBox: {
    flex: 1,
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    borderRadius: 10,
    padding: 10,
  },
  metaBoxFull: {
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  metaLabel: { fontSize: 12, color: "#888" },
  metaValue: { fontSize: 14, color: "#4A3B6B", fontWeight: "700", marginTop: 4 },
  areaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  areaChip: {
    backgroundColor: "#F1EDFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  areaChipText: { color: "#6B5B91", fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#4A3B6B", marginBottom: 10 },
  slotRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  slotBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F4F1FF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E0D7FF" },
  slotInput: { width: 60, fontSize: 20, fontWeight: "bold", color: "#B59DFF", textAlign: "center", borderWidth: 1, borderColor: "#E0D7FF", borderRadius: 8, paddingVertical: 8 },
  paymentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5F5F5", paddingHorizontal: 4, borderRadius: 10, marginBottom: 6, backgroundColor: "#fff" },
  paymentRowActive: { backgroundColor: "#F9F8FF", borderWidth: 1, borderColor: "#B59DFF" },
  paymentLabel: { flex: 1, marginLeft: 10, fontSize: 14, color: "#444" },
  paymentLabelActive: { color: "#B59DFF", fontWeight: "bold" },
  summaryBox: { marginTop: 12, padding: 16, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ECE9F6" },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#EEE" },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#B59DFF" },
  btnSubmit: { backgroundColor: "#8F74D8", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 14, marginBottom: 8 },
  btnSubmitDisabled: { opacity: 0.7 },
  btnSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
