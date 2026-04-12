import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import axiosClient from "../api/axiosClient";

export default function WishlistScreen() {
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      // 🚩 SỬ DỤNG API: GET /api/users/{userId}/wishlist
      const response = await axiosClient.get(`/users/${userId}/wishlist`);
      if (response.data.code === 0) {
        setWishlist(response.data.result);
      }
    } catch (error) {
      console.error("Lỗi tải Wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: number) => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      const decoded: any = jwtDecode(token || "");
      const userId = decoded.sub;

      // 🚩 SỬ DỤNG API: DELETE /api/users/{userId}/wishlist/{id}
      const res = await axiosClient.delete(`/users/${userId}/wishlist/${wishlistId}`);
      if (res.data.code === 0) {
        setWishlist(wishlist.filter((item: any) => item.id !== wishlistId));
      }
    } catch (err) {
      console.log("Không thể xóa khỏi yêu thích");
    }
  };

  if (isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color="#B59DFF" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#4A3B6B" /></TouchableOpacity>
        <Text style={styles.title}>Yêu thích</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={wishlist}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.costume?.imageUrls?.[0] || "https://via.placeholder.com/100" }} style={styles.img} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.costume?.name}</Text>
              <Text style={styles.price}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.costume?.pricePerDay || 0)}/ngày</Text>
            </View>
            <TouchableOpacity onPress={() => removeFromWishlist(item.id)}>
              <Ionicons name="heart" size={24} color="#FF5252" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có bộ đồ nào được yêu thích bạn ơi! 💔</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 15, backgroundColor: "#fff", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  card: { flexDirection: "row", backgroundColor: "#fff", padding: 10, borderRadius: 12, marginBottom: 12, alignItems: "center", elevation: 2 },
  img: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#333" },
  price: { fontSize: 14, color: "#B59DFF", fontWeight: "bold", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 50, color: "#999", fontStyle: "italic" }
});