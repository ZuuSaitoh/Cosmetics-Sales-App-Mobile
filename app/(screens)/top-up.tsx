import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking"; // 🚩 CHUYỂN SANG: Dùng Linking của expo
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export default function TopUpScreen() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"vnpay" | "momo">("vnpay");
  const [isLoading, setIsLoading] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");

  const formatInputAmount = (val: string) => {
    if (!val) return "";
    const rawValue = val.replace(/\D/g, "");
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatInputAmount(text);
    setDisplayAmount(formatted);
    const rawValue = formatted.replace(/\./g, "");
    setAmount(rawValue);
  };

  const handleTopUp = async () => {
    // 🚩 BƯỚC 1: Lấy Token và giải mã lấy userId
    const token = await AsyncStorage.getItem("cosmate_token");
    if (!token) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");
      return;
    }

    const decoded: any = jwtDecode(token);
    const uId = decoded.sub;
    const numAmount = parseInt(amount);

    if (!numAmount || numAmount < 10000) {
      Alert.alert("Lỗi", "Số tiền nạp tối thiểu là 10.000đ");
      return;
    }

    // 🚩 BƯỚC 2: Cấu hình Link Return dẫn về Backend
    // Sếp nhớ kiểm tra IP máy tính có còn là 192.168.101.107 không nhé
    const SERVER_IP = "10.88.54.16";
    const backendReturnUrl =
      method === "vnpay"
        ? `http://${SERVER_IP}:8080/api/payment/api/vnpay/return`
        : `http://${SERVER_IP}:8080/api/payment/api/momo/return`;

    console.log("--- DEBUG NẠP TIỀN ---");
    console.log("UserId:", uId);
    console.log("Backend Return URL:", backendReturnUrl);

    setIsLoading(true);
    try {
      const endpoint =
        method === "vnpay"
          ? "payment/api/vnpay/create"
          : "payment/api/momo/create";

      const response = await axiosClient.post(endpoint, null, {
        params: {
          userId: uId,
          amount: numAmount,
          returnUrl: backendReturnUrl, // 🚩 SỬA: Dùng link Backend thay cho Deep Link
        },
      });

      if (response.data.code === 0 && response.data.result) {
        const result = response.data.result;
        // result có thể là string (URL) hoặc object có url / paymentUrl / deeplink...
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
          await Linking.openURL(paymentUrl);
        } else {
          console.log("[TopUp] result:", JSON.stringify(result));
          Alert.alert(
            "Lỗi",
            "Backend trả về định dạng không hợp lệ. Xem console để debug.",
          );
        }
      }
    } catch (error) {
      console.error("Lỗi nạp tiền:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ thanh toán.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nạp tiền vào ví</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Nhập số tiền nạp (VND)</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          keyboardType="numeric"
          value={displayAmount}
          onChangeText={handleAmountChange}
        />

        <View style={styles.presetContainer}>
          {PRESET_AMOUNTS.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.presetBtn,
                amount === val.toString() && styles.presetBtnActive,
              ]}
              onPress={() => handleAmountChange(val.toString())}
            >
              <Text
                style={[
                  styles.presetText,
                  amount === val.toString() && styles.presetTextActive,
                ]}
              >
                {val / 1000}k
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 30 }]}>
          Chọn phương thức thanh toán
        </Text>

        <TouchableOpacity
          style={[
            styles.methodBtn,
            method === "vnpay" && styles.methodBtnActive,
          ]}
          onPress={() => setMethod("vnpay")}
        >
          <View style={styles.methodLeft}>
            <Ionicons
              name="card-outline"
              size={24}
              color={method === "vnpay" ? "#B59DFF" : "#666"}
            />
            <Text style={styles.methodName}>Cổng thanh toán VNPay</Text>
          </View>
          <Ionicons
            name={method === "vnpay" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color="#B59DFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodBtn,
            method === "momo" && styles.methodBtnActive,
          ]}
          onPress={() => setMethod("momo")}
        >
          <View style={styles.methodLeft}>
            <Ionicons
              name="phone-portrait-outline"
              size={24}
              color={method === "momo" ? "#B59DFF" : "#666"}
            />
            <Text style={styles.methodName}>Ví điện tử MoMo</Text>
          </View>
          <Ionicons
            name={method === "momo" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color="#B59DFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleTopUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Nạp tiền ngay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  scrollContent: { padding: 20 },
  label: {
    fontSize: 14,
    color: "#8E7AB5",
    fontWeight: "600",
    marginBottom: 15,
  },
  amountInput: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A3B6B",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
    gap: 10,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  presetBtnActive: { backgroundColor: "#B59DFF", borderColor: "#B59DFF" },
  presetText: { color: "#4A3B6B", fontWeight: "600" },
  presetTextActive: { color: "#fff" },
  methodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  methodBtnActive: { borderColor: "#B59DFF", backgroundColor: "#F9F8FF" },
  methodLeft: { flexDirection: "row", alignItems: "center" },
  methodName: {
    marginLeft: 12,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  confirmBtn: {
    backgroundColor: "#B59DFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 40,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
