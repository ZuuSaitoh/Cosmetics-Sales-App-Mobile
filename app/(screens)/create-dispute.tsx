import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

export default function CreateDisputeScreen() {
  const { orderId } = useLocalSearchParams();
  const [reason, setReason] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Thông báo", "Tối đa 5 hình minh chứng!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "evidence.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        const formData = new FormData();
        formData.append("file", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const res = await axiosClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.code === 0 && res.data.result?.url) {
          setImages((prev) => [...prev, res.data.result.url]);
        }
      } catch {
        Alert.alert("Lỗi", "Không thể upload ảnh.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do khiếu nại!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosClient.post(`/disputes?orderId=${orderId}`, {
        reason,
        files,
      });

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Đã gửi khiếu nại!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Lỗi", res.data.message || "Không thể gửi khiếu nại.");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể gửi khiếu nại lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khiếu nại đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* THÔNG BÁO */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={24} color="#FF9800" />
            <Text style={styles.noticeText}>
              Nếu phát hiện trang phục bị hư hỏng, không đúng mô tả hoặc thiếu
              đồ, vui lòng gửi khiếu nại kèm hình ảnh minh chứng.
            </Text>
          </View>

          {/* LÝ DO */}
          <View style={styles.section}>
            <Text style={styles.label}>Mô tả lý do khiếu nại *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="VD: Trang phục bị rách ở phần tay áo, không đúng size như mô tả..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* HÌNH MINH CHỨNG */}
          <View style={styles.section}>
            <Text style={styles.label}>Hình ảnh minh chứng (tối đa 5)</Text>
            <View style={styles.imagesRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF4D4D" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={pickImage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#B59DFF" />
                  ) : (
                    <Ionicons name="camera" size={28} color="#B59DFF" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* NÚT GỬI */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Gửi khiếu nại</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#E65100",
    lineHeight: 20,
  },
  section: { paddingHorizontal: 15, marginTop: 20 },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1C4E9",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: "#333",
    minHeight: 120,
  },
  imagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: { position: "relative" },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 11,
  },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0D7FF",
    borderStyle: "dashed",
    backgroundColor: "#F8F5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtn: {
    backgroundColor: "#B59DFF",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
