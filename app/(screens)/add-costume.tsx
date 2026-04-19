import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { costumeService } from "@/src/services/costumeService";
import { providerService } from "@/src/services/providerService";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Freesize"];

const PURPOSES = ["test", "shoot", "event", "festival"] as const;
type Purpose = typeof PURPOSES[number];

interface Accessory {
  id: string;
  name: string;
  description: string;
  price: string;
  isRequired: boolean;
}

interface Surcharge {
  id: string;
  name: string;
  description: string;
  price: string;
}

export default function AddCostumeScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("Freesize");
  const [numberOfItems, setNumberOfItems] = useState("1");
  const [pricePerDay, setPricePerDay] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [rentDiscount, setRentDiscount] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  // Step 2 state
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [purposePrices, setPurposePrices] = useState<Record<Purpose, string>>({
    test: "",
    shoot: "",
    event: "",
    festival: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image picker
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImages(result.assets);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên trang phục.");
      return false;
    }
    if (!pricePerDay || Number(pricePerDay) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá thuê hợp lệ.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // Accessory helpers
  const addAccessory = () => {
    setAccessories((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", description: "", price: "", isRequired: false },
    ]);
  };

  const removeAccessory = (id: string) => {
    setAccessories((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAccessory = (id: string, field: keyof Accessory, value: any) => {
    setAccessories((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  };

  // Surcharge helpers
  const addSurcharge = () => {
    setSurcharges((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", description: "", price: "" },
    ]);
  };

  const removeSurcharge = (id: string) => {
    setSurcharges((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSurcharge = (id: string, field: keyof Surcharge, value: string) => {
    setSurcharges((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const providerRes = await providerService.getByUser(userId);
      if (providerRes.data.code !== 0 || !providerRes.data.result) {
        Alert.alert("Lỗi", "Không tìm thấy hồ sơ Shop.");
        return;
      }
      const providerId = providerRes.data.result.id;

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("size", size);
      formData.append("numberOfItems", String(Number(numberOfItems) || 1));
      formData.append("pricePerDay", String(Number(pricePerDay)));
      formData.append("depositAmount", String(Number(depositAmount) || 0));
      formData.append("rentDiscount", String(Number(rentDiscount) || 0));
      formData.append("providerId", String(providerId));

      // Accessories JSON — chỉ gửi name + price như backend expect
      const accessoriesData = accessories
        .filter((a) => a.name.trim())
        .map((a) => ({
          name: a.name,
          price: Number(a.price) || 0,
        }));
      formData.append("accessories", JSON.stringify(accessoriesData));

      // Surcharges JSON — chỉ gửi name + price
      const surchargesData = surcharges
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name,
          price: Number(s.price) || 0,
        }));
      formData.append("surcharges", JSON.stringify(surchargesData));

      // Per-purpose prices — gửi đúng key "rentalOptions" như backend expect
      const rentalOptionsData = Object.entries(purposePrices).map(([pName, price]) => ({
        name: pName,
        price: Number(price) || 0,
      }));
      formData.append("rentalOptions", JSON.stringify(rentalOptionsData));

      console.log("=== PAYLOAD DEBUG ===");
      console.log("accessories:", JSON.stringify(accessoriesData));
      console.log("surcharges:", JSON.stringify(surchargesData));
      console.log("rentalOptions:", JSON.stringify(rentalOptionsData));

      images.forEach((asset, index) => {
        const uri = asset.uri;
        const filename = uri.split("/").pop() || `image_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("imageFiles", { uri, name: filename, type } as any);
      });

      const res = await costumeService.create(formData as unknown as Record<string, unknown>);

      console.log("=== CREATE RESPONSE ===");
      console.log(JSON.stringify(res.data, null, 2));

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Đăng trang phục thành công!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Lỗi", res.data.message || "Không thể đăng trang phục.");
      }
    } catch (error) {
      console.error("Lỗi đăng trang phục:", error);
      Alert.alert("Lỗi", "Đăng trang phục thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <>
      {/* ẢNH TRANG PHỤC */}
      <Text style={styles.label}>Ảnh trang phục</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
        <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
          <Ionicons name="camera-outline" size={30} color="#B59DFF" />
          <Text style={styles.addImageText}>Thêm ảnh</Text>
        </TouchableOpacity>
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrap}>
            <Image source={{ uri: img.uri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeImgBtn}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* TÊN */}
      <Text style={styles.label}>Tên trang phục <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="VD: Áo corset anime Genshin"
        placeholderTextColor="#A090C5"
      />

      {/* MÔ TẢ */}
      <Text style={styles.label}>Mô tả chi tiết</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Mô tả tình trạng, chi tiết trang phục..."
        placeholderTextColor="#A090C5"
        multiline
      />

      {/* SIZE & SỐ LƯỢNG */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Size</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowSizeDropdown(!showSizeDropdown)}
          >
            <Text style={styles.dropdownText}>{size}</Text>
            <Ionicons name="chevron-down" size={18} color="#8E7AB5" />
          </TouchableOpacity>
          {showSizeDropdown && (
            <View style={styles.dropdownList}>
              {SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSize(s);
                    setShowSizeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.label}>Số lượng</Text>
          <TextInput
            style={styles.input}
            value={numberOfItems}
            onChangeText={setNumberOfItems}
            placeholder="1"
            placeholderTextColor="#A090C5"
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* GIÁ THUÊ */}
      <Text style={styles.label}>Giá thuê/ngày <Text style={styles.required}>*</Text></Text>
      <View style={styles.priceWrap}>
        <TextInput
          style={styles.priceInput}
          value={pricePerDay}
          onChangeText={setPricePerDay}
          placeholder="0"
          placeholderTextColor="#A090C5"
          keyboardType="numeric"
        />
        <Text style={styles.priceUnit}>đ / ngày</Text>
      </View>

      {/* TIỀN CỌC */}
      <Text style={styles.label}>Tiền cọc</Text>
      <View style={styles.priceWrap}>
        <TextInput
          style={styles.priceInput}
          value={depositAmount}
          onChangeText={setDepositAmount}
          placeholder="0"
          placeholderTextColor="#A090C5"
          keyboardType="numeric"
        />
        <Text style={styles.priceUnit}>đ</Text>
      </View>

      {/* GIẢM GIÁ */}
      <Text style={styles.label}>Giảm giá (%)</Text>
      <View style={styles.priceWrap}>
        <TextInput
          style={styles.priceInput}
          value={rentDiscount}
          onChangeText={setRentDiscount}
          placeholder="0"
          placeholderTextColor="#A090C5"
          keyboardType="numeric"
        />
        <Text style={styles.priceUnit}>%</Text>
      </View>
    </>
  );

  const PURPOSE_LABELS: Record<Purpose, string> = {
    test: "Test",
    shoot: "Shoot",
    event: "Sự kiện",
    festival: "Festival",
  };

  const renderStep2 = () => (
    <>
      {/* GIÁ THEO MỤC ĐÍCH */}
      <Text style={styles.sectionTitle}>Giá theo mục đích thuê</Text>
      <View style={styles.card}>
        {PURPOSES.map((p) => (
          <View key={p} style={styles.purposeRow}>
            <Text style={styles.purposeLabel}>{PURPOSE_LABELS[p]}</Text>
            <View style={styles.purposeInputWrap}>
              <TextInput
                style={styles.purposePriceInput}
                value={purposePrices[p]}
                onChangeText={(v) =>
                  setPurposePrices((prev) => ({ ...prev, [p]: v }))
                }
                placeholder="0"
                placeholderTextColor="#A090C5"
                keyboardType="numeric"
              />
              <Text style={styles.purposeUnit}>đ/ngày</Text>
            </View>
          </View>
        ))}
      </View>

      {/* PHỤ KIỆN */}
      <Text style={styles.sectionTitle}>Phụ kiện đi kèm</Text>
      <View style={styles.card}>
        {accessories.map((acc, idx) => (
          <View key={acc.id} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIndex}>Phụ kiện {idx + 1}</Text>
              <TouchableOpacity onPress={() => removeAccessory(acc.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.itemInput}
              value={acc.name}
              onChangeText={(v) => updateAccessory(acc.id, "name", v)}
              placeholder="Tên phụ kiện"
              placeholderTextColor="#A090C5"
            />
            <TextInput
              style={[styles.itemInput, { marginTop: 8 }]}
              value={acc.description}
              onChangeText={(v) => updateAccessory(acc.id, "description", v)}
              placeholder="Mô tả"
              placeholderTextColor="#A090C5"
            />
            <View style={[styles.priceWrap, { marginTop: 8 }]}>
              <TextInput
                style={styles.priceInput}
                value={acc.price}
                onChangeText={(v) => updateAccessory(acc.id, "price", v)}
                placeholder="0"
                placeholderTextColor="#A090C5"
                keyboardType="numeric"
              />
              <Text style={styles.priceUnit}>đ</Text>
            </View>
            <TouchableOpacity
              style={styles.requiredToggle}
              onPress={() => updateAccessory(acc.id, "isRequired", !acc.isRequired)}
            >
              <View style={[styles.checkbox, acc.isRequired && styles.checkboxActive]}>
                {acc.isRequired && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.requiredLabel}>Bắt buộc</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addItemBtn} onPress={addAccessory}>
          <Ionicons name="add-circle-outline" size={20} color="#B59DFF" />
          <Text style={styles.addItemBtnText}>Thêm phụ kiện</Text>
        </TouchableOpacity>
      </View>

      {/* PHỤ PHÍ */}
      <Text style={styles.sectionTitle}>Phụ phí</Text>
      <View style={styles.card}>
        {surcharges.map((sur, idx) => (
          <View key={sur.id} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIndex}>Phụ phí {idx + 1}</Text>
              <TouchableOpacity onPress={() => removeSurcharge(sur.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.itemInput}
              value={sur.name}
              onChangeText={(v) => updateSurcharge(sur.id, "name", v)}
              placeholder="Tên phụ phí"
              placeholderTextColor="#A090C5"
            />
            <TextInput
              style={[styles.itemInput, { marginTop: 8 }]}
              value={sur.description}
              onChangeText={(v) => updateSurcharge(sur.id, "description", v)}
              placeholder="Mô tả"
              placeholderTextColor="#A090C5"
            />
            <View style={[styles.priceWrap, { marginTop: 8 }]}>
              <TextInput
                style={styles.priceInput}
                value={sur.price}
                onChangeText={(v) => updateSurcharge(sur.id, "price", v)}
                placeholder="0"
                placeholderTextColor="#A090C5"
                keyboardType="numeric"
              />
              <Text style={styles.priceUnit}>đ</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addItemBtn} onPress={addSurcharge}>
          <Ionicons name="add-circle-outline" size={20} color="#B59DFF" />
          <Text style={styles.addItemBtnText}>Thêm phụ phí</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 2) {
              setStep(1);
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? "Đăng trang phục mới" : "Thêm phụ kiện & phụ phí"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
        <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {step === 1 ? renderStep1() : renderStep2()}
        </ScrollView>

        <View style={styles.bottomBar}>
          {step === 1 ? (
            <TouchableOpacity style={styles.submitBtn} onPress={handleNextStep}>
              <Text style={styles.submitBtnText}>Tiếp tục</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backStepBtnText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1, marginLeft: 12 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Đăng trang phục</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D0C4E9",
  },
  stepDotActive: { backgroundColor: "#B59DFF" },
  stepLine: { width: 40, height: 2, backgroundColor: "#D0C4E9" },
  stepLineActive: { backgroundColor: "#B59DFF" },
  scrollContent: { padding: 20, paddingBottom: 120 },
  label: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8, marginTop: 15 },
  required: { color: "#DC3545" },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FBFBFF",
    color: "#333",
  },
  imageRow: { flexDirection: "row", marginBottom: 5 },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAF9FF",
  },
  addImageText: { fontSize: 11, color: "#B59DFF", marginTop: 4, fontWeight: "600" },
  imageWrap: { marginLeft: 10, position: "relative" },
  previewImage: { width: 80, height: 80, borderRadius: 12 },
  removeImgBtn: { position: "absolute", top: -8, right: -8 },
  row: { flexDirection: "row", marginTop: 0 },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FBFBFF",
  },
  dropdownText: { fontSize: 15, color: "#333" },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    marginTop: 6,
    overflow: "hidden",
    zIndex: 999,
    elevation: 5,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F5F1FF" },
  dropdownItemText: { fontSize: 14, color: "#333" },
  priceWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 12,
    overflow: "hidden",
  },
  priceInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FBFBFF",
    color: "#333",
  },
  priceUnit: { paddingHorizontal: 14, color: "#8E7AB5", fontWeight: "600" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  purposeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A3B6B",
    width: 80,
  },
  purposeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    overflow: "hidden",
    flex: 1,
  },
  purposePriceInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FBFBFF",
    color: "#333",
  },
  purposeUnit: { paddingHorizontal: 10, color: "#8E7AB5", fontWeight: "600", fontSize: 13 },
  itemRow: { paddingVertical: 12 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: "#F0EEFF" },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemIndex: { fontSize: 13, fontWeight: "700", color: "#8E7AB5" },
  itemInput: {
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FBFBFF",
    color: "#333",
  },
  requiredToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D0C4E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: "#B59DFF", borderColor: "#B59DFF" },
  requiredLabel: { fontSize: 13, color: "#8E7AB5", fontWeight: "600" },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0EEFF",
    marginTop: 4,
    gap: 6,
  },
  addItemBtnText: { fontSize: 14, color: "#B59DFF", fontWeight: "700" },
  bottomBar: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  bottomRow: { flexDirection: "row" },
  submitBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 3,
  },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  backStepBtn: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
  },
  backStepBtnText: { color: "#8E7AB5", fontSize: 17, fontWeight: "bold" },
});