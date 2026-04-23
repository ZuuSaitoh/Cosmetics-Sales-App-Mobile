import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/src/api/axiosClient";
import { locationService } from "@/src/services/locationService";
import { serviceControllerService } from "@/src/services/serviceControllerService";

export default function ProviderServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [editForm, setEditForm] = useState({
    serviceName: "",
    serviceType: "PHOTOGRAPHER",
    description: "",
    slotDurationHours: "",
    pricePerSlot: "",
    equipmentDepreciationCost: "",
    depositAmount: "",
    providerId: "",
    minPrice: "",
    maxPrice: "",
  });
  const [selectedAreas, setSelectedAreas] = useState<{ city: string; district: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [pickerType, setPickerType] = useState<"city" | "district" | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isCoverImageError, setIsCoverImageError] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const res = await serviceControllerService.getServiceById(Number(id));
      if (res.data?.code === 0) {
        const detail = res.data.result || null;
        setService(detail);
      } else {
        setService(null);
      }
    } catch (error) {
      setService(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      value || 0,
    );
  const apiHost = API_BASE_URL.replace(/\/api$/, "");
  const resolveImageUrl = (uri?: string | null) => {
    if (!uri || typeof uri !== "string" || !uri.trim()) return "";
    if (uri.startsWith("http")) return uri;
    return `${apiHost}${uri.startsWith("/") ? uri : `/${uri}`}`;
  };
  const coverImageUri = resolveImageUrl(service?.imageUrls?.[0]);

  const areaLabels = Array.isArray(service?.areas)
    ? service.areas
        .map((area: any) => {
          if (typeof area === "string") return area;
          if (area?.district || area?.city) {
            return [area.district, area.city].filter(Boolean).join(", ");
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const filteredPickerData =
    pickerType === "city"
      ? provinces.filter((item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : districts.filter((item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()),
        );

  const openEditModal = () => {
    if (!service) return;
    setEditForm({
      serviceName: service.serviceName || "",
      serviceType: service.serviceType || "PHOTOGRAPHER",
      description: service.description || "",
      slotDurationHours: String(service.slotDurationHours || 0),
      pricePerSlot: String(service.pricePerSlot || 0),
      equipmentDepreciationCost: String(service.equipmentDepreciationCost || 0),
      depositAmount: String(service.depositAmount || 0),
      providerId: String(service.providerId || ""),
      minPrice: String(service.minPrice || 0),
      maxPrice: String(service.maxPrice || 0),
    });
    const mappedAreas = Array.isArray(service.areas)
      ? service.areas
          .map((area: any) => {
            if (typeof area === "string") return { city: "", district: area };
            return {
              city: area?.city || "",
              district: area?.district || "",
            };
          })
          .filter((item: any) => item.city || item.district)
      : [];
    setSelectedAreas(mappedAreas);
    setSelectedCity("");
    setSelectedDistrict("");
    setSelectedImages([]);
    setIsEditModalVisible(true);
  };

  const fetchProvinces = async () => {
    try {
      const data = await locationService.getProvinces();
      setProvinces(data || []);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách tỉnh/thành.");
    }
  };

  const handleSelectProvince = async (code: number, name: string) => {
    setSelectedCity(name);
    setSelectedDistrict("");
    setDistricts([]);
    setIsPickerVisible(false);
    setSearchText("");
    try {
      const data = await locationService.getProvinceDetail(code);
      if (Array.isArray(data.wards)) {
        setDistricts(data.wards);
      } else if (Array.isArray(data.districts)) {
        setDistricts(data.districts.flatMap((district: any) => district.wards || []));
      } else {
        setDistricts([]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách quận/huyện/phường.");
    }
  };

  const handleChangeField = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddArea = () => {
    if (!selectedDistrict.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập Quận/Huyện hoặc Phường/Xã.");
      return;
    }
    if (
      selectedAreas.some(
        (item) =>
          item.city === selectedCity.trim() &&
          item.district === selectedDistrict.trim(),
      )
    ) {
      Alert.alert("Thông báo", "Khu vực này đã tồn tại.");
      return;
    }
    setSelectedAreas((prev) => [
      ...prev,
      { city: selectedCity.trim(), district: selectedDistrict.trim() },
    ]);
    setSelectedDistrict("");
  };

  const handleRemoveArea = (idx: number) => {
    setSelectedAreas((prev) => prev.filter((_, index) => index !== idx));
  };

  const pickImagesFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Thiếu quyền", "Cần quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const mapped = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name:
          asset.fileName ||
          asset.uri.split("/").pop() ||
          `service_edit_${Date.now()}_${index}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      setSelectedImages((prev) => [...prev, ...mapped]);
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateService = async () => {
    if (!service?.id) return;
    if (!editForm.serviceName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên dịch vụ.");
      return;
    }
    if (Number(editForm.slotDurationHours) <= 0 || Number(editForm.pricePerSlot) <= 0) {
      Alert.alert("Lỗi", "Thời lượng slot và giá mỗi slot phải lớn hơn 0.");
      return;
    }
    if (!selectedAreas.length) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất 1 khu vực hoạt động.");
      return;
    }

    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append("serviceType", editForm.serviceType);
      formData.append("serviceName", editForm.serviceName.trim());
      formData.append("description", editForm.description.trim());
      formData.append("slotDurationHours", String(Number(editForm.slotDurationHours)));
      formData.append("pricePerSlot", String(Number(editForm.pricePerSlot)));
      formData.append(
        "equipmentDepreciationCost",
        String(Number(editForm.equipmentDepreciationCost || 0)),
      );
      formData.append("depositAmount", String(Number(editForm.depositAmount || 0)));
      formData.append("providerId", String(Number(editForm.providerId || 0)));
      formData.append("areas", JSON.stringify(selectedAreas));
      formData.append("minPrice", String(Number(editForm.minPrice || 0)));
      formData.append("maxPrice", String(Number(editForm.maxPrice || 0)));

      selectedImages.forEach((file) => {
        formData.append("albumFiles", file as any);
      });

      const res = await serviceControllerService.updateService(Number(service.id), formData);
      if (res.data?.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật dịch vụ.");
        setIsEditModalVisible(false);
        fetchDetail();
      } else {
        Alert.alert("Lỗi", res.data?.message || "Không thể cập nhật dịch vụ.");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể cập nhật dịch vụ.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#8E7AB5" }}>Không tìm thấy dịch vụ.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {coverImageUri && !isCoverImageError ? (
          <Image
            source={{ uri: coverImageUri }}
            style={styles.coverImage}
            onError={() => setIsCoverImageError(true)}
          />
        ) : (
          <View style={styles.coverImagePlaceholder}>
            <Ionicons name="image-outline" size={34} color="#B59DFF" />
            <Text style={styles.coverImagePlaceholderText}>Chưa có ảnh dịch vụ</Text>
          </View>
        )}
        <Text style={styles.serviceName}>{service.serviceName}</Text>
        <Text style={styles.serviceType}>{String(service.serviceType || "").replace("_", " ")}</Text>
        <Text style={styles.description}>{service.description || "Không có mô tả."}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Giá mỗi slot</Text>
            <Text style={styles.metaValue}>{formatPrice(service.pricePerSlot)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Thời lượng slot</Text>
            <Text style={styles.metaValue}>{service.slotDurationHours || 0} giờ</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Tiền cọc</Text>
            <Text style={styles.metaValue}>{formatPrice(service.depositAmount)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Khấu hao thiết bị</Text>
            <Text style={styles.metaValue}>
              {formatPrice(service.equipmentDepreciationCost)}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Giá tối thiểu</Text>
            <Text style={styles.metaValue}>{formatPrice(service.minPrice)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Giá tối đa</Text>
            <Text style={styles.metaValue}>{formatPrice(service.maxPrice)}</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Khu vực hoạt động</Text>
        <View style={styles.areaWrap}>
          {areaLabels.length > 0 ? (
            areaLabels.map((area: string, idx: number) => (
              <View key={`${area}-${idx}`} style={styles.areaChip}>
                <Text style={styles.areaChipText}>{area}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.description}>Chưa cập nhật khu vực.</Text>
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Chỉnh sửa dịch vụ</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa dịch vụ</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4A3B6B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên dịch vụ</Text>
              <TextInput
                style={styles.input}
                value={editForm.serviceName}
                onChangeText={(v) => handleChangeField("serviceName", v)}
              />

              <Text style={styles.inputLabel}>Loại dịch vụ</Text>
              <TextInput
                style={styles.input}
                value={editForm.serviceType}
                onChangeText={(v) => handleChangeField("serviceType", v)}
              />

              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                value={editForm.description}
                onChangeText={(v) => handleChangeField("description", v)}
              />

              <Text style={styles.inputLabel}>Thời lượng mỗi slot (giờ)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.slotDurationHours}
                onChangeText={(v) => handleChangeField("slotDurationHours", v)}
              />

              <Text style={styles.inputLabel}>Giá mỗi slot (VND)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.pricePerSlot}
                onChangeText={(v) => handleChangeField("pricePerSlot", v)}
              />

              <Text style={styles.inputLabel}>Khấu hao thiết bị (VND)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.equipmentDepreciationCost}
                onChangeText={(v) => handleChangeField("equipmentDepreciationCost", v)}
              />

              <Text style={styles.inputLabel}>Tiền cọc (VND)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.depositAmount}
                onChangeText={(v) => handleChangeField("depositAmount", v)}
              />

              <Text style={styles.inputLabel}>Giá tối thiểu</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.minPrice}
                onChangeText={(v) => handleChangeField("minPrice", v)}
              />

              <Text style={styles.inputLabel}>Giá tối đa</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={editForm.maxPrice}
                onChangeText={(v) => handleChangeField("maxPrice", v)}
              />

              <Text style={styles.inputLabel}>Khu vực hoạt động</Text>
              <TouchableOpacity
                style={styles.pickerFake}
                onPress={async () => {
                  if (!provinces.length) await fetchProvinces();
                  setPickerType("city");
                  setSearchText("");
                  setIsPickerVisible(true);
                }}
              >
                <Text style={{ color: selectedCity ? "#333" : "#A090C5" }}>
                  {selectedCity || "Chọn Tỉnh/Thành phố"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B59DFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerFake, !districts.length && { opacity: 0.5 }]}
                disabled={!districts.length}
                onPress={() => {
                  setPickerType("district");
                  setSearchText("");
                  setIsPickerVisible(true);
                }}
              >
                <Text style={{ color: selectedDistrict ? "#333" : "#A090C5" }}>
                  {selectedDistrict || "Chọn Quận/Huyện/Phường/Xã"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B59DFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addAreaBtn} onPress={handleAddArea}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.addAreaBtnText}>Thêm khu vực</Text>
              </TouchableOpacity>
              <View style={styles.areaChipWrap}>
                {selectedAreas.map((area, idx) => (
                  <View key={`${area.city}-${area.district}-${idx}`} style={styles.areaChip}>
                    <Text style={styles.areaChipText}>
                      {[area.district, area.city].filter(Boolean).join(", ")}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveArea(idx)}>
                      <Ionicons name="close-circle" size={16} color="#8E7AB5" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Text style={styles.inputLabel}>Album ảnh mới</Text>
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
              style={[styles.submitBtn, isUpdating && { opacity: 0.7 }]}
              onPress={handleUpdateService}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>
              {pickerType === "city"
                ? "Chọn Tỉnh/Thành phố"
                : "Chọn Quận/Huyện/Phường/Xã"}
            </Text>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={
                pickerType === "city"
                  ? "Tìm tỉnh/thành phố..."
                  : "Tìm quận/huyện/phường/xã..."
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
                      setSelectedDistrict(item.name);
                      setIsPickerVisible(false);
                      setSearchText("");
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
                setSearchText("");
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
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  coverImage: { width: "100%", height: 240, borderRadius: 12, marginBottom: 14 },
  coverImagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: "#F2EEFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  coverImagePlaceholderText: {
    color: "#8E7AB5",
    fontSize: 13,
    fontWeight: "600",
  },
  serviceName: { fontSize: 21, fontWeight: "800", color: "#4A3B6B" },
  serviceType: {
    marginTop: 4,
    fontSize: 13,
    color: "#8E7AB5",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  description: { fontSize: 14, color: "#666", lineHeight: 21 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  metaBox: {
    flex: 1,
    backgroundColor: "#FAF9FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    borderRadius: 10,
    padding: 10,
  },
  metaLabel: { fontSize: 12, color: "#888" },
  metaValue: { fontSize: 14, color: "#4A3B6B", fontWeight: "700", marginTop: 4 },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#4A3B6B",
  },
  areaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  areaChip: {
    backgroundColor: "#F4F1FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  areaChipText: { color: "#6B5B91", fontSize: 12, fontWeight: "600" },
  editBtn: {
    marginTop: 12,
    backgroundColor: "#8E7AB5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
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
    marginTop: 8,
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
