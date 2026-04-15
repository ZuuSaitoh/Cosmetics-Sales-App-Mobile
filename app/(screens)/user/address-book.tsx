import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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
import axiosClient from "../../api/axiosClient";

export default function AddressBookScreen() {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  // Danh sách từ API
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  // Modal quản lý việc chọn
  const [pickerType, setPickerType] = useState<"city" | "ward" | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredPickerData =
    pickerType === "city"
      ? provinces.filter((item: any) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : wards.filter((item: any) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()),
        );

  // --- FORM DỮ LIỆU ĐẦY ĐỦ THEO THAM KHẢO ---
  const [formData, setFormData] = useState({
    receiverName: "", // Tên người nhận
    phone: "", // Số điện thoại
    addressName: "", // Tên địa chỉ (Nhà, Công ty...)
    city: "", // Tỉnh/Thành phố
    ward: "", // Phường/Xã
    detailAddress: "", // Số nhà, tên đường
  });

  useEffect(() => {
    getUserIdAndFetch();
  }, []);

  useEffect(() => {
    // 1. Lấy danh sách Tỉnh/Thành ngay khi mở app
    const fetchProvinces = async () => {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/v2/p");
        const data = await res.json();
        setProvinces(data);
      } catch (err) {
        console.error("Lỗi lấy Tỉnh:", err);
      }
    };
    fetchProvinces();
  }, []);

  // 2. Khi bạn chọn Tỉnh -> Gọi lấy Phường/Xã
  const handleSelectProvince = async (pCode: number, pName: string) => {
    setFormData({ ...formData, city: pName, ward: "", detailAddress: "" }); // Reset cấp dưới
    setWards([]);
    setIsPickerVisible(false);
    try {
      const res = await fetch(
        `https://provinces.open-api.vn/api/v2/p/${pCode}?depth=2`,
      );
      const data = await res.json();
      if (data.wards) {
        setWards(data.wards);
      } else if (data.districts) {
        setWards(
          data.districts.flatMap((district: any) => district.wards || []),
        );
      } else {
        setWards([]);
      }
    } catch (err) {
      console.error("Lỗi lấy Phường/Xã:", err);
    }
  };
  const getUserIdAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (token) {
        const decoded: any = jwtDecode(token);
        const uid = Number(decoded.sub);
        setUserId(uid);
        fetchAddresses(uid);
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin user:", err);
    }
  };

  const fetchAddresses = async (uid: number) => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(`/users/${uid}/addresses`);
      if (res.data.code === 0) setAddresses(res.data.result);
    } catch (err) {
      console.error("Lỗi tải địa chỉ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    // Kiểm tra các trường bắt buộc có dấu *
    if (!formData.receiverName || !formData.phone || !formData.detailAddress) {
      Alert.alert(
        "Thông báo",
        "Vui lòng điền đủ các trường có dấu (*) nha bạn!",
      );
      return;
    }

    try {
      // Gộp các thông tin địa chỉ thành một chuỗi hoặc gửi object tùy API Backend của bạn
      const payload = {
        ...formData,
        address: `${formData.detailAddress}, ${formData.ward}, ${formData.city}`,
        name: formData.receiverName,
      };

      const res = await axiosClient.post(`/users/${userId}/addresses`, payload);
      if (res.data.code === 0) {
        setIsModalVisible(false);
        setFormData({
          receiverName: "",
          phone: "",
          addressName: "",
          city: "",
          ward: "",
          detailAddress: "",
        });
        fetchAddresses(userId!);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lưu địa chỉ lúc này.");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Xác nhận", "Xóa địa chỉ này nhé bạn?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await axiosClient.delete(`/users/${userId}/addresses/${id}`);
          fetchAddresses(userId!);
        },
      },
    ]);
  };

  const renderAddressItem = ({ item }: { item: any }) => (
    <View style={styles.addressCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.addressName}>{item.name}</Text>
        <Text style={styles.addressPhone}>{item.phone}</Text>
        <Text style={styles.addressText}>{item.address}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#FF4D4D" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER TÍM CHUẨN */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sổ địa chỉ</Text>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderAddressItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có địa chỉ nào đâu bạn!</Text>
        }
      />

      {/* NÚT THÊM MÀU TÍM */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={styles.addBtnText}>Thêm địa chỉ mới</Text>
      </TouchableOpacity>

      {/* MODAL THEO FORM THAM KHẢO NHƯNG MÀU TÍM */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 90}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Thêm địa chỉ</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.inputLabel}>
                  Tên người nhận <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  placeholderTextColor="#A090C5"
                  value={formData.receiverName}
                  onChangeText={(t) =>
                    setFormData({ ...formData, receiverName: t })
                  }
                />

                <Text style={styles.inputLabel}>
                  Số điện thoại <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#A090C5"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                />

                <Text style={styles.inputLabel}>
                  Tên địa chỉ <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nhà, Công ty, Shop"
                  placeholderTextColor="#A090C5"
                  value={formData.addressName}
                  onChangeText={(t) =>
                    setFormData({ ...formData, addressName: t })
                  }
                />

                {/* Ô CHỌN TỈNH/THÀNH PHỐ */}
                <Text style={styles.inputLabel}>
                  Tỉnh/Thành phố <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.pickerFake}
                  onPress={() => {
                    setPickerType("city");
                    setSearchText("");
                    setIsPickerVisible(true);
                  }}
                >
                  <Text style={{ color: formData.city ? "#333" : "#A090C5" }}>
                    {formData.city || "Chọn Tỉnh/Thành phố"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#B59DFF" />
                </TouchableOpacity>

                {/* Ô CHỌN PHƯỜNG/XÃ (Chỉ hiện khi đã chọn Tỉnh) */}
                <Text style={styles.inputLabel}>
                  Phường/Xã <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.pickerFake, !wards.length && { opacity: 0.5 }]}
                  disabled={!wards.length}
                  onPress={() => {
                    setPickerType("ward");
                    setSearchText("");
                    setIsPickerVisible(true);
                  }}
                >
                  <Text style={{ color: formData.ward ? "#333" : "#A090C5" }}>
                    {formData.ward || "Chọn Phường/Xã"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#B59DFF" />
                </TouchableOpacity>

                {/* MODAL DANH SÁCH CHỌN */}
                <Modal
                  visible={isPickerVisible}
                  animationType="slide"
                  transparent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: "70%" }]}>
                      <Text style={styles.modalTitle}>
                        {pickerType === "city"
                          ? "Chọn Tỉnh/Thành"
                          : "Chọn Phường/Xã"}
                      </Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 12 }]}
                        placeholder={
                          pickerType === "city"
                            ? "Tìm tỉnh/thành phố..."
                            : "Tìm phường/xã..."
                        }
                        placeholderTextColor="#A090C5"
                        value={searchText}
                        onChangeText={setSearchText}
                      />
                      <FlatList
                        data={filteredPickerData}
                        keyExtractor={(item: any) => item.code.toString()}
                        ListEmptyComponent={
                          <Text style={styles.emptyText}>
                            Không tìm thấy kết quả
                          </Text>
                        }
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.listItem}
                            onPress={() => {
                              if (pickerType === "city") {
                                handleSelectProvince(item.code, item.name);
                                setSearchText("");
                              } else {
                                setFormData({ ...formData, ward: item.name });
                                setSearchText("");
                                setIsPickerVisible(false);
                              }
                            }}
                          >
                            <Text style={styles.listItemText}>{item.name}</Text>
                          </TouchableOpacity>
                        )}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setIsPickerVisible(false);
                          setSearchText("");
                        }}
                        style={styles.closeBtn}
                      >
                        <Text style={{ color: "#B59DFF", fontWeight: "bold" }}>
                          Đóng
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>

                <Text style={styles.inputLabel}>
                  Địa chỉ chi tiết <Text style={{ color: "red" }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Số nhà, tên đường"
                  placeholderTextColor="#A090C5"
                  multiline
                  value={formData.detailAddress}
                  onChangeText={(t) =>
                    setFormData({ ...formData, detailAddress: t })
                  }
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={{ color: "#8E7AB5" }}>Hủy bỏ</Text>
                </TouchableOpacity>
                {/* NÚT LƯU MÀU TÍM CHUẨN */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAddAddress}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    color: "#4A3B6B",
  },

  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    elevation: 2,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginBottom: 4,
  },
  addressPhone: { fontSize: 14, color: "#666", marginBottom: 2 },
  addressText: { fontSize: 14, color: "#8E7AB5" },

  addBtn: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#B59DFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
  },
  addBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 50 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#4A3B6B",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A3B6B",
    marginBottom: 8,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: "#F9F9FF",
  },
  pickerFake: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: "#F9F9FF",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 15,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  submitBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  listItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFFF",
  },
  listItemText: {
    fontSize: 15,
    color: "#4A3B6B",
  },
  closeBtn: {
    marginTop: 20,
    alignItems: "center",
    padding: 10,
  },
});
