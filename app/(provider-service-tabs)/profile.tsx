import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "../api/axiosClient";

export default function ServiceProviderProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) return router.replace("/(auth)/login");
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const userRes = await axiosClient.get(`/users/${userId}`);
      if (userRes.data.code === 0) setUser(userRes.data.result);

      const providerRes = await axiosClient.get(`/providers/user/${userId}`);
      if (providerRes.data.code === 0) setProvider(providerRes.data.result);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi tài khoản?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("cosmate_token");
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ nhà cung cấp dịch vụ</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#B59DFF" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.fullName || "Nhà cung cấp"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
        </View>

        {/* THÔNG TIN NHÀ CUNG CẤP */}
        {provider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin nhà cung cấp</Text>
            <View style={styles.infoRow}>
              <Ionicons name="storefront-outline" size={18} color="#888" />
              <Text style={styles.infoLabel}>Tên cửa hàng:</Text>
              <Text style={styles.infoValue}>{provider.name || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#888" />
              <Text style={styles.infoLabel}>Địa chỉ:</Text>
              <Text style={styles.infoValue}>{provider.address || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#888" />
              <Text style={styles.infoLabel}>SĐT:</Text>
              <Text style={styles.infoValue}>{provider.phone || "—"}</Text>
            </View>
          </View>
        )}

        {/* MENU */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="person-outline" size={20} color="#4A3B6B" />
            <Text style={styles.menuText}>Chỉnh sửa hồ sơ</Text>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={20} color="#4A3B6B" />
            <Text style={styles.menuText}>Cài đặt tài khoản</Text>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={20} color="#4A3B6B" />
            <Text style={styles.menuText}>Hỗ trợ</Text>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* NÚT ĐĂNG XUẤT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#4A3B6B" },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  avatarWrapper: { marginBottom: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B", marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#888" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  infoLabel: { fontSize: 14, color: "#888", marginLeft: 8, marginRight: 8 },
  infoValue: { fontSize: 14, color: "#333", flex: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuText: { flex: 1, marginLeft: 12, fontSize: 15, color: "#333" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 30,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF4D4D",
    marginLeft: 8,
  },
});