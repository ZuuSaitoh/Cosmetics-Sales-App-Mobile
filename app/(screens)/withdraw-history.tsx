import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { walletService } from "@/src/services/walletService";

type WithdrawRecord = {
  id: number;
  userId: number;
  walletId: number;
  amount: number;
  bankAccountNumber: string;
  bankName: string;
  status: string;
  requestDate: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Chờ xử lý", color: "#FF9800" },
  APPROVED:  { label: "Đã duyệt",   color: "#28A745" },
  REJECTED:  { label: "Từ chối",    color: "#DC3545" },
  COMPLETED: { label: "Hoàn thành",  color: "#28A745" },
};

export default function WithdrawHistoryScreen() {
  const [records, setRecords] = useState<WithdrawRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchWithdraws(); }, []);

  const fetchWithdraws = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;
      const res = await walletService.getWithdraws(userId);
      if (res.data.code === 0) {
        setRecords(res.data.result || []);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử rút tiền:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p || 0);

  const formatDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const renderItem = ({ item }: { item: WithdrawRecord }) => {
    const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "#999" };
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.amount}>{formatPrice(item.amount)}</Text>
            <Text style={styles.bankInfo}>{item.bankName} - {item.bankAccountNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(item.requestDate)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử rút tiền</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchWithdraws(true)}
              colors={["#B59DFF"]}
              tintColor={"#B59DFF"}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền nào.</Text>
          }
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
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  amount: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  bankInfo: { fontSize: 13, color: "#888", marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "bold" },
  date: { fontSize: 12, color: "#AAA" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 50, fontStyle: "italic" },
});
