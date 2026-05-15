/* eslint-disable import/no-unresolved */
import axiosClient from "@/src/api/axiosClient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
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

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate] = useState(new Date());
  const [numSlotsStr, setNumSlotsStr] = useState("1");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);

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
      const res = await axiosClient.get(`/services`);
      if (res.data.code === 0) {
        const found = (res.data.result || []).find(
          (s: any) => s.id === Number(id),
        );
        setService(found);
      }
    } catch (err) {
      console.error("Lỗi lấy service:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);

  const totalAmount = (service?.pricePerSlot || 0) * numSlots;

  const handleBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán!");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const cosplayerId = Number(decoded.sub);

      const payload = {
        serviceId: Number(id),
        bookingDate: selectedDate.toISOString(),
        numberOfSlots: numSlots,
        paymentMethod: selectedPaymentMethod,
        cosplayerAddressId: 1, // TODO: cho user chọn địa chỉ
      };

      const res = await axiosClient.post(
        `/bookings?cosplayerId=${cosplayerId}`,
        payload,
      );

      if (res.data.code === 0) {
        const bookingId = res.data.result?.id || res.data.result;

        // Thanh toán online: VNPAY hoặc MOMO
        if (
          selectedPaymentMethod === "VNPAY" ||
          selectedPaymentMethod === "MOMO"
        ) {
          const SERVER_IP = "10.88.54.16";
          const returnUrl =
            selectedPaymentMethod === "VNPAY"
              ? `http://${SERVER_IP}:8080/api/payment/api/vnpay/return`
              : `http://${SERVER_IP}:8080/api/payment/api/momo/return`;

          const paymentRes = await axiosClient.post(
            `/bookings/${bookingId}/pay`,
            null,
            {
              params: {
                cosplayerId: cosplayerId,
                paymentMethod: selectedPaymentMethod,
                returnUrl: returnUrl,
              },
            },
          );

          if (paymentRes.data.code === 0) {
            const result = paymentRes.data.result;
            let paymentUrl: string | null = null;

            if (typeof result === "string") {
              paymentUrl = result;
            } else if (typeof result === "object") {
              paymentUrl =
                result.url ||
                result.paymentUrl ||
                result.deeplink ||
                result.payUrl ||
                result;
            }

            if (paymentUrl && typeof paymentUrl === "string") {
              console.log("[ServiceDetail] paymentUrl:", paymentUrl);
              await Linking.openURL(paymentUrl);
              router.replace("/(tabs)/profile" as any);
            } else {
              Alert.alert("Lỗi", "Không lấy được URL thanh toán.");
            }
          }
        } else {
          // WALLET: thanh toán thành công luôn
          Alert.alert("Thành công", "Đã đặt dịch vụ thành công!", [
            { text: "OK", onPress: () => router.replace("/(tabs)") },
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Đặt dịch vụ thất bại.",
      );
    }
  };

  if (isLoading || !service)
    return <ActivityIndicator style={{ flex: 1 }} color="#B59DFF" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {/* ẢNH DỊCH VỤ */}
        <Image
          source={{
            uri:
              service.imageUrls?.[0] || "https://via.placeholder.com/400x300",
          }}
          style={styles.coverImage}
        />

        {/* THÔNG TIN CƠ BẢN */}
        <View style={styles.infoSection}>
          <Text style={styles.serviceName}>{service.serviceName}</Text>
          <Text style={styles.serviceType}>
            {service.serviceType.replace("_", " ")}
          </Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        {/* KHU VỰC HOẠT ĐỘNG */}
        {service.areas?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khu vực hoạt động</Text>
            <View style={styles.chipContainer}>
              {service.areas.map((area: string, index: number) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* GIÁ DỊCH VỤ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá dịch vụ</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Giá / slot ({service.slotDurationHours}h)
            </Text>
            <Text style={styles.priceValue}>
              {formatPrice(service.pricePerSlot)}
            </Text>
          </View>
          {service.minPrice && service.maxPrice && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá dao động</Text>
              <Text style={styles.priceValue}>
                {formatPrice(service.minPrice)} -{" "}
                {formatPrice(service.maxPrice)}
              </Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tiền cọc</Text>
            <Text style={styles.priceValue}>
              {formatPrice(service.depositAmount)}
            </Text>
          </View>
        </View>

        {/* CHỌN SỐ SLOT */}
        <View style={styles.section}>
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

        {/* PHƯƠNG THỨC THANH TOÁN */}
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
                selectedPaymentMethod === method.id &&
                  styles.paymentLabelActive,
              ]}
            >
              {method.label}
            </Text>
            <Ionicons
              name={
                selectedPaymentMethod === method.id
                  ? "radio-button-on"
                  : "radio-button-off"
              }
              size={18}
              color={selectedPaymentMethod === method.id ? "#B59DFF" : "#DDD"}
            />
          </TouchableOpacity>
        ))}

        {/* TẠM TÍNH */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Tạm tính</Text>
          <View style={styles.summaryRow}>
            <Text>
              {numSlots} slot × {service.slotDurationHours}h
            </Text>
            <Text>{formatPrice(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Tiền cọc</Text>
            <Text>{formatPrice(service.depositAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng</Text>
            <Text style={styles.totalValue}>
              {formatPrice(totalAmount + service.depositAmount)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnSubmit} onPress={handleBooking}>
          <Text style={styles.btnSubmitText}>Đặt dịch vụ</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => {
            if (!service?.providerId) {
              Alert.alert(
                "Thông báo",
                "Không tìm thấy thông tin nhà cung cấp.",
              );
              return;
            }
            router.push({
              pathname: "/(screens)/chat-detail" as any,
              params: {
                partnerId: service.providerId,
                partnerName:
                  service.shopName || service.cosplayerName || "Nhà cung cấp",
              },
            });
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color="#B59DFF"
          />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rentButton} onPress={handleBooking}>
          <Text style={styles.rentButtonText}>Đặt dịch vụ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
  coverImage: { width: "100%", height: 250, borderRadius: 12 },
  infoSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  serviceName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 13,
    color: "#B59DFF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  description: { fontSize: 14, color: "#666", lineHeight: 22 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 10,
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#F4F1FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  chipText: { fontSize: 13, color: "#B59DFF" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 14, fontWeight: "bold", color: "#B59DFF" },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  slotBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  slotInput: {
    width: 60,
    fontSize: 20,
    fontWeight: "bold",
    color: "#B59DFF",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 8,
    paddingVertical: 8,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  paymentRowActive: {
    backgroundColor: "#F9F8FF",
    borderWidth: 1,
    borderColor: "#B59DFF",
  },
  paymentLabel: { flex: 1, marginLeft: 10, fontSize: 14, color: "#444" },
  paymentLabelActive: { color: "#B59DFF", fontWeight: "bold" },
  summaryBox: {
    marginTop: 25,
    padding: 20,
    backgroundColor: "#FAF9FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EFFF",
  },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#B59DFF" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#B59DFF" },
  btnSubmit: {
    backgroundColor: "#B59DFF",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  btnSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    alignItems: "center",
    paddingBottom: 25,
  },
  chatButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    backgroundColor: "#fff",
    marginRight: 12,
  },
  chatText: { fontSize: 11, color: "#B59DFF", marginTop: 2, fontWeight: "600" },
  rentButton: {
    flex: 1,
    backgroundColor: "#B59DFF",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  rentButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
