import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown"; // Import thư viện
import axiosClient from "../src/api/axiosClient";
import { providerService } from "@/src/services/providerService";
import { userService } from "@/src/services/userService";
import { walletService } from "@/src/services/walletService";

export default function ProviderProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
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
  const [banks, setBanks] = useState<any[]>([]);

  // 🚩 Tự động load lại mỗi khi quay về trang cá nhân
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchBanks();
    }, []),
  );

  const fetchBanks = async () => {
    try {
      const res = await axiosClient.get(
        "https://api.vietqr.io/v2/banks",
      );
      if (res.data.code === "00") {
        setBanks(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách ngân hàng:", error);
    }
  };

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
      const walletRes = await walletService.getByUser(uId);
      if (walletRes.data.code === 0) {
        setBalance(walletRes.data.result.balance || 0);
        setDepositBalance(walletRes.data.result.depositBalance || 0);
      }

      // Lấy thông tin provider
      const providerRes = await providerService.getByUser(uId);
      if (providerRes.data.code === 0 && providerRes.data.result) {
        const data = providerRes.data.result;
        setProfile(data);
        setProviderId(data.id);
        setEditShopName(data.shopName || "");
        setEditBio(data.bio || "");
        setEditBankName(data.bankName || "");
        setEditBankAccountNumber(data.bankAccountNumber || "");
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
    if (!providerId) return;

    setIsSaving(true);
    try {
      const payload = {
        shopName: editShopName,
        bio: editBio,
        bankName: editBankName,
        bankAccountNumber: editBankAccountNumber,
      };

      const response = await providerService.updateProfile(providerId, payload);
      if (response.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật hồ sơ Shop!");
        setProfile(response.data.result);
        setIsEditModalVisible(false);
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật profile:", error?.response?.data || error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || "Không thể cập nhật hồ sơ lúc này.",
      );
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

    if (!result.canceled && result.assets && userId) {
      setIsUpdatingAvatar(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "avatar.jpg";
        const formData = new FormData();
        formData.append("avatar", {
          uri: localUri,
          name: filename,
          type: "image/jpeg",
        } as any);

        const res = await userService.updateAvatar(userId, formData);

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh đại diện!");
          setProfile((prev: any) => ({ ...prev, avatarUrl: localUri }));
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

    if (!result.canceled && result.assets && userId) {
      setIsUploadingCover(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "cover.jpg";
        const formData = new FormData();
        formData.append("coverImage", {
          uri: localUri,
          name: filename,
          type: "image/jpeg",
        } as any);

        const res = await providerService.updateCoverImage(Number(providerId), formData);

        if (res.data.code === 0) {
          Alert.alert("Thành công", "Đã cập nhật ảnh bìa!");
          // 🚩 Đồng bộ biến với Backend (coverImage thay vì coverImageUrl nếu cần)
          setProfile((prev: any) => ({ ...prev, coverImageUrl: localUri }));
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
        {/* HEADER SECTION */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            activeOpacity={0.9}
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

          <View style={styles.avatarContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
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
                <View style={[StyleSheet.absoluteFill, styles.loadingAvatar]}>
                  <ActivityIndicator size="small" color="#B59DFF" />
                </View>
              )}
            </TouchableOpacity>
            {profile?.isVerified && ( // Dùng isVerified từ BE
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
              </View>
            )}
          </View>

          <Text style={styles.shopName}>{profile?.shopName || "Tên Shop"}</Text>
          <Text style={styles.bioHeader}>
            {profile?.bio || "Chào mừng bạn đến với CosMate!"}
          </Text>
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
            </View>
          </View>
        </View>

        {/* STATS SECTION */}
        <View style={styles.statsCard}>
          {/* Đánh giá sao */}
          <View style={styles.statItem}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  // Hiển thị sao đánh giá dựa trên totalRating
                  name={
                    s <= Math.round(profile?.totalRating || 0)
                      ? "star"
                      : "star-outline"
                  }
                  size={14}
                  color="#FFD700"
                />
              ))}
            </View>
            {/* 🚩 Hiển thị số lượng đánh giá thật */}
            <Text style={styles.statLabel}>
              {profile?.totalRating || 0} sao
            </Text>
          </View>

          <View style={styles.statDivider} />

          {/* Đơn hoàn thành */}
          <View style={styles.statItem}>
            {/* 🚩 Sử dụng completedOrders từ JSON */}
            <Text style={styles.statNumber}>
              {profile?.completedOrders || 0}
            </Text>
            <Text style={styles.statLabel}>Đơn hoàn thành</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Nhận xét */}
          <View style={styles.statItem}>
            {/* 🚩 Sử dụng totalReviews từ JSON */}
            <Text style={styles.statNumber}>{profile?.totalReviews || 0}</Text>
            <Text style={styles.statLabel}>Nhận xét</Text>
          </View>
        </View>

        {/* BANK INFO */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#8E7AB5" />
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Ngân hàng</Text>
              <Text style={styles.infoValue}>
                {profile?.bankName || "Chưa cập nhật"} -{" "}
                {profile?.bankAccountNumber || "123456789"}
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
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

      {/* MODAL CHỈNH SỬA HỒ SƠ */}
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
              />
              <Text style={styles.inputLabel}>Tiểu sử (Bio)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />
              <Text style={styles.inputLabel}>Tên Ngân hàng</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                data={banks}
                search
                maxHeight={300}
                labelField="name"
                valueField="id"
                placeholder="Chọn ngân hàng..."
                searchPlaceholder="Tìm kiếm tên ngân hàng..."
                value={editBankName}
                onChange={(item) => {
                  setEditBankName(item.shortName || item.name);
                }}
                renderLeftIcon={() => (
                  <Ionicons
                    style={styles.icon}
                    name="business-outline"
                    size={20}
                    color="#8E7AB5"
                  />
                )}
                renderItem={(item: any, selected: boolean) => (
                  <View style={[styles.bankItem, selected && styles.bankItemSelected]}>
                    <View style={styles.bankInfo}>
                      <Text style={styles.bankName}>{item.name}</Text>
                      <Text style={styles.bankCode}>{item.shortName}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark" size={18} color="#B59DFF" />}
                  </View>
                )}
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

  // HEADER & COVER FIX
  profileHeader: {
    backgroundColor: "#fff",
    paddingBottom: 25,
    width: "100%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  coverImageContainer: {
    width: "100%",
    height: 180, // 🚩 Chiều cao cố định chuẩn 16:9
    backgroundColor: "#E0D7FF",
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },
  coverImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  loadingOverlay: {
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  // AVATAR FIX
  avatarContainer: {
    marginTop: -55,
    alignItems: "center", // 🚩 Quan trọng: Căn giữa avatar
    marginBottom: 12,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    borderColor: "#fff",
    backgroundColor: "#F4F1FF",
  },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  verifiedBadge: {
    position: "absolute",
    bottom: 5,
    right: "35%",
    backgroundColor: "#fff",
    borderRadius: 12,
    zIndex: 5,
  },
  loadingAvatar: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
  },

  // TEXT INFO
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4A3B6B",
    textAlign: "center", // 🚩 Căn giữa text
    marginBottom: 6,
  },
  bioHeader: {
    fontSize: 14,
    color: "#8E7AB5",
    textAlign: "center", // 🚩 Căn giữa text
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // WALLET & STATS
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 15,
    padding: 18,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  walletLeft: { flexDirection: "row", alignItems: "center" },
  walletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  walletLabel: { fontSize: 13, color: "#8E7AB5", marginBottom: 4 },
  walletBalance: { fontSize: 20, fontWeight: "bold", color: "#28A745" },

  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 20,
    paddingVertical: 18,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  starRow: { flexDirection: "row", marginBottom: 6 },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statLabel: { fontSize: 12, color: "#8E7AB5", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0" },

  // INFO & ACTIONS
  infoSection: {
    backgroundColor: "#fff",
    marginTop: 15,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextColumn: { marginLeft: 15, flex: 1 },
  infoLabel: { fontSize: 12, color: "#A090C5", marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#333" },

  actionSection: {
    marginTop: 15,
    marginHorizontal: 20,
    marginBottom: 50,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  actionLeft: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  actionText: { fontSize: 16, fontWeight: "600", color: "#4A3B6B" },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 45,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#4A3B6B" },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    marginTop: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#FBFBFF",
    marginBottom: 20,
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  dropdown: {
    height: 55,
    borderColor: "#E0D7FF",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FBFBFF",
    marginBottom: 20,
  },
  icon: {
    marginRight: 10,
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#AAA",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: "#333",
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  bankItemSelected: {
    backgroundColor: "#F4F1FF",
  },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: "600", color: "#333" },
  bankCode: { fontSize: 12, color: "#8E7AB5", marginTop: 2 },
});
