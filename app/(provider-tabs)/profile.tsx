import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

export default function ProviderProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- CHỈ LƯU DUY NHẤT USER ID ĐỂ CẬP NHẬT ---
  const [userId, setUserId] = useState<number | null>(null);

  // --- STATE CHO MODAL CHỈNH SỬA ---
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankAccountNumber, setEditBankAccountNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  const fetchProviderProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      const decoded: any = jwtDecode(token);
      const currentUserId = decoded.sub;

      // LƯU LẠI USER ID ĐỂ LÁT NỮA GỌI API UPDATE
      setUserId(currentUserId);

      // 1. Lấy thông tin cơ bản của Provider theo User ID
      const userRes = await axiosClient.get(`/providers/user/${currentUserId}`);
      if (userRes.data.code !== 0 || !userRes.data.result) {
        Alert.alert("Lỗi", "Không tìm thấy hồ sơ Shop.");
        setIsLoading(false);
        return;
      }

      const pId = userRes.data.result.id;

      // 2. Lấy Full Profile của Provider
      const profileRes = await axiosClient.get(`/providers/id/${pId}`);
      if (profileRes.data.code === 0) {
        const data = profileRes.data.result;
        setProfile(data);

        // Đổ dữ liệu có sẵn vào form Edit
        setEditShopName(data.shopName || "");
        setEditBio(data.bio || "");
        setEditBankName(data.bankName || "");
        setEditBankAccountNumber(
          data.bankBankAccountNumber || data.bankAccountNumber || "",
        );
      }
    } catch (error) {
      console.error("Lỗi lấy profile provider:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin cửa hàng.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM GỌI API CẬP NHẬT CHUẨN BACKEND 100% ---
  const handleUpdateProfile = async () => {
    if (!editShopName.trim()) {
      Alert.alert("Lỗi", "Tên Shop không được để trống!");
      return;
    }

    // Bắt buộc dùng userId theo logic Java Backend
    if (!userId) {
      Alert.alert("Lỗi", "Chưa tải xong ID tài khoản, vui lòng thử lại!");
      return;
    }

    const token = await AsyncStorage.getItem("cosmate_token");
    console.log("🔑 CHÌA KHÓA TRÊN APP NÈ: Bearer " + token);

    setIsSaving(true);
    try {
      const payload = {
        shopName: editShopName,
        bio: editBio,
        bankName: editBankName,
        bankAccountNumber: editBankAccountNumber,
        // SỬA THÀNH NULL ĐỂ QUA ẢI KHÓA NGOẠI SQL SERVER
        shopAddressId: profile?.shopAddressId || null,
      };

      // LẤY TOKEN (CHÌA KHÓA) TỪ STORAGE
      const token = await AsyncStorage.getItem("cosmate_token");

      // GỌI API BẰNG USER ID VÀ ĐÍNH KÈM TOKEN
      const response = await axiosClient.put(`/providers/${userId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật thông tin cửa hàng!");
        setProfile(response.data.result); // Cập nhật lại giao diện ngay
        setIsEditModalVisible(false); // Tắt Modal
      } else {
        Alert.alert("Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile shop:", error);
      Alert.alert("Lỗi", "Không thể cập nhật hồ sơ lúc này.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn thoát tài khoản Shop?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thoát",
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 1. ẢNH BÌA & AVATAR */}
        <View style={styles.headerImages}>
          <Image
            source={{
              uri:
                profile?.coverImageUrl || "https://via.placeholder.com/400x150",
            }}
            style={styles.coverImage}
          />
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: profile?.avatarUrl || "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />
            {profile?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
              </View>
            )}
          </View>
        </View>

        {/* 2. THÔNG TIN CƠ BẢN */}
        <View style={styles.basicInfo}>
          <Text style={styles.shopName}>{profile?.shopName || "Tên Shop"}</Text>
          <Text style={styles.bioText}>
            {profile?.bio || "Chưa có tiểu sử giới thiệu."}
          </Text>
        </View>

        {/* 3. THỐNG KÊ (Stats) */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {profile?.totalRating || 0} ⭐
            </Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {profile?.completedOrders || 0}
            </Text>
            <Text style={styles.statLabel}>Đơn hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.totalReviews || 0}</Text>
            <Text style={styles.statLabel}>Nhận xét</Text>
          </View>
        </View>

        {/* 4. THÔNG TIN THANH TOÁN (Bank) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="card-outline" size={24} color="#B59DFF" />
              <View style={styles.cardText}>
                <Text style={styles.bankName}>
                  {profile?.bankName || "Chưa cập nhật ngân hàng"}
                </Text>
                <Text style={styles.bankNumber}>
                  {profile?.bankBankAccountNumber ||
                    profile?.bankAccountNumber ||
                    "---"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. CÁC NÚT HÀNH ĐỘNG */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={22} color="#4A3B6B" />
            <Text style={styles.actionBtnText}>Chỉnh sửa hồ sơ Shop</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.logoutBtn]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
            <Text style={[styles.actionBtnText, { color: "#FF4D4D" }]}>
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL CHỈNH SỬA THÔNG TIN SHOP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật Cửa hàng</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên Shop</Text>
              <TextInput
                style={styles.input}
                value={editShopName}
                onChangeText={setEditShopName}
                placeholder="Nhập tên Shop..."
              />

              <Text style={styles.inputLabel}>Tiểu sử (Bio)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Mô tả ngắn về Shop của bạn..."
                multiline
              />

              <Text style={styles.inputLabel}>Ngân hàng (Bank Name)</Text>
              <TextInput
                style={styles.input}
                value={editBankName}
                onChangeText={setEditBankName}
                placeholder="VD: Vietcombank, MB Bank..."
              />

              <Text style={styles.inputLabel}>Số tài khoản (Bank Account)</Text>
              <TextInput
                style={styles.input}
                value={editBankAccountNumber}
                onChangeText={setEditBankAccountNumber}
                placeholder="Nhập số tài khoản..."
                keyboardType="numeric"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerImages: { alignItems: "center", marginBottom: 50 },
  coverImage: { width: "100%", height: 160, backgroundColor: "#E0D7FF" },
  avatarWrapper: {
    position: "absolute",
    bottom: -45,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
  },

  basicInfo: { alignItems: "center", paddingHorizontal: 20 },
  shopName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4A3B6B",
    marginBottom: 5,
  },
  bioText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: "#B59DFF",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#8E7AB5" },
  statDivider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 5 },

  section: { marginHorizontal: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center" },
  cardText: { marginLeft: 15 },
  bankName: { fontSize: 15, fontWeight: "bold", color: "#333" },
  bankNumber: { fontSize: 14, color: "#666", marginTop: 2 },

  actionSection: { marginTop: 30, marginHorizontal: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  actionBtnText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    fontWeight: "600",
    color: "#4A3B6B",
  },
  logoutBtn: { marginTop: 10, borderWidth: 1, borderColor: "#FFE5E5" },

  // --- STYLE CHO MODAL CHỈNH SỬA ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1C4E9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#F8F9FA",
    marginBottom: 20,
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
