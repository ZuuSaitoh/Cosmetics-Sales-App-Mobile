import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 🚩 Bổ sung
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode"; // 🚩 Bổ sung
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient"; // 🚩 Bổ sung

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();
  const [isSuccess, setIsSuccess] = useState(false);
  const [latestTx, setLatestTx] = useState<any>(null); // 🚩 State lưu giao dịch mới nhất
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra trạng thái sơ bộ từ URL để hiện màu xanh/đỏ ngay
    if (
      params.vnp_ResponseCode === "00" ||
      params.resultCode === "0" ||
      params.status === "success"
    ) {
      setIsSuccess(true);
    }

    // 2. Gọi API lấy dữ liệu thực tế từ DB để hiển thị chi tiết
    fetchLatestTransaction();
  }, [params]);

  const fetchLatestTransaction = async () => {
    try {
      // Lấy userId từ token giống bên trang Profile
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const uId = decoded.sub;

      // Gọi API lấy danh sách giao dịch của User
      const res = await axiosClient.get(`/wallets/user/${uId}/transactions`);

      if (res.data.code === 0 && res.data.result.length > 0) {
        // Lấy giao dịch đầu tiên (mới nhất)
        setLatestTx(res.data.result[0]);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết giao dịch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: any) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price) || 0);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isSuccess ? "#E8F5E9" : "#FFEBEE" },
          ]}
        >
          <Ionicons
            name={isSuccess ? "checkmark-circle" : "close-circle"}
            size={80}
            color={isSuccess ? "#28A745" : "#FF5252"}
          />
        </View>

        <Text style={styles.resultTitle}>
          {isSuccess ? "Nạp tiền thành công!" : "Giao dịch thất bại"}
        </Text>

        <Text style={styles.resultSubText}>
          {isSuccess
            ? "Cảm ơn sếp đã tin tưởng CosMate. Số dư ví đã được cập nhật."
            : "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau sếp nhé!"}
        </Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã giao dịch:</Text>
            {/* 🚩 Dùng ID từ API Transaction */}
            <Text style={styles.detailValue}>#{latestTx?.id || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phương thức:</Text>
            {/* 🚩 Hiện luôn loại thanh toán cho chuyên nghiệp */}
            <Text style={[styles.detailValue, { textTransform: "uppercase" }]}>
              {latestTx?.paymentMethod || "CosMate Wallet"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số tiền:</Text>
            {/* 🚩 Dùng Amount chuẩn từ Database */}
            <Text style={styles.detailValue}>
              {formatPrice(latestTx?.amount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian:</Text>
            <Text style={styles.detailValue}>
              {latestTx?.createdAt
                ? new Date(latestTx.createdAt).toLocaleString("vi-VN")
                : new Date().toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)/profile" as any)}
        >
          <Text style={styles.homeBtnText}>Quay lại trang cá nhân</Text>
        </TouchableOpacity>

        {!isSuccess && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.replace("/(screens)/top-up" as any)}
          >
            <Text style={styles.retryBtnText}>Thử nạp lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" }, // 🚩 Bổ sung
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 10,
  },
  resultSubText: {
    fontSize: 14,
    color: "#8E7AB5",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  detailCard: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: { fontSize: 14, color: "#999" },
  detailValue: { fontSize: 14, fontWeight: "bold", color: "#333" },
  homeBtn: {
    backgroundColor: "#B59DFF",
    width: "100%",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  homeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  retryBtn: { marginTop: 15, padding: 10 },
  retryBtnText: { color: "#B59DFF", fontSize: 15, fontWeight: "600" },
});
