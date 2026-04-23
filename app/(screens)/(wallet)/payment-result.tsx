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
import { walletService } from "@/src/services/walletService";
import { orderService } from "@/src/services/orderService";

type PaymentType = "order" | "topup";

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("order");
  const [orderData, setOrderData] = useState<any>(null);
  const [topupData, setTopupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const vnpaySuccess = params.vnp_ResponseCode === "00";
  const momoSuccess = params.status === "success";

  const fetchPaymentResult = useCallback(async () => {
    const currentParams = params;
    const currentVnpaySuccess = currentParams.vnp_ResponseCode === "00";
    const currentMomoSuccess = currentParams.status === "success";

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

      if (!hasOrderId && currentMomoSuccess) {
        const decoded: any = jwtDecode(token);
        const uId = decoded.sub;
        const txRes = await walletService.getTransactions(uId);
        if (txRes.data.code === 0 && txRes.data.result.length > 0) {
          const latestTx = txRes.data.result[0];
          if (latestTx.orderId || latestTx.referenceOrderId) {
            const detectedOrderId =
              latestTx.orderId || latestTx.referenceOrderId;
            setPaymentType("order");
            const orderRes = await orderService.getOrder(detectedOrderId);
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
        setPaymentType("topup");
        const decoded: any = jwtDecode(token);
        const uId = decoded.sub;
        const res = await walletService.getTransactions(uId);

        if (res.data.code === 0 && res.data.result.length > 0) {
          const latestTx = res.data.result[0];
          const isMomo = !!currentParams.status;
          setTopupData({
            id: latestTx.id,
            amount: latestTx.amount,
            paymentMethod: isMomo ? "MOMO" : latestTx.paymentMethod || "VNPAY",
            createdAt: latestTx.createdAt,
            transId:
              currentParams.transactionId || currentParams.transId || null,
            resultCode:
              currentParams.status === "success" ? "0" : currentParams.status,
            message: currentParams.message || null,
            vnp_TransactionNo: params.vnp_TransactionNo || null,
            vnp_TxnRef: params.vnp_TxnRef || params.txnRef || null,
          });
        }
      } else {
        setPaymentType("order");
        const orderId = currentParams.orderId || currentParams.order_id;
        if (!orderId) {
          setIsLoading(false);
          return;
        }

        const orderRes = await orderService.getOrder(Number(orderId));
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
                await orderService.confirmPayment(Number(orderId));
                confirmed = true;
                break;
              } catch {
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
  }, [fetchPaymentResult, momoSuccess, vnpaySuccess]);

  const formatPrice = (price: any) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price) || 0);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

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
          <Text style={styles.detailLabel}>Số tiền nạp:</Text>
          <Text style={[styles.detailValue, { color: "#28A745" }]}>
            {formatPrice(topupData.amount)}
          </Text>
        </View>
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
          {isSuccess ? "Thanh toán thành công!" : "Giao dịch thất bại"}
        </Text>
        {paymentType === "topup" ? renderTopupDetail() : renderOrderDetail()}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)/profile" as any)}
        >
          <Text style={styles.homeBtnText}>Quay lại trang cá nhân</Text>
        </TouchableOpacity>
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
});
