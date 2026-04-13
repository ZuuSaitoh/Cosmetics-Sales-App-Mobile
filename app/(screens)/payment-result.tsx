import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

type PaymentType = "order" | "topup";

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("order");
  const [orderData, setOrderData] = useState<any>(null);
  const [topupData, setTopupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const vnpaySuccess =
    params.vnp_ResponseCode === "00" ||
    params.resultCode === "0" ||
    params.status === "success";

  // Phân biệt luồng top-up hay order dựa trên params
  // Top-up: có vnp_TxnRef, vnp_Amount, không có orderId
  // Order: có orderId
  const isTopupFlow =
    !params.orderId &&
    !params.order_id &&
    (!!params.vnp_TxnRef || !!params.txnRef);

  const fetchPaymentResult = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) { setIsLoading(false); return; }
      jwtDecode(token);

      if (isTopupFlow) {
        // ====== LUỒNG NẠP TIỀN ======
        setPaymentType("topup");

        // Lấy transaction mới nhất từ ví để xác nhận đã nạp thành công
        const decoded: any = jwtDecode(token);
        const uId = decoded.sub;
        const res = await axiosClient.get(`/wallets/user/${uId}/transactions`);

        if (res.data.code === 0 && res.data.result.length > 0) {
          // Lấy transaction mới nhất
          const latestTx = res.data.result[0];
          setTopupData({
            id: latestTx.id,
            amount: latestTx.amount,
            paymentMethod: latestTx.paymentMethod || "VNPAY",
            createdAt: latestTx.createdAt,
            // Lấy từ params VNPAY
            vnp_TransactionNo: params.vnp_TransactionNo || null,
            vnp_TxnRef: params.vnp_TxnRef || params.txnRef || null,
          });
        }
      } else {
        // ====== LUỒNG THUÊ TRANG PHỤC ======
        setPaymentType("order");
        const orderId = params.orderId || params.order_id;

        if (!orderId) {
          console.warn("Không có orderId trong params");
          setIsLoading(false);
          return;
        }

        const orderRes = await axiosClient.get(`/orders/${orderId}`);
        if (orderRes.data.code === 0) {
          const order = orderRes.data.result;
          setOrderData(order);

          const dbStatus = order.status;
          if (dbStatus === "PAID") {
            setIsSuccess(true);
          } else if (dbStatus === "UNPAID") {
            try {
              await axiosClient.post(`/orders/${orderId}/confirm-payment`);
              setIsSuccess(true);
            } catch {
              // Backend sẽ tự xử lý qua IPN
            }
          }
        }
      }
    } catch (error) {
      console.error("Lỗi xác nhận thanh toán:", error);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (vnpaySuccess) {
      setIsSuccess(true);
    }
    fetchPaymentResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ============ RENDER THEO TỪNG LUỒNG ============

  const renderOrderDetail = () => {
    if (!orderData) return null;
    return (
      <View style={styles.detailCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mã đơn hàng:</Text>
          <Text style={styles.detailValue}>#{orderData.id}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phương thức:</Text>
          <Text style={[styles.detailValue, { textTransform: "uppercase" }]}>
            {orderData.paymentMethod || "VNPAY"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Số tiền:</Text>
          <Text style={styles.detailValue}>
            {formatPrice(orderData.totalAmount)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Trạng thái:</Text>
          <Text style={[styles.detailValue, { color: "#28A745" }]}>
            {orderData.status}
          </Text>
        </View>
        {orderData.rentStart && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ngày thuê:</Text>
            <Text style={styles.detailValue}>
              {new Date(orderData.rentStart).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTopupDetail = () => {
    if (!topupData) return null;
    return (
      <View style={styles.detailCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mã giao dịch:</Text>
          <Text style={styles.detailValue}>#{topupData.id}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phương thức:</Text>
          <Text style={[styles.detailValue, { textTransform: "uppercase" }]}>
            {topupData.paymentMethod}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Số tiền nạp:</Text>
          <Text style={[styles.detailValue, { color: "#28A745" }]}>
            {formatPrice(topupData.amount)}
          </Text>
        </View>
        {topupData.vnp_TransactionNo && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã VNPAY:</Text>
            <Text style={styles.detailValue}>{topupData.vnp_TransactionNo}</Text>
          </View>
        )}
        {topupData.vnp_TxnRef && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã tham chiếu:</Text>
            <Text style={styles.detailValue}>{topupData.vnp_TxnRef}</Text>
          </View>
        )}
        {topupData.createdAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian:</Text>
            <Text style={styles.detailValue}>
              {new Date(topupData.createdAt).toLocaleString("vi-VN")}
            </Text>
          </View>
        )}
      </View>
    );
  };

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
          {isSuccess
            ? paymentType === "topup"
              ? "Nạp tiền thành công!"
              : "Thanh toán thành công!"
            : "Giao dịch thất bại"}
        </Text>

        <Text style={styles.resultSubText}>
          {isSuccess
            ? paymentType === "topup"
              ? "Cảm ơn bạn đã tin tưởng CosMate. Số dư ví đã được cập nhật."
              : "Cảm ơn bạn đã thuê trang phục tại CosMate. Chúc bạn cosplay vui vẻ!"
            : "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau nhé!"}
        </Text>

        {paymentType === "topup" ? renderTopupDetail() : renderOrderDetail()}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)/profile" as any)}
        >
          <Text style={styles.homeBtnText}>Quay lại trang cá nhân</Text>
        </TouchableOpacity>

        {!isSuccess && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() =>
              router.replace(
                paymentType === "topup" ? "/(screens)/top-up" as any : "/(tabs)" as any
              )
            }
          >
            <Text style={styles.retryBtnText}>
              {paymentType === "topup" ? "Thử nạp lại" : "Quay về trang chủ"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
