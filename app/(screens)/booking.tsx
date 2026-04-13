import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";

export default function BookingScreen() {
  const { id } = useLocalSearchParams();
  const [costume, setCostume] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false); // Loading khi bấm thuê

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<number[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const paymentMethods = [
    { id: "VNPAY", label: "Ví điện tử VNPAY", icon: "credit-card" as const },
    { id: "COD", label: "Thanh toán khi nhận hàng", icon: "truck" as const },
    { id: "WALLET", label: "Ví CosMate", icon: "pocket" as const },
  ];

  // Lịch và Số ngày
  const [rentStartDate, setRentStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numDaysStr, setNumDaysStr] = useState("1");

  const minDays = 1;
  const maxDays = 99;
  const actualNumDays = Math.max(
    minDays,
    Math.min(maxDays, Number(numDaysStr) || minDays),
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(`/costumes/${id}`);
      if (res.data.code === 0) setCostume(res.data.result);
    } catch (err) {
      console.error("Lỗi lấy data costume:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumDaysChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    if (!numericValue) {
      setNumDaysStr("");
      return;
    }
    const parsed = Math.min(maxDays, Math.max(minDays, Number(numericValue)));
    setNumDaysStr(String(parsed));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setRentStartDate(selectedDate);
    }
  };

  const calculateTotal = () => {
    if (!costume)
      return {
        total: 0,
        rent: 0,
        options: 0,
        accessories: 0,
        surcharges: 0,
        deposit: 0,
      };

    const baseRent = costume.pricePerDay * actualNumDays;
    const optionPrice =
      costume.rentalOptions?.find((o: any) => o.id === selectedOptionId)
        ?.price || 0;
    const accessoriesPrice =
      costume.accessories
        ?.filter((a: any) => selectedAccessoryIds.includes(a.id))
        .reduce((sum: number, a: any) => sum + a.price, 0) || 0;
    const surchargesPrice =
      costume.surcharges?.reduce((sum: number, s: any) => sum + s.price, 0) || 0;
    const deposit = costume.depositAmount || 0;

    return {
      rent: baseRent,
      options: optionPrice,
      accessories: accessoriesPrice,
      surcharges: surchargesPrice,
      deposit: deposit,
      total: baseRent + optionPrice + accessoriesPrice + surchargesPrice + deposit,
    };
  };

  const prices = calculateTotal();

  const handleToggleAccessory = (aId: number) => {
    setSelectedAccessoryIds((prev) =>
      prev.includes(aId) ? prev.filter((id) => id !== aId) : [...prev, aId],
    );
  };

  const handleBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán!");
      return;
    }

    try {
      setIsBooking(true);
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const cosplayerId = Number(decoded.sub);

      // BƯỚC 1: Tạo đơn hàng trước
      const payload = {
        costumeId: Number(id),
        rentDay: actualNumDays,
        rentStart: rentStartDate.toISOString(),
        paymentMethod: selectedPaymentMethod,
        cosplayerAddressId: 1, // TODO: cho user chọn địa chỉ thật
        selectedAccessoryIds: selectedAccessoryIds,
        selectedRentalOptionId: selectedOptionId || null,
      };

      const res = await axiosClient.post(`/orders?cosplayerId=${cosplayerId}`, payload);

      if (res.data.code === 0) {
        const orderId = res.data.result.id;
        const totalAmount = prices.total;

        // BƯỚC 2: Xử lý theo phương thức thanh toán
        if (selectedPaymentMethod === "VNPAY") {
          // Tạo link thanh toán VNPAY
          const SERVER_IP = "192.168.101.107";
          const returnUrl = `exp://${SERVER_IP}:8081/--/payment-result`;

          const paymentRes = await axiosClient.post("/payment/api/vnpay/create", null, {
            params: {
              userId: cosplayerId,
              amount: totalAmount,
              returnUrl: returnUrl,
              orderId: orderId,
            },
          });

          if (paymentRes.data.code === 0) {
            const url = paymentRes.data.result.paymentUrl || paymentRes.data.result;
            await Linking.openURL(url); // Mở trình duyệt thanh toán
            router.replace("/(tabs)/profile" as any); // Đẩy về profile đợi kết quả
          }
        } else {
          // COD hoặc WALLET (Backend tự trừ tiền nếu chọn WALLET)
          Alert.alert(
            "Thành công",
            "Đã chốt đơn thành công! Chúc bạn cosplay vui vẻ!",
            [{ text: "Đã hiểu", onPress: () => router.replace("/(tabs)") }],
          );
        }
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err.response?.data?.message || "Đặt đồ thất bại.");
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading || !costume)
    return <ActivityIndicator style={{ flex: 1 }} color="#B59DFF" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận thuê đồ</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {/* CHỌN GÓI THUÊ */}
        <Text style={styles.label}>Gói thuê</Text>
        <View style={styles.chipContainer}>
          {costume.rentalOptions?.map((opt: any) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.chip,
                selectedOptionId === opt.id && styles.chipActive,
              ]}
              onPress={() => setSelectedOptionId(opt.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedOptionId === opt.id && styles.chipTextActive,
                ]}
              >
                {opt.name} ({new Intl.NumberFormat("vi-VN").format(opt.price)}đ)
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* THỜI GIAN THUÊ */}
        <Text style={styles.label}>Thời gian thuê</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.datePickerBtn, { flex: 2 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color="#B59DFF" />
            <Text style={styles.dateText}>
              {rentStartDate.toLocaleDateString("vi-VN")}
            </Text>
          </TouchableOpacity>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
            <TextInput
              style={styles.numInput}
              value={numDaysStr}
              onChangeText={handleNumDaysChange}
              keyboardType="numeric"
              maxLength={2}
              placeholder="1"
              placeholderTextColor="#B59DFF"
              selectTextOnFocus={true}
            />
            <Text style={styles.dayLabel}>ngày</Text>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={rentStartDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            themeVariant="light"
            textColor="#000"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* PHỤ KIỆN */}
        <Text style={styles.label}>Phụ kiện kèm theo</Text>
        {costume.accessories?.map((acc: any) => (
          <TouchableOpacity
            key={acc.id}
            style={styles.checkRow}
            onPress={() => handleToggleAccessory(acc.id)}
          >
            <Feather
              name={selectedAccessoryIds.includes(acc.id) ? "check-square" : "square"}
              size={20}
              color="#B59DFF"
            />
            <Text style={styles.checkLabel}>{acc.name}</Text>
            <Text style={styles.checkPrice}>
              {new Intl.NumberFormat("vi-VN").format(acc.price)}đ
            </Text>
          </TouchableOpacity>
        ))}

        {/* PHỤ PHÍ */}
        <Text style={styles.label}>Phụ phí (Luôn áp dụng)</Text>
        {costume.surcharges?.map((sur: any) => (
          <View key={sur.id} style={styles.checkRow}>
            <Feather name="info" size={20} color="#888" />
            <Text style={[styles.checkLabel, { color: "#888" }]}>
              {sur.name}
            </Text>
            <Text style={styles.checkPrice}>
              {new Intl.NumberFormat("vi-VN").format(sur.price)}đ
            </Text>
          </View>
        ))}

        {/* PHƯƠNG THỨC THANH TOÁN */}
        <Text style={styles.label}>Phương thức thanh toán</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.checkRow,
              selectedPaymentMethod === method.id && styles.activeRow,
            ]}
            onPress={() => setSelectedPaymentMethod(method.id)}
          >
            <Feather
              name={method.icon as any}
              size={20}
              color={selectedPaymentMethod === method.id ? "#B59DFF" : "#888"}
            />
            <Text
              style={[
                styles.checkLabel,
                selectedPaymentMethod === method.id && styles.checkLabelActive,
              ]}
            >
              {method.label}
            </Text>
            <Feather
              name={selectedPaymentMethod === method.id ? "check-circle" : "circle"}
              size={18}
              color={selectedPaymentMethod === method.id ? "#B59DFF" : "#DDD"}
            />
          </TouchableOpacity>
        ))}

        {/* TẠM TÍNH */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Tạm tính</Text>
          <View style={styles.priceLine}>
            <Text>Giá thuê ({actualNumDays} ngày)</Text>
            <Text>{new Intl.NumberFormat("vi-VN").format(prices.rent)}đ</Text>
          </View>
          <View style={styles.priceLine}>
            <Text>Gói thuê</Text>
            <Text>
              +{new Intl.NumberFormat("vi-VN").format(prices.options)}đ
            </Text>
          </View>
          <View style={styles.priceLine}>
            <Text>Phụ kiện & Phí</Text>
            <Text>
              +{new Intl.NumberFormat("vi-VN").format(prices.accessories + prices.surcharges)}đ
            </Text>
          </View>
          <View style={styles.priceLine}>
            <Text>Tiền cọc</Text>
            <Text>
              {new Intl.NumberFormat("vi-VN").format(prices.deposit)}đ
            </Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Tổng cần thanh toán</Text>
            <Text style={styles.totalValue}>
              {new Intl.NumberFormat("vi-VN").format(prices.total)}đ
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnSubmit, isBooking && styles.btnSubmitDisabled]}
          onPress={handleBooking}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnSubmitText}>Xác nhận & Thuê ngay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    color: "#4A3B6B",
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#4A3B6B",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  chipActive: { backgroundColor: "#F4F1FF", borderColor: "#B59DFF" },
  chipText: { fontSize: 13, color: "#666" },
  chipTextActive: { color: "#B59DFF", fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center" },

  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#B59DFF",
    borderRadius: 10,
    padding: 15,
    height: 55,
  },
  dateText: { marginLeft: 10, color: "#333", fontSize: 15 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9FF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 55,
  },
  numInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#B59DFF",
    textAlign: "center",
    marginHorizontal: 10,
    paddingVertical: 0,
  },
  dayLabel: { color: "#B59DFF", fontSize: 13, fontWeight: "500" },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  activeRow: {
    borderColor: "#B59DFF",
    backgroundColor: "#F9F8FF",
    borderWidth: 1,
  },
  checkLabel: { flex: 1, marginLeft: 10, fontSize: 14, color: "#444" },
  checkLabelActive: { color: "#B59DFF", fontWeight: "bold" },
  checkPrice: { fontWeight: "bold", color: "#444" },

  summaryBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#FAF9FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EFFF",
  },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalLine: {
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
    elevation: 5,
    marginBottom: 20,
  },
  btnSubmitDisabled: { opacity: 0.7 },
  btnSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
