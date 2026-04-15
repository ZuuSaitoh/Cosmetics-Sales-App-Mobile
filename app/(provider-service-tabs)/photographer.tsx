import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "../api/axiosClient";

export default function PhotographerScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axiosClient.get("/services");
      if (res.data.code === 0) {
        // Lọc chỉ lấy type PHOTOGRAPHER
        const photographers = (res.data.result || []).filter(
          (s: any) => s.serviceType === "PHOTOGRAPHER",
        );
        setServices(photographers);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu photographer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thợ ảnh</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(screens)/service-detail",
                  params: { id: item.id },
                })
              }
            >
              <Image
                source={{ uri: item.imageUrls?.[0] || "https://via.placeholder.com/200" }}
                style={styles.cardImage}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.serviceName}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={styles.cardPrice}>{formatPrice(item.pricePerSlot)}</Text>
                <Text style={styles.cardUnit}>/{item.slotDurationHours}h</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có thợ ảnh nào.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  listContainer: { padding: 10 },
  row: { justifyContent: "space-between", paddingHorizontal: 5 },
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
  },
  cardImage: { width: "100%", height: 140 },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 2 },
  cardDesc: { fontSize: 11, color: "#888", marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: "bold", color: "#B59DFF" },
  cardUnit: { fontSize: 11, color: "#888" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 50 },
});