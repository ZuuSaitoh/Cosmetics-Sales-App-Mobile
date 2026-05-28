import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Share,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PickedImage, usePickedImage } from "@/hooks/usePickedImage";
import axiosClient from "@/src/api/axiosClient";
import { getAppAccessToken } from "@/src/utils/appAccessToken";

// ─── Types ──────────────────────────────────────────────────────────
type PoseScoreResult = {
  id: number;
  score: number;       // 0 - 100
  comment: string;
  characterName: string;
  imageUrl?: string;
};

// ─── API Helper ──────────────────────────────────────────────────
async function buildPoseFormData(
  image: PickedImage,
  characterName: string,
  referenceImage?: PickedImage | null,
): Promise<FormData> {
  const formData = new FormData();

  if (image?.uri) {
    const filename = image.uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (Platform.OS === 'web') {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      formData.append('image', blob, filename);
    } else {
      formData.append("image", {
        uri: image.uri,
        name: filename,
        type: type,
      } as any);
    }
  }

  if (referenceImage?.uri) {
    const filename = referenceImage.uri.split('/').pop() || 'ref_image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (Platform.OS === 'web') {
      const response = await fetch(referenceImage.uri);
      const blob = await response.blob();
      formData.append('referenceImage', blob, filename);
    } else {
      formData.append("referenceImage", {
        uri: referenceImage.uri,
        name: filename,
        type: type,
      } as any);
    }
  }

  formData.append("characterName", characterName);
  return formData;
}

