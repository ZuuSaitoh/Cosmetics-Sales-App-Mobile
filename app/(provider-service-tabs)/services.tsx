import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { locationService } from "@/src/services/locationService";
import { providerService } from "@/src/services/providerService";
import { serviceControllerService } from "@/src/services/serviceControllerService";
import { uploadService } from "@/src/services/uploadService";

interface ProviderServiceItem {
  id: number;
  serviceName: string;
  serviceType: string;
  description: string;
  slotDurationHours: number;
  pricePerSlot: number;
  equipmentDepreciationCost: number;
  status: string;
  depositAmount: number;
  providerId: number;
  areas: string[];
  imageUrls: string[];
  minPrice: number;
  maxPrice: number;
}

type ServiceAreaItem = {
  city: string;
  district: string;
};

export default function ProviderServicesScreen() {
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [pickerType, setPickerType] = useState<"city" | "ward" | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [areaSearchText, setAreaSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<ServiceAreaItem[]>([]);
  const [selectedImages, setSelectedImages] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [createForm, setCreateForm] = useState({
    serviceName: "",
    serviceType: "PHOTOGRAPHER",
    description: "",
    slotDurationHours: "",
    pricePerSlot: "",
    equipmentDepreciationCost: "",
    depositAmount: "",
    areas: "",
  });

  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, []),
  );

  const fetchServices = async () => {
    try {
      setIsLoading(true);

      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        setServices([]);
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = Number(decoded.userId || decoded.sub);
      if (!userId) {
        setServices([]);
        return;
      }

      const providerRes = await providerService.getByUser(userId);
      const currentProviderId = providerRes.data?.result?.id;
      if (!currentProviderId) {
        setServices([]);
        setProviderId(null);
        return;
      }
      setProviderId(Number(currentProviderId));

      const res = await serviceControllerService.getServicesByProvider(
        Number(currentProviderId),
      );
      if (res.data?.code === 0) {
        setServices(res.data.result || []);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách dịch vụ provider:", error);
      setServices([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      value || 0,
    );

  const getTypeLabel = (type: string) => {
    if (type === "PHOTOGRAPHER") return "📸 Thợ ảnh";
    if (type === "EVENT_STAFF") return "🎪 Staff sự kiện";
    return type || "Không xác định";
  };

  const handleChangeCreateField = (field: keyof typeof createForm, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const filteredPickerData =
    pickerType === "city"
      ? provinces.filter((item) =>
          item.name.toLowerCase().includes(areaSearchText.toLowerCase()),
        )
      : wards.filter((item) =>
          item.name.toLowerCase().includes(areaSearchText.toLowerCase()),
        );

  const resetCreateForm = () => {
    setCreateForm({
      serviceName: "",
      serviceType: "PHOTOGRAPHER",
      description: "",
      slotDurationHours: "",
      pricePerSlot: "",
      equipmentDepreciationCost: "",
      depositAmount: "",
      areas: "",
    });
    setSelectedCity("");
    setSelectedWard("");
    setSelectedAreas([]);
    setSelectedImages([]);
  };

  const fetchProvinces = async () => {
    try {
      const data = await locationService.getProvinces();
      setProvinces(data || []);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách tỉnh/thành.");
    }
  };

  const handleOpenCreateModal = async () => {
    setIsCreateModalVisible(true);
    if (!provinces.length) {
      await fetchProvinces();
    }
  };

  const handleSelectProvince = async (code: number, name: string) => {
    setSelectedCity(name);
    setSelectedWard("");
    setWards([]);
    setIsPickerVisible(false);
    setAreaSearchText("");
    try {
      const data = await locationService.getProvinceDetail(code);
      if (Array.isArray(data.wards)) {
        setWards(data.wards);
      } else if (Array.isArray(data.districts)) {
        setWards(data.districts.flatMap((district: any) => district.wards || []));
      } else {
        setWards([]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách phường/xã.");
    }
  };

  const handleAddArea = () => {
    if (!selectedCity || !selectedWard) {
      Alert.alert("Lỗi", "Vui lòng chọn Tỉnh/Thành và Phường/Xã.");
      return;
    }
    if (
      selectedAreas.some(
        (item) => item.city === selectedCity && item.district === selectedWard,
      )
    ) {
      Alert.alert("Thông báo", "Khu vực này đã được thêm.");
      return;
    }
    setSelectedAreas((prev) => [
      ...prev,
      {
        city: selectedCity,
        district: selectedWard,
      },
    ]);
  };

  const handleRemoveArea = (area: ServiceAreaItem) => {
    setSelectedAreas((prev) =>
      prev.filter(
        (item) => !(item.city === area.city && item.district === area.district),
      ),
    );
  };

  const pickImagesFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Thiếu quyền", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const mapped = result.assets.map((asset, index) => {
        const name = asset.fileName || asset.uri.split("/").pop() || `service_${Date.now()}_${index}.jpg`;
        const type = asset.mimeType || "image/jpeg";
        return {
          uri: asset.uri,
          name,
          type,
        };
      });
      setSelectedImages((prev) => [...prev, ...mapped]);
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateService = async () => {
    if (!providerId) {
      Alert.alert("Lỗi", "Không tìm thấy hồ sơ provider.");
      return;
    }
    if (!createForm.serviceName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên dịch vụ.");
      return;
    }
    if (!createForm.slotDurationHours || Number(createForm.slotDurationHours) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập thời lượng slot hợp lệ.");
      return;
    }
    if (!createForm.pricePerSlot || Number(createForm.pricePerSlot) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá mỗi slot hợp lệ.");
      return;
    }

    try {
      setIsCreating(true);
      const uploadedImageUrls =
        selectedImages.length > 0
          ? await Promise.all(
              selectedImages.map(async (img) => {
                const uploadRes = await uploadService.uploadSingleImage(img);
                return uploadRes.data?.result || "";
              }),
            )
          : [];

      const manualAreas = createForm.areas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const areasPayload: ServiceAreaItem[] =
        selectedAreas.length > 0
          ? selectedAreas
          : manualAreas.map((name) => ({
              city: selectedCity || "Khác",
              district: name,
            }));
      const imageUrls = uploadedImageUrls.filter(Boolean);

      const formData = new FormData();
      formData.append("serviceName", createForm.serviceName.trim());
      formData.append("serviceType", createForm.serviceType);
      formData.append("description", createForm.description.trim());
      formData.append("slotDurationHours", String(Number(createForm.slotDurationHours)));
      formData.append("pricePerSlot", String(Number(createForm.pricePerSlot)));
      formData.append(
        "equipmentDepreciationCost",
        String(Number(createForm.equipmentDepreciationCost || 0)),
      );
      formData.append("depositAmount", String(Number(createForm.depositAmount || 0)));
      formData.append("providerId", String(providerId));
      formData.append("areas", JSON.stringify(areasPayload));
      formData.append("imageUrls", JSON.stringify(imageUrls));

      const res = await serviceControllerService.createService(formData);
      if (res.data?.code === 0) {
        Alert.alert("Thành công", "Đã tạo dịch vụ mới.");
        setIsCreateModalVisible(false);
        resetCreateForm();
        fetchServices();
      } else {
        Alert.alert("Lỗi", res.data?.message || "Không thể tạo dịch vụ.");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể tạo dịch vụ.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dịch vụ đã đăng</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleOpenCreateModal}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>Tạo dịch vụ</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchServices();
              }}
              colors={["#B59DFF"]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                {item.imageUrls?.[0] ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={styles.serviceImage} />
                ) : (
                  <View style={[styles.serviceImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color="#B59DFF" />
                  </View>
                )}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {item.serviceName}
                  </Text>
                  <Text style={styles.serviceType}>{getTypeLabel(item.serviceType)}</Text>
                  <Text style={styles.serviceStatus}>Trạng thái: {item.status}</Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {item.description || "Không có mô tả."}
              </Text>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Giá / slot</Text>
                  <Text style={styles.priceValue}>{formatPrice(item.pricePerSlot)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.priceLabel}>Tiền cọc</Text>
                  <Text style={styles.priceValue}>{formatPrice(item.depositAmount)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(provider-service-tabs)/service-detail" as any,
                    params: { id: item.id },
                  })
                }
              >
                <Text style={styles.detailBtnText}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={60} color="#D4C4F0" />
              <Text style={styles.emptyTitle}>Chưa có dịch vụ nào</Text>
              <Text style={styles.emptySubtitle}>
                Danh sách dịch vụ PHOTOGRAPH/EVENT STAFF sẽ hiển thị ở đây
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo dịch vụ mới</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4A3B6B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên dịch vụ *</Text>
              <TextInput
                style={styles.input}
                value={createForm.serviceName}
                onChangeText={(v) => handleChangeCreateField("serviceName", v)}
                placeholder="VD: Chụp ảnh concept anime"
              />

              <Text style={styles.inputLabel}>Loại dịch vụ *</Text>
              <View style={styles.typeRow}>
                {[
                  { key: "PHOTOGRAPHER", label: "Thợ ảnh" },
                  { key: "EVENT_STAFF", label: "Event staff" },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeChip,
                      createForm.serviceType === type.key && styles.typeChipActive,
                    ]}
                    onPress={() => handleChangeCreateField("serviceType", type.key)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        createForm.serviceType === type.key && styles.typeChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={createForm.description}
                onChangeText={(v) => handleChangeCreateField("description", v)}
                placeholder="Mô tả chi tiết dịch vụ..."
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Thời lượng mỗi slot (giờ) *</Text>
              <TextInput
                style={styles.input}
                value={createForm.slotDurationHours}
                onChangeText={(v) => handleChangeCreateField("slotDurationHours", v)}
                keyboardType="numeric"
                placeholder="VD: 2"
              />

              <Text style={styles.inputLabel}>Giá mỗi slot (VND) *</Text>
              <TextInput
                style={styles.input}
                value={createForm.pricePerSlot}
                onChangeText={(v) => handleChangeCreateField("pricePerSlot", v)}
                keyboardType="numeric"
                placeholder="VD: 500000"
              />

              <Text style={styles.inputLabel}>Chi phí khấu hao thiết bị (VND)</Text>
              <TextInput
                style={styles.input}
                value={createForm.equipmentDepreciationCost}
                onChangeText={(v) =>
                  handleChangeCreateField("equipmentDepreciationCost", v)
                }
                keyboardType="numeric"
                placeholder="VD: 100000"
              />

              <Text style={styles.inputLabel}>Tiền cọc (VND)</Text>
              <TextInput
                style={styles.input}
                value={createForm.depositAmount}
                onChangeText={(v) => handleChangeCreateField("depositAmount", v)}
                keyboardType="numeric"
                placeholder="VD: 200000"
              />

              <Text style={styles.inputLabel}>Khu vực hoạt động</Text>
              <TouchableOpacity
                style={styles.pickerFake}
                onPress={() => {
                  setPickerType("city");
                  setAreaSearchText("");
                  setIsPickerVisible(true);
                }}
              >
                <Text style={{ color: selectedCity ? "#333" : "#A090C5" }}>
                  {selectedCity || "Chọn Tỉnh/Thành phố"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B59DFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerFake, !wards.length && { opacity: 0.5 }]}
                disabled={!wards.length}
                onPress={() => {
                  setPickerType("ward");
                  setAreaSearchText("");
                  setIsPickerVisible(true);
                }}
              >
                <Text style={{ color: selectedWard ? "#333" : "#A090C5" }}>
                  {selectedWard || "Chọn Phường/Xã"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B59DFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addAreaBtn} onPress={handleAddArea}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.addAreaBtnText}>Thêm khu vực</Text>
              </TouchableOpacity>

              <View style={styles.areaChipWrap}>
                {selectedAreas.map((area) => (
                  <View key={`${area.city}-${area.district}`} style={styles.areaChip}>
                    <Text style={styles.areaChipText}>
                      {area.district}, {area.city}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveArea(area)}>
                      <Ionicons name="close-circle" size={16} color="#8E7AB5" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Text style={styles.inputLabel}>Hoặc nhập nhanh (ngăn cách bằng dấu phẩy)</Text>
              <TextInput
                style={styles.input}
                value={createForm.areas}
                onChangeText={(v) => handleChangeCreateField("areas", v)}
                placeholder="VD: Quận 1, Quận 3, Bình Thạnh"
              />

              <Text style={styles.inputLabel}>Hình ảnh dịch vụ</Text>
              <TouchableOpacity style={styles.pickImageBtn} onPress={pickImagesFromLibrary}>
                <Ionicons name="images-outline" size={20} color="#B59DFF" />
                <Text style={styles.pickImageBtnText}>Chọn ảnh từ điện thoại</Text>
              </TouchableOpacity>

              <View style={styles.previewGrid}>
                {selectedImages.map((img, index) => (
                  <View key={`${img.uri}-${index}`} style={styles.previewItem}>
                    <Image source={{ uri: img.uri }} style={styles.previewImg} />
                    <TouchableOpacity
                      style={styles.removePreviewBtn}
                      onPress={() => removeSelectedImage(index)}
                    >
                      <Ionicons name="close-circle" size={18} color="#FF5A5F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, isCreating && { opacity: 0.7 }]}
              onPress={handleCreateService}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Tạo dịch vụ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>
              {pickerType === "city" ? "Chọn Tỉnh/Thành phố" : "Chọn Phường/Xã"}
            </Text>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              value={areaSearchText}
              onChangeText={setAreaSearchText}
              placeholder={
                pickerType === "city"
                  ? "Tìm tỉnh/thành phố..."
                  : "Tìm phường/xã..."
              }
              placeholderTextColor="#A090C5"
            />
            <FlatList
              data={filteredPickerData}
              keyExtractor={(item: any) => item.code.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    if (pickerType === "city") {
                      handleSelectProvince(item.code, item.name);
                    } else {
                      setSelectedWard(item.name);
                      setIsPickerVisible(false);
                      setAreaSearchText("");
                    }
                  }}
                >
                  <Text style={styles.listItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Không có dữ liệu phù hợp.</Text>
              }
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setIsPickerVisible(false);
                setAreaSearchText("");
              }}
            >
              <Text style={{ color: "#B59DFF", fontWeight: "700" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#4A3B6B" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B59DFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  createBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  listContainer: { padding: 15, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  topRow: { flexDirection: "row", marginBottom: 10 },
  serviceImage: { width: 72, height: 72, borderRadius: 10, marginRight: 12 },
  imagePlaceholder: {
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: { flex: 1, justifyContent: "center" },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 4 },
  serviceType: { fontSize: 12, color: "#8E7AB5", marginBottom: 2 },
  serviceStatus: { fontSize: 12, color: "#666" },
  description: { fontSize: 13, color: "#666", marginBottom: 10 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    paddingVertical: 10,
    marginBottom: 10,
  },
  priceLabel: { fontSize: 12, color: "#888" },
  priceValue: { fontSize: 15, fontWeight: "bold", color: "#B59DFF", marginTop: 2 },
  detailBtn: {
    backgroundColor: "#B59DFF",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  detailBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyContainer: { alignItems: "center", marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#4A3B6B", marginTop: 15 },
  emptySubtitle: {
    fontSize: 13,
    color: "#8E7AB5",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#4A3B6B" },
  inputLabel: {
    fontSize: 13,
    color: "#6B5B91",
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#333",
    backgroundColor: "#FAF9FF",
  },
  textArea: { minHeight: 82 },
  pickerFake: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FAF9FF",
    marginBottom: 8,
  },
  addAreaBtn: {
    marginTop: 2,
    backgroundColor: "#8E7AB5",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  addAreaBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  areaChipWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  areaChip: {
    backgroundColor: "#F4F1FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  areaChipText: { color: "#6B5B91", fontSize: 12, fontWeight: "600" },
  pickImageBtn: {
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FAF9FF",
  },
  pickImageBtnText: {
    color: "#6B5B91",
    fontWeight: "700",
    fontSize: 13,
  },
  previewGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewItem: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  removePreviewBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  typeChipActive: {
    borderColor: "#B59DFF",
    backgroundColor: "#F4F1FF",
  },
  typeChipText: { fontSize: 13, color: "#6B5B91", fontWeight: "600" },
  typeChipTextActive: { color: "#4A3B6B", fontWeight: "800" },
  submitBtn: {
    marginTop: 14,
    backgroundColor: "#B59DFF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  listItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFFF",
  },
  listItemText: {
    color: "#4A3B6B",
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 12,
    alignItems: "center",
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 14,
  },
});
