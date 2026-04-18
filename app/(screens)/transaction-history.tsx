import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { walletService } from "@/src/services/walletService";

type Transaction = {
  id: number;
  amount: number;
  type: string;
  status: string;
  paymentMethod: string;
  walletId: number;
  orderId: number;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Cọc",
  RENT: "Thuê",
  REFUND: "Hoàn tiền",
  TOPUP: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  PAYMENT: "Thanh toán",
};

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "#FF9800",
  RENT: "#B59DFF",
  REFUND: "#4CAF50",
  TOPUP: "#2196F3",
  WITHDRAW: "#F44336",
  PAYMENT: "#9C27B0",
};

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const res = await walletService.getTransactions(userId);
      if (res.data.code === 0) {
        const data = res.data.result;
        const sorted = Array.isArray(data)
          ? [...data].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
          : [];
        setTransactions(sorted);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử giao dịch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Math.abs(price));

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "#28A745";
    if (status === "FAILED") return "#DC3545";
    if (status === "PENDING") return "#FF9800";
    return "#888";
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isPositive = item.amount > 0;
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const typeColor = TYPE_COLORS[item.type] || "#888";
    const isRefund = item.type === "REFUND";

    return (
      <View style={styles.transactionCard}>
        <View style={styles.txLeft}>
          <View style={[styles.txIcon, { backgroundColor: typeColor + "20" }]}>
            <Ionicons
              name={isRefund ? "arrow-undo" : "arrow-forward"}
              size={18}
              color={typeColor}
            />
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txType}>{typeLabel}</Text>
            <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
            {item.orderId > 0 && (
              <Text style={styles.txOrder}>Đơn #{item.orderId}</Text>
            )}
          </View>
        </View>
        <View style={styles.txRight}>
          <Text
            style={[
              styles.txAmount,
              { color: isRefund ? "#28A745" : "#333" },
            ]}
          >
            {isRefund ? "+" : "-"}{formatPrice(item.amount)}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status === "COMPLETED"
                ? "Hoàn thành"
                : item.status === "FAILED"
                  ? "Thất bại"
                  : item.status === "PENDING"
                    ? "Đang xử lý"
                    : item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={60} color="#D0C4F0" />
              <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
            </View>
          }
          onRefresh={fetchTransactions}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  listContent: { padding: 15, paddingBottom: 100 },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txType: { fontSize: 15, fontWeight: "700", color: "#333" },
  txDate: { fontSize: 12, color: "#999", marginTop: 2 },
  txOrder: { fontSize: 12, color: "#B59DFF", marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#999", marginTop: 12, fontSize: 15 },
});
