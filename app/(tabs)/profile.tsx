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
        setProfile(response.data.result);
        setIsEditModalVisible(false);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
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

        formData.append("avatar", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const res = await axiosClient.put(`/users/${userId}/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh đại diện!");
          setProfile(res.data.result);
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể upload ảnh.");
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn thoát không?", [
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

  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile?.avatarUrl || "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />
            {isUpdatingAvatar && (
              <View style={[StyleSheet.absoluteFill, styles.loadingAvatar]}>
                <ActivityIndicator size="small" color="#B59DFF" />
              </View>
            )}
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

        {/* INFO SECTION */}
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
        </View>

        {/* ACTION SECTION */}
        <View style={styles.actionSection}>
          {/* Wishlist */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(screens)/wishlist" as any)}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#FFEBEE" }]}>
                <Ionicons name="heart" size={20} color="#FF5252" />
              </View>
              <Text style={styles.actionText}>Danh sách yêu thích</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setIsEditModalVisible(true)}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F4F1FF" }]}>
                <Ionicons name="create-outline" size={20} color="#4A3B6B" />
              </View>
              <Text style={styles.actionText}>Chỉnh sửa hồ sơ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* Address Book */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(screens)/address-book" as any)}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="location-outline" size={20} color="#28A745" />
              </View>
              <Text style={styles.actionText}>Sổ địa chỉ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.actionBtn, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#FFE5E5" }]}>
                <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
              </View>
              <Text style={[styles.actionText, { color: "#FF4D4D" }]}>
                Đăng xuất
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL EDIT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
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
            />
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.saveBtn}
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
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#F4F1FF",
  },
  loadingAvatar: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
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
  actionSection: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    elevation: 1,
    paddingBottom: 5,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  actionLeft: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: { fontSize: 16, fontWeight: "600", color: "#4A3B6B" },
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
