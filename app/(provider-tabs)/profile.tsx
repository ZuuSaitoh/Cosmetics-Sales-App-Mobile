import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
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
  const [userId, setUserId] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [depositBalance, setDepositBalance] = useState<number>(0);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankAccountNumber, setEditBankAccountNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

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

      // Lấy số dư ví
      const walletRes = await axiosClient.get(`/wallets/user/${uId}`);
      if (walletRes.data.code === 0) {
        setBalance(walletRes.data.result.balance || 0);
        setDepositBalance(walletRes.data.result.depositBalance || 0);
      }

      // Lấy thông tin provider
      const providerRes = await axiosClient.get(`/providers/user/${uId}`);
      if (providerRes.data.code === 0 && providerRes.data.result) {
        const data = providerRes.data.result;
        setProfile(data);
        setEditShopName(data.shopName || "");
        setEditBio(data.bio || "");
        setEditBankName(data.bankName || "");
        setEditBankAccountNumber(
          data.bankBankAccountNumber || data.bankAccountNumber || "",
        );
      }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu Profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editShopName.trim()) {
      Alert.alert("Lỗi", "Tên Shop không được để trống!");
      return;
    }
    if (!userId) return;

    setIsSaving(true);
    try {
      const payload = {
        shopName: editShopName,
        bio: editBio,
        bankName: editBankName,
        bankAccountNumber: editBankAccountNumber,
        shopAddressId: profile?.shopAddressId || null,
      };

      const response = await axiosClient.put(`/providers/${userId}`, payload);
      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật hồ sơ Shop!");
        setProfile(response.data.result);
        setIsEditModalVisible(false);
      } else {
        Alert.alert("Lỗi", response.data.message);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật hồ sơ lúc này.");
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

    if (!result.canceled && result.assets && result.assets.length > 0 && userId) {
      setIsUpdatingAvatar(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        const formData = new FormData();
        formData.append("avatarImage", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const res = await axiosClient.put(
          `/providers/${userId}/avatar-image`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh đại diện!");
          setProfile((prev: any) => ({
            ...prev,
            avatarUrl: localUri,
          }));
        }
      } catch {
        Alert.alert("Lỗi", "Không thể upload ảnh đại diện.");
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleChangeCoverImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && userId) {
      setIsUploadingCover(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "cover.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        const formData = new FormData();
        formData.append("coverImage", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const res = await axiosClient.put(
          `/providers/${userId}/cover-image`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh bìa!");
          setProfile((prev: any) => ({
            ...prev,
            coverImageUrl: localUri,
          }));
        }
      } catch {
        Alert.alert("Lỗi", "Không thể upload ảnh bìa.");
      } finally {
        setIsUploadingCover(false);
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
          {/* Cover image */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleChangeCoverImage}
            disabled={isUploadingCover}
          >
            <View
              style={[
                styles.coverImageContainer,
                !profile?.coverImageUrl && styles.coverImagePlaceholder,
              ]}
            >
              {profile?.coverImageUrl ? (
                <Image
                  source={{ uri: profile.coverImageUrl }}
                  style={styles.coverImage}
                />
              ) : (
                <Ionicons name="image-outline" size={40} color="#D0C4F0" />
              )}
              {isUploadingCover && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                  <ActivityIndicator size="small" color="#B59DFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangeAvatar}
              disabled={isUpdatingAvatar}
            >
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color="#B59DFF" />
                </View>
              )}
              {isUpdatingAvatar && (
                <View
                  style={[StyleSheet.absoluteFill, styles.loadingAvatar]}
                >
                  <ActivityIndicator size="small" color="#B59DFF" />
                </View>
              )}
            </TouchableOpacity>
            {profile?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
              </View>
            )}
          </View>

          <Text style={styles.shopName}>
            {profile?.shopName || "Tên Shop"}
          </Text>
          {profile?.bio && (
            <Text style={styles.bioHeader}>{profile.bio}</Text>
          )}
        </View>

        {/* WALLET CARD */}
        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIconWrap}>
              <Ionicons name="wallet-outline" size={24} color="#B59DFF" />
            </View>
            <View>
              <Text style={styles.walletLabel}>Số dư khả dụng</Text>
              <Text style={styles.walletBalance}>
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(balance)}
              </Text>
              {depositBalance > 0 && (
                <Text style={styles.depositBalance}>
                  Tiền cọc:{" "}
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(depositBalance)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(profile?.totalRating || 0) ? "star" : "star-outline"}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
            <Text style={styles.statLabel}>{profile?.totalRating || 0} đánh giá</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile?.completedOrders || 0}
            </Text>
            <Text style={styles.statLabel}>Đơn hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile?.totalReviews || 0}
            </Text>
            <Text style={styles.statLabel}>Nhận xét</Text>
          </View>
        </View>

        {/* INFO SECTION */}
        <View style={styles.infoSection}>
          {profile?.bankName && (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color="#8E7AB5" />
              <View style={styles.infoTextColumn}>
                <Text style={styles.infoLabel}>Ngân hàng</Text>
                <Text style={styles.infoValue}>
                  {profile?.bankName} - {profile?.bankBankAccountNumber || profile?.bankAccountNumber}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ACTION SECTION */}
        <View style={styles.actionSection}>
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
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ Shop</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Hình ảnh */}
              <View style={styles.modalImageRow}>
                <TouchableOpacity style={styles.modalImgBtn} onPress={handleChangeAvatar}>
                  <Image
                    source={{ uri: profile?.avatarUrl || "https://via.placeholder.com/80" }}
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalImgIconWrap}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                  <Text style={styles.modalImgLabel}>Avatar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalImgBtn} onPress={handleChangeCoverImage}>
                  <Image
                    source={{ uri: profile?.coverImageUrl || "https://via.placeholder.com/200x100" }}
                    style={styles.modalCover}
                  />
                  <View style={styles.modalImgIconWrap}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                  <Text style={styles.modalImgLabel}>Ảnh bìa</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Tên Shop</Text>
              <TextInput
                style={styles.input}
                value={editShopName}
                onChangeText={setEditShopName}
              />
              <Text style={styles.inputLabel}>Tiểu sử (Bio)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />
              <Text style={styles.inputLabel}>Ngân hàng</Text>
              <TextInput
                style={styles.input}
                value={editBankName}
                onChangeText={setEditBankName}
                placeholder="VD: Vietcombank, MB Bank..."
              />
              <Text style={styles.inputLabel}>Số tài khoản</Text>
              <TextInput
                style={styles.input}
                value={editBankAccountNumber}
                onChangeText={setEditBankAccountNumber}
                keyboardType="numeric"
              />
            </ScrollView>
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

  // HEADER
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    elevation: 2,
  },
  coverImageContainer: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E0D7FF",
  },
  coverImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E0D7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    marginTop: -45,
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#F4F1FF",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 12,
    zIndex: 2,
  },
  loadingAvatar: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#B59DFF",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 4,
  },
  bioHeader: {
    fontSize: 13,
    color: "#8E7AB5",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 18,
  },

  // WALLET CARD
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  walletLeft: { flexDirection: "row", alignItems: "center" },
  walletIconWrap: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  walletLabel: { fontSize: 12, color: "#8E7AB5", marginBottom: 2 },
  walletBalance: { fontSize: 18, fontWeight: "bold", color: "#28A745" },
  depositBalance: { fontSize: 12, color: "#FF9900", marginTop: 2 },

  // STATS
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    paddingVertical: 15,
    elevation: 1,
  },
  statItem: { flex: 1, alignItems: "center" },
  starRow: { flexDirection: "row", marginBottom: 4 },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statLabel: { fontSize: 12, color: "#8E7AB5", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0" },

  // INFO SECTION
  infoSection: {
    backgroundColor: "#fff",
    marginTop: 15,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
    elevation: 1,
  },
  bioRow: {
    paddingBottom: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bioText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    textAlign: "center",
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextColumn: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: "#A090C5", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#333" },

  // ACTION SECTION
  actionSection: {
    marginTop: 15,
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: "#fff",
    borderRadius: 15,
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

  // MODAL
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
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    marginBottom: 15,
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

  // MODAL IMAGE
  modalImageRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 20 },
  modalImgBtn: { alignItems: "center" },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: "#E0D7FF" },
  modalCover: { width: 160, height: 70, borderRadius: 10, borderWidth: 2, borderColor: "#E0D7FF" },
  modalImgIconWrap: {
    position: "absolute",
    bottom: 22,
    right: -4,
    backgroundColor: "#B59DFF",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalImgLabel: { fontSize: 13, color: "#666", marginTop: 6 },
});
