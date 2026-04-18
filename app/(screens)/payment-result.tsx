import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "../api/axiosClient";

type PaymentType = "order" | "topup";

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();

  // 🔍 DEBUG: log tất cả params nhận được từ VNPay redirect

  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("order");
  const [orderData, setOrderData] = useState<any>(null);
  const [topupData, setTopupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed fresh on each render — NOT inside useCallback to avoid stale closure
  // VNPAY: vnp_ResponseCode="00"
  const vnpaySuccess = params.vnp_ResponseCode === "00";
  // MoMo (backend redirect): status=success/failed, transactionId, orderId
  const momoSuccess = params.status === "success";

  const fetchPaymentResult = useCallback(async () => {
    const currentParams = params;
    const currentVnpaySuccess = currentParams.vnp_ResponseCode === "00";
    const currentMomoSuccess = currentParams.status === "success";

    // Luồng nạp tiền: có vnp_TxnRef (VNPAY) HOẶC status=success nhưng KHÔNG có orderId
    // Luồng order: có orderId hoặc order_id
    const hasOrderId = !!(currentParams.orderId || currentParams.order_id);
    const isTopupFlow = hasOrderId
      ? false
      : !!currentParams.vnp_TxnRef || currentMomoSuccess;

    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      jwtDecode(token);

      // ✅ Fallback: nếu backend redirect không có orderId, dùng transaction history để phân biệt
      // Kiểm tra transaction mới nhất trong ví — nếu có transaction liên quan đến order thì là luồng order
      if (!hasOrderId && currentMomoSuccess) {
        const decoded: any = jwtDecode(token);
        const uId = decoded.sub;
        const txRes = await axiosClient.get(
          `/wallets/user/${uId}/transactions`,
        );
        if (txRes.data.code === 0 && txRes.data.result.length > 0) {
          const latestTx = txRes.data.result[0];
          // Nếu transaction mới nhất có trường orderId hoặc referenceOrderId → là luồng order
          if (latestTx.orderId || latestTx.referenceOrderId) {
            const detectedOrderId =
              latestTx.orderId || latestTx.referenceOrderId;
            // Gọi luồng order với orderId tìm được
            setPaymentType("order");
            const orderRes = await axiosClient.get(
              `/orders/${detectedOrderId}`,
            );
            if (orderRes.data.code === 0) {
              setOrderData(orderRes.data.result);
              setIsSuccess(true);
            }
            setIsLoading(false);
            return;
          }
        }
      }

      if (isTopupFlow) {
        // ====== LUỒNG NẠP TIỀN ======
        setPaymentType("topup");

        const decoded: any = jwtDecode(token);
        const uId = decoded.sub;
        const res = await axiosClient.get(`/wallets/user/${uId}/transactions`);

        if (res.data.code === 0 && res.data.result.length > 0) {
          const latestTx = res.data.result[0];
          const isMomo = !!currentParams.status;
          setTopupData({
            id: latestTx.id,
            amount: latestTx.amount,
            paymentMethod: isMomo ? "MOMO" : latestTx.paymentMethod || "VNPAY",
            createdAt: latestTx.createdAt,
            // MoMo params từ backend redirect
            transId:
              currentParams.transactionId || currentParams.transId || null,
            resultCode:
              currentParams.status === "success" ? "0" : currentParams.status,
            message: currentParams.message || null,
            // VNPAY fallback
            vnp_TransactionNo: params.vnp_TransactionNo || null,
            vnp_TxnRef: params.vnp_TxnRef || params.txnRef || null,
          });
        }
      } else {
        // ====== LUỒNG THUÊ TRANG PHỤC / DỊCH VỤ ======
        setPaymentType("order");
        // Backend MoMo gửi orderId, VNPAY gửi order_id
        const orderId = currentParams.orderId || currentParams.order_id;

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
            let confirmed = false;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await axiosClient.post(`/orders/${orderId}/confirm-payment`);
                confirmed = true;
                break;
              } catch (err: any) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
            if (confirmed || currentVnpaySuccess || currentMomoSuccess) {
              setIsSuccess(true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Lỗi xác nhận thanh toán:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (vnpaySuccess || momoSuccess) {
      setIsSuccess(true);
    }
    fetchPaymentResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount; fetchPaymentResult tự phụ thuộc params

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
    const isMomo = topupData.paymentMethod === "MOMO";
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
        {isMomo && topupData.transId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã MoMo:</Text>
            <Text style={styles.detailValue}>{topupData.transId}</Text>
          </View>
        )}
        {isMomo && topupData.message && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thông báo:</Text>
            <Text style={styles.detailValue}>{topupData.message}</Text>
          </View>
        )}
        {!isMomo && topupData.vnp_TransactionNo && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã VNPAY:</Text>
            <Text style={styles.detailValue}>
              {topupData.vnp_TransactionNo}
            </Text>
          </View>
        )}
        {!isMomo && topupData.vnp_TxnRef && (
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
                paymentType === "topup"
                  ? ("/(screens)/top-up" as any)
                  : ("/(tabs)" as any),
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
