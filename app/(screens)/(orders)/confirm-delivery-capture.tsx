import { wsImageService } from "@/src/services/wsImageService";
import { assertConfirmDeliveryQrOwner } from "@/src/utils/confirmDeliveryAccess";
import { alertOnce } from "@/src/utils/alertOnce";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_IMAGES = 5;

export default function ConfirmDeliveryCaptureScreen() {
  const { token, apiBase, userId } = useLocalSearchParams<{
    token?: string;
    apiBase?: string;
    userId?: string;
  }>();
  const sessionToken = typeof token === "string" ? token.trim() : "";
  const qrApiBase = typeof apiBase === "string" ? apiBase.trim() : "";
  const qrUserId = typeof userId === "string" ? userId.trim() : "";

  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [canCapture, setCanCapture] = useState(false);
  const alertGuardRef = useRef(false);
  const verifyStartedRef = useRef(false);

  const denyAndLeave = useCallback((message: string) => {
    alertOnce(alertGuardRef, "Không thể tiếp tục", message, () =>
      router.back(),
    );
  }, []);

  useEffect(() => {
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    let cancelled = false;

    const verify = async () => {
      if (!sessionToken) {
        denyAndLeave("Phiên xác nhận không hợp lệ. Vui lòng quét lại mã QR.");
        return;
      }
      if (!qrUserId) {
        denyAndLeave(
          "Mã QR thiếu thông tin tài khoản. Vui lòng tạo mã mới trên web.",
        );
        return;
      }

      const access = await assertConfirmDeliveryQrOwner(qrUserId);
      if (cancelled) return;

      if (!access.ok) {
        denyAndLeave(access.message);
        return;
      }

      setCanCapture(true);
      setIsCheckingAccess(false);
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [denyAndLeave, qrUserId, sessionToken]);

  const appendImages = (assets: ImagePicker.ImagePickerAsset[]) => {
    setImages((prev) => {
      const merged = [...prev, ...assets];
      return merged.slice(0, MAX_IMAGES);
    });
  };

  const takePicture = async () => {
    if (!canCapture) return;

    const remainSlots = MAX_IMAGES - images.length;
    if (remainSlots <= 0) {
      Alert.alert("Đã đủ ảnh", `Bạn chỉ có thể gửi tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Cấp quyền", "Vui lòng cho phép Camera để chụp ảnh xác nhận.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      appendImages(result.assets.slice(0, remainSlots));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submitImages = async () => {
    if (!sessionToken || !canCapture) return;

    const access = await assertConfirmDeliveryQrOwner(qrUserId);
    if (!access.ok) {
      Alert.alert("Không thể gửi ảnh", access.message);
      return;
    }

    if (images.length === 0) {
      Alert.alert(
        "Thiếu ảnh",
        "Vui lòng chụp ít nhất 1 ảnh xác nhận nhận hàng.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await wsImageService.uploadConfirmDeliveryImages(
        sessionToken,
        images.map((img) => img.uri),
        qrApiBase || undefined,
      );

      Alert.alert(
        "Đã gửi ảnh",
        "Vui lòng bấm 「Xác nhận đã nhận hàng」 trên máy tính để hoàn tất.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        "Không thể gửi ảnh. Kiểm tra kết nối hoặc phiên QR đã hết hạn.";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAccess || !canCapture) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ảnh xác nhận nhận hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="desktop-outline" size={22} color="#B59DFF" />
          <Text style={styles.infoText}>
            Chụp ảnh tình trạng đồ khi nhận. Sau khi gửi, hãy bấm xác nhận trên
            máy tính để hoàn tất đơn hàng.
          </Text>
        </View>

        <View style={styles.imageSectionHeader}>
          <Text style={styles.label}>Ảnh minh chứng (1–5 ảnh)</Text>
          <Text style={styles.counter}>{images.length}/{MAX_IMAGES}</Text>
        </View>

        {images.length === 0 ? (
          <TouchableOpacity style={styles.imageBox} onPress={takePicture}>
            <Ionicons name="camera" size={40} color="#B59DFF" />
            <Text style={styles.imageBoxText}>Bấm để chụp ảnh</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.imageGrid}>
            {images.map((img, index) => (
              <View key={`${img.uri}-${index}`} style={styles.imageCell}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES ? (
              <TouchableOpacity style={styles.addMoreCell} onPress={takePicture}>
                <Ionicons name="add" size={24} color="#8E7AB5" />
                <Text style={styles.addMoreText}>Thêm ảnh</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={submitImages}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Gửi ảnh lên máy tính</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  content: { padding: 20, paddingBottom: 40 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F4F1FF",
    padding: 14,
    borderRadius: 12,
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: "#4A3B6B",
    fontSize: 13,
    lineHeight: 20,
  },
  imageSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: { fontSize: 15, fontWeight: "bold", color: "#333" },
  counter: { fontSize: 13, color: "#8E7AB5", fontWeight: "600" },
  imageBox: {
    height: 180,
    backgroundColor: "#F4F1FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1C4E9",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  imageBoxText: { marginTop: 10, color: "#8E7AB5", fontWeight: "500" },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 28,
  },
  imageCell: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#EDE6FF",
    position: "relative",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreCell: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1C4E9",
    backgroundColor: "#FAF9FF",
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreText: { marginTop: 4, color: "#8E7AB5", fontSize: 11, fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
