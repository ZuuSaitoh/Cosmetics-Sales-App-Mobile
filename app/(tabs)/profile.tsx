import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // State cho Modal Chỉnh sửa
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      const decoded: any = jwtDecode(token);
      const uId = decoded.sub;
      setUserId(uId);

      const response = await axiosClient.get(`/users/${uId}/profile`);

      if (response.data.code === 0) {
        const data = response.data.result;
        setProfile(data);
        // Gán dữ liệu mặc định vào state của form Edit
        setEditFullName(data.fullName || "");
        setEditPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Lỗi lấy profile:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin cá nhân.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM GỌI API CẬP NHẬT PROFILE ---
  const handleUpdateProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert("Lỗi", "Họ và tên không được để trống.");
      return;
    }
    if (!userId) return;

    setIsSaving(true);
    try {
      const response = await axiosClient.put(`/users/${userId}/profile`, {
        fullName: editFullName,
        phone: editPhone,
      });

      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật hồ sơ!");
        setProfile(response.data.result); // Cập nhật lại giao diện ngay lập tức
        setIsEditModalVisible(false); // Tắt Modal
      } else {
        Alert.alert("Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile:", error);
      Alert.alert("Lỗi", "Không thể cập nhật hồ sơ lúc này.");
    } finally {
      setIsSaving(false);
    }
  };

  // ---> HÀM MỚI: Chọn ảnh và Upload Avatar <---
  const handleChangeAvatar = async () => {
    // 1. Mở thư viện ảnh (Ép crop tỉ lệ 1:1 cho vuông vức)
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1], // Tỉ lệ 1:1 cho Avatar tròn
      quality: 0.8,
    });

    if (!result.canceled && userId) {
      setIsUpdatingAvatar(true);
      try {
        const formData = new FormData();
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // LƯU Ý: Tên field phải đúng chữ 'avatar' theo Swagger
        formData.append("avatar", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const res = await axiosClient.put(`/users/${userId}/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh đại diện mới!");
          setProfile(res.data.result); // Cập nhật ngay hình mới lên app
        } else {
          Alert.alert("Lỗi", res.data.message);
        }
      } catch (error) {
        console.error("Lỗi cập nhật avatar:", error);
        Alert.alert("Lỗi", "Không thể upload ảnh đại diện lúc này.");
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER: AVATAR & NAME */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile?.avatarUrl || "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />

            {/* Hiệu ứng loading đè lên avatar khi đang upload */}
            {isUpdatingAvatar && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(255,255,255,0.7)",
                    borderRadius: 55,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <ActivityIndicator size="small" color="#B59DFF" />
              </View>
            )}

            {/* Gắn hàm handleChangeAvatar vào nút */}
            <TouchableOpacity
              style={styles.editBadge}
              onPress={handleChangeAvatar}
              disabled={isUpdatingAvatar}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fullName}>
            {profile?.fullName || "Người dùng CosMate"}
          </Text>
          <Text style={styles.username}>@{profile?.username}</Text>
        </View>

        {/* CHI TIẾT THÔNG TIN */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>
                {profile?.phone || "Chưa cập nhật"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#8E7AB5"
            />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
              <Text style={[styles.infoValue, { color: "#28A745" }]}>
                {profile?.status}
              </Text>
            </View>
          </View>
        </View>

        {/* NÚT HÀNH ĐỘNG */}
        <View style={styles.actionSection}>
          {/* Nút Chỉnh sửa hồ sơ hiện có */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={22} color="#4A3B6B" />
            <Text style={styles.actionBtnText}>Chỉnh sửa hồ sơ</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* ---> MỤC MỚI: SỔ ĐỊA CHỈ <--- */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(screens)/address-book" as any)}
          >
            <Ionicons name="location-outline" size={22} color="#4A3B6B" />
            <Text style={styles.actionBtnText}>Sổ địa chỉ</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* Nút Đăng xuất hiện có */}
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

      {/* MODAL CHỈNH SỬA THÔNG TIN */}
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
              <Text style={styles.modalTitle}>Cập nhật thông tin</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Nhập họ và tên..."
            />

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Nhập số điện thoại..."
              keyboardType="phone-pad"
            />

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
  profileHeader: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#F4F1FF",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "#B59DFF",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  fullName: { fontSize: 22, fontWeight: "bold", color: "#4A3B6B" },
  username: { fontSize: 14, color: "#8E7AB5", marginTop: 4 },

  infoSection: {
    backgroundColor: "#fff",
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  infoTextColumn: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: "#A090C5", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#333" },

  actionSection: { marginTop: 20, marginHorizontal: 20, paddingBottom: 100 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  actionBtnText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
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
    fontSize: 16,
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
