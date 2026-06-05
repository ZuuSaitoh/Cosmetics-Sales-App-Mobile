import { wsImageService } from "@/src/services/wsImageService";
import { assertConfirmDeliveryQrOwner } from "@/src/utils/confirmDeliveryAccess";
import { alertOnce } from "@/src/utils/alertOnce";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";

const MAX_IMAGES = 5;

function formatDuration(durationMs: number) {
  const seconds = Math.floor(durationMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function ConfirmDeliveryCaptureScreen() {
  const { token, apiBase, userId, pickerMode } = useLocalSearchParams<{
    token?: string;
    apiBase?: string;
    userId?: string;
    pickerMode?: string;
  }>();
  const sessionToken = typeof token === "string" ? token.trim() : "";
  const qrApiBase = typeof apiBase === "string" ? apiBase.trim() : "";
  const qrUserId = typeof userId === "string" ? userId.trim() : "";
  const isLibraryMode = pickerMode === "library";

  const copy = useMemo(
    () =>
      isLibraryMode
        ? {
            title: "Chọn minh chứng upload",
            info: "Chọn ảnh/video từ thư viện điện thoại. Minh chứng sẽ hiển thị realtime trên trang web provider.",
            emptyLabel: "Chọn ảnh/video từ thư viện",
            addLabel: "Thêm file",
            submitLabel: "Gửi minh chứng lên web",
            success:
              "Đã gửi minh chứng. Kiểm tra trên máy tính và tiếp tục thao tác trên web.",
            missing: "Vui lòng chọn ít nhất 1 ảnh/video từ thư viện.",
          }
        : {
            title: "Minh chứng giao nhận",
            info: "Chụp ảnh hoặc quay video tình trạng đồ khi nhận hoặc trả. Sau khi gửi, hãy bấm xác nhận trên máy tính để hoàn tất.",
            emptyLabel: "Bấm để chụp ảnh / quay video",
            addLabel: "Thêm file",
            submitLabel: "Gửi minh chứng lên máy tính",
            success:
              "Hãy bấm xác nhận trên máy tính để hoàn tất bước nhận hoặc trả hàng.",
            missing: "Vui lòng chụp hoặc quay video ít nhất 1 minh chứng.",
          },
    [isLibraryMode],
  );

  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [previewMedia, setPreviewMedia] = useState<{
    uri: string;
    type: "image" | "video";
  } | null>(null);
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
        denyAndLeave("Phiên gửi ảnh không hợp lệ. Vui lòng quét lại mã QR.");
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

  const pickFromLibrary = async () => {
    if (!canCapture) return;

    const remainSlots = MAX_IMAGES - images.length;
    if (remainSlots <= 0) {
      Alert.alert("Đã đủ minh chứng", `Bạn chỉ có thể gửi tối đa ${MAX_IMAGES} file.`);
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Cấp quyền",
        "Vui lòng cho phép truy cập thư viện để chọn ảnh/video upload.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: remainSlots > 1,
      selectionLimit: remainSlots,
      quality: 0.8,
    });

    if (!result.canceled) {
      appendImages(result.assets.slice(0, remainSlots));
    }
  };

  const takePicture = async () => {
    if (!canCapture) return;

    const remainSlots = MAX_IMAGES - images.length;
    if (remainSlots <= 0) {
      Alert.alert("Đã đủ minh chứng", `Bạn chỉ có thể gửi tối đa ${MAX_IMAGES} file.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Cấp quyền", "Vui lòng cho phép Camera để chụp ảnh/quay video minh chứng.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      appendImages(result.assets.slice(0, remainSlots));
    }
  };

  const onPickImages = isLibraryMode ? pickFromLibrary : takePicture;

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submitImages = async () => {
    if (!sessionToken || !canCapture) return;

    const access = await assertConfirmDeliveryQrOwner(qrUserId);
    if (!access.ok) {
      Alert.alert("Không thể gửi", access.message);
      return;
    }

    if (images.length === 0) {
      Alert.alert("Thiếu minh chứng", copy.missing);
      return;
    }

    setIsSubmitting(true);
    try {
      await wsImageService.uploadConfirmDeliveryImages(
        sessionToken,
        images.map((img) => ({
          uri: img.uri,
          mimeType: img.mimeType,
        })),
        qrApiBase || undefined,
      );

      Alert.alert("Đã gửi thành công", copy.success, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        "Không thể gửi minh chứng. Kiểm tra kết nối hoặc phiên QR đã hết hạn.";
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
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons
            name={isLibraryMode ? "images-outline" : "desktop-outline"}
            size={22}
            color="#B59DFF"
          />
          <Text style={styles.infoText}>{copy.info}</Text>
        </View>

        <View style={styles.imageSectionHeader}>
          <Text style={styles.label}>Minh chứng (1–5)</Text>
          <Text style={styles.counter}>
            {images.length}/{MAX_IMAGES}
          </Text>
        </View>

        {images.length === 0 ? (
          <TouchableOpacity style={styles.imageBox} onPress={onPickImages}>
            <Ionicons
              name={isLibraryMode ? "images" : "videocam"}
              size={40}
              color="#B59DFF"
            />
            <Text style={styles.imageBoxText}>{copy.emptyLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.imageGrid}>
            {images.map((img, index) => {
              const isVideo = img.type === "video";
              return (
                <View key={`${img.uri}-${index}`} style={styles.imageCell}>
                  <TouchableOpacity
                    style={styles.cellPressable}
                    onPress={() =>
                      setPreviewMedia({
                        uri: img.uri,
                        type: isVideo ? "video" : "image",
                      })
                    }
                  >
                    {isVideo ? (
                      <View style={styles.videoPlaceholder}>
                        <Ionicons name="videocam" size={28} color="#B59DFF" />
                        {img.duration ? (
                          <Text style={styles.durationText}>
                            {formatDuration(img.duration)}
                          </Text>
                        ) : (
                          <Text style={styles.durationText}>Video</Text>
                        )}
                      </View>
                    ) : (
                      <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {images.length < MAX_IMAGES ? (
              <TouchableOpacity style={styles.addMoreCell} onPress={onPickImages}>
                <Ionicons name="add" size={24} color="#8E7AB5" />
                <Text style={styles.addMoreText}>{copy.addLabel}</Text>
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
            <Text style={styles.submitBtnText}>{copy.submitLabel}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Media Preview Modal */}
      <Modal
        visible={!!previewMedia}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPreviewMedia(null)}
              style={styles.closeModalBtn}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {previewMedia?.type === "video" ? "Xem video minh chứng" : "Xem ảnh minh chứng"}
            </Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.modalContent}>
            {previewMedia?.type === "video" ? (
              <Video
                source={{ uri: previewMedia.uri }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                useNativeControls
                style={styles.modalVideo}
              />
            ) : (
              previewMedia?.uri && (
                <Image
                  source={{ uri: previewMedia.uri }}
                  style={styles.modalImage}
                />
              )
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FAF9FF",
    justifyContent: "center",
    alignItems: "center",
  },
  durationText: {
    fontSize: 10,
    color: "#8E7AB5",
    marginTop: 4,
    fontWeight: "600",
  },
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
  cellPressable: {
    width: "100%",
    height: "100%",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    backgroundColor: "#000",
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  modalVideo: {
    width: "100%",
    height: "100%",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