async function fetchPoseScore(
  image: PickedImage,
  characterName: string,
  referenceImage?: PickedImage | null,
): Promise<PoseScoreResult> {
  const formData = await buildPoseFormData(image, characterName, referenceImage);

  const response = await axiosClient.post<{ result: PoseScoreResult }>(
    "/search/pose-score",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data, headers) => {
        delete headers["Content-Type"];
        delete headers["content-type"];
        return data;
      },
      timeout: 60_000,
    },
  );

  return response.data?.result as PoseScoreResult;
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function PoseBattleScreen() {
  const router = useRouter();
  const {
    image,
    previewUri,
    pickFromLibrary,
    takePhoto,
    clearImage,
  } = usePickedImage();

  const {
    image: refImage,
    previewUri: refPreviewUri,
    pickFromLibrary: pickRef,
    clearImage: clearRef,
  } = usePickedImage();

  const [characterName, setCharacterName] = useState("");
  const [result, setResult] = useState<PoseScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Feedback State
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"LIKE" | "DISLIKE" | null>(null);

  const handleScore = async () => {
    if (!image?.uri) {
      Alert.alert("Thiếu ảnh", "Vui lòng chụp hoặc chọn ảnh cosplay của bạn.");
      return;
    }
    if (!characterName.trim()) {
      Alert.alert("Thiếu tên nhân vật", "Vui lòng nhập tên nhân vật cosplay (VD: Naruto).");
      return;
    }

    try {
      setLoading(true);
      const scored = await fetchPoseScore(
        image,
        characterName.trim(),
        refImage,
      );
      setResult(scored);
    } catch (error: any) {
      console.error("Pose score error:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể chấm điểm AI.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `OMG! Mình vừa đạt ${result.score} điểm hóa trang ${result.characterName}. Xem chi tiết bài chấm của AI tại đây: https://cosmate.site/pose-battle/${result.id}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleOpenFeedback = async () => {
    const token = await getAppAccessToken();
    if (!token) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần đăng nhập để đánh giá kết quả của AI.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/(auth)/login" as any) },
        ]
      );
      return;
    }
    setFeedbackVisible(true);
    setFeedbackType(null);
    setFeedbackText("");
  };

  const submitFeedback = async () => {
    if (!feedbackType) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn 👍 (Hợp lý) hoặc 👎 (Chưa chuẩn).");
      return;
    }
    if (!result?.id) return;
    
    try {
      setSubmittingFeedback(true);
      const finalMessage = `[${feedbackType}] - ${feedbackText.trim()}`;
      
      await axiosClient.post("/search/pose-score/feedback", {
        poseScoreId: result.id,
        feedbackText: finalMessage,
      });
      Alert.alert("Thành công", "Cảm ơn bạn đã gửi phản hồi giúp AI học hỏi tốt hơn!");
      setFeedbackVisible(false);
    } catch (error) {
      console.error("Feedback error", error);
      Alert.alert("Lỗi", "Không thể gửi phản hồi lúc này.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>AI Pose Battle</Text>
        <Text style={styles.subtitle}>
          Cosplay đỉnh cỡ nào? Tranh tài pose dáng và nhận điểm số từ AI!
        </Text>

        <View style={styles.imagesContainer}>
          {/* ─── User Image (bắt buộc) ─── */}
          <View style={styles.imageBox}>
            <Text style={styles.sectionLabel}>📸 Ảnh của bạn *</Text>
            
            <View style={styles.previewCard}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderIcon}>✨</Text>
                  <Text style={styles.previewPlaceholderText}>Tải ảnh lên</Text>
                </View>
              )}
            </View>
            
            <View style={styles.actionColumn}>
              <TouchableOpacity style={styles.actionButtonContainer} onPress={takePhoto}>
                <View style={[styles.actionButton, { backgroundColor: "#D946EF" }]}>
                  <Text style={styles.actionButtonText}>📷 Chụp</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={pickFromLibrary}>
                <Text style={styles.actionButtonSecondaryText}>🖼️ Chọn</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Reference Image (tùy chọn) ─── */}
          <View style={styles.imageBox}>
            <Text style={styles.sectionLabel}>🎭 Ảnh gốc (Tùy chọn)</Text>
            
            <View style={styles.previewCard}>
              {refPreviewUri ? (
                <Image source={{ uri: refPreviewUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderIcon}>🖼️</Text>
                  <Text style={styles.previewPlaceholderText}>Ảnh đối chiếu</Text>
                </View>
              )}
            </View>

            <View style={styles.actionColumn}>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={pickRef}>
                <Text style={styles.actionButtonSecondaryText}>🖼️ Chọn</Text>
              </TouchableOpacity>
              {refPreviewUri && (
                <TouchableOpacity style={styles.clearButton} onPress={clearRef}>
                  <Text style={styles.clearButtonText}>✕ Xóa</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ─── Character Name ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên nhân vật hóa trang *</Text>
          <TextInput
            value={characterName}
            onChangeText={setCharacterName}
            placeholder="Ví dụ: Naruto, Gojo Satoru, ..."
            placeholderTextColor="#F472B6"
            style={styles.input}
            returnKeyType="done"
          />
        </View>

        {/* ─── Score Button ─── */}
        <TouchableOpacity
          style={styles.scoreButtonContainer}
          onPress={handleScore}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View
            style={[styles.scoreButton, loading && styles.scoreButtonDisabled, { backgroundColor: "#D946EF" }]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.scoreButtonText}> AI ĐANG CHẤM ĐIỂM...</Text>
              </View>
            ) : (
              <Text style={styles.scoreButtonText}>✨ CHẤM ĐIỂM NGAY</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* ─── Result Card ─── */}
        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>BẢNG ĐIỂM AI</Text>

            {/* Huge Score */}
            <View style={styles.scoreCircleWrapper}>
              <Text style={styles.glowScoreText}>
                {result.score}<Text style={{ fontSize: 30 }}>/100</Text>
              </Text>
            </View>

            {/* AI Comment in Pink Card */}
            <View style={styles.commentSection}>
              <Text style={styles.commentTitle}>💬 Nhận xét từ AI</Text>
              <Text style={styles.commentText}>{result.comment}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.shareBtnContainer} onPress={handleShare}>
                <View style={[styles.shareBtn, { backgroundColor: "#D946EF" }]}>
                  <Text style={styles.shareBtnText}>🚀 Chia sẻ kết quả</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.feedbackBtn} onPress={handleOpenFeedback}>
                <Text style={styles.feedbackBtnText}>⚠️ Gửi Feedback</Text>
              </TouchableOpacity>
            </View>

          </View>
        ) : null}

      </ScrollView>

      {/* ─── Feedback Modal ─── */}
      <Modal
        visible={feedbackVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đánh giá AI 💬</Text>
            <Text style={styles.modalDesc}>Kết quả chấm điểm này có chính xác không?</Text>
            
            <View style={styles.reactionRow}>
              <TouchableOpacity 
                style={[styles.reactionBtn, feedbackType === "LIKE" && styles.reactionBtnActive]} 
                onPress={() => setFeedbackType("LIKE")}
              >
                <Text style={styles.reactionEmoji}>👍</Text>
                <Text style={[styles.reactionText, feedbackType === "LIKE" && styles.reactionTextActive]}>Hợp lý</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.reactionBtn, feedbackType === "DISLIKE" && styles.reactionBtnActive]} 
                onPress={() => setFeedbackType("DISLIKE")}
              >
                <Text style={styles.reactionEmoji}>👎</Text>
                <Text style={[styles.reactionText, feedbackType === "DISLIKE" && styles.reactionTextActive]}>Chưa chuẩn</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Nhập lý do chi tiết (VD: AI chấm sai góc mặt)..."
              placeholderTextColor="#9CA3AF"
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFeedbackVisible(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitContainer} onPress={submitFeedback} disabled={submittingFeedback}>
                <View
                  style={[styles.modalSubmit, submittingFeedback && { opacity: 0.7 }, { backgroundColor: "#D946EF" }]}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Gửi Đánh Giá</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF4FF" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: "900", color: "#831843", marginBottom: 8, textAlign: "center" },
  subtitle: {
    fontSize: 15,
    color: "#BE185D",
    marginBottom: 24,
    lineHeight: 22,
    textAlign: "center",
  },

  imagesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  imageBox: {
    flex: 1,
  },
  sectionLabel: {
    color: "#9D174D",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },

  // Preview
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    marginBottom: 12,
    shadowColor: "#F472B6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#FDF2F8",
    resizeMode: "cover",
  },
  previewPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FBCFE8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF2F8",
  },
  previewPlaceholderIcon: { fontSize: 32, marginBottom: 8 },
  previewPlaceholderText: { color: "#F472B6", textAlign: "center", fontWeight: "700", fontSize: 13 },

  actionColumn: { gap: 8 },
  actionButtonContainer: { borderRadius: 12, overflow: "hidden" },
  actionButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  actionButtonSecondary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  actionButtonSecondaryText: { color: "#DB2777", fontWeight: "800", fontSize: 13 },
  clearButton: { alignSelf: "center", marginTop: 4 },
  clearButtonText: { color: "#E11D48", fontWeight: "700", fontSize: 13 },

  // Input
  inputGroup: { marginBottom: 24 },
  label: { color: "#9D174D", marginBottom: 8, fontWeight: "800", fontSize: 15 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FBCFE8",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: "#831843",
    fontSize: 16,
    fontWeight: "600",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Score Button
  scoreButtonContainer: { borderRadius: 20, shadowColor: "#D946EF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, marginBottom: 24 },
  scoreButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  scoreButtonDisabled: { opacity: 0.7 },
  scoreButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 17, textTransform: "uppercase", letterSpacing: 0.5 },
  loadingRow: { flexDirection: "row", alignItems: "center" },

  // Result Card
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#D946EF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    alignItems: "center",
  },
  resultTitle: {
    color: "#831843",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
    letterSpacing: 1,
  },

  // Score Highlight
  scoreCircleWrapper: { marginBottom: 24 },
  glowScoreText: {
    fontSize: 80,
    fontWeight: "900",
    color: "#D946EF",
    textShadowColor: "rgba(217, 70, 239, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // Comment
  commentSection: {
    backgroundColor: "#FDF2F8",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  commentTitle: {
    color: "#BE185D",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 8,
  },
  commentText: { color: "#831843", lineHeight: 24, fontSize: 15, fontWeight: "500" },

  // Actions
  resultActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  shareBtnContainer: { flex: 1, borderRadius: 16, overflow: "hidden", shadowColor: "#F472B6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  shareBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  shareBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  feedbackBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F472B6",
  },
  feedbackBtnText: { color: "#F472B6", fontWeight: "900", fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#831843", marginBottom: 8 },
  modalDesc: { color: "#BE185D", fontSize: 14, marginBottom: 20, lineHeight: 20 },
  
  reactionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  reactionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    borderWidth: 1.5,
    borderColor: "#FBCFE8",
  },
  reactionBtnActive: {
    backgroundColor: "#FCE7F3",
    borderColor: "#D946EF",
  },
  reactionEmoji: { fontSize: 28, marginBottom: 4 },
  reactionText: { color: "#9D174D", fontWeight: "700", fontSize: 13 },
  reactionTextActive: { color: "#D946EF", fontWeight: "900" },

  modalInput: {
    backgroundColor: "#FDF2F8",
    borderWidth: 1,
    borderColor: "#FBCFE8",
    borderRadius: 16,
    padding: 16,
    height: 100,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#831843",
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: { color: "#4B5563", fontWeight: "800", fontSize: 15 },
  modalSubmitContainer: { flex: 1, borderRadius: 16, overflow: "hidden" },
  modalSubmit: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
