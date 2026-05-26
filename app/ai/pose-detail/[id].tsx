import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import axiosClient from "@/src/api/axiosClient";
import { getAppAccessToken } from "@/src/utils/appAccessToken";

type PoseScoreResult = {
  id: number;
  score: number;
  comment: string;
  characterName: string;
  imageUrl?: string;
  createdAt?: string;
};

export default function PoseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [result, setResult] = useState<PoseScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback State
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"LIKE" | "DISLIKE" | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get<{ result: PoseScoreResult }>(`/search/pose-history/${id}`);
      setResult(response.data?.result || null);
    } catch (error) {
      console.error("Lỗi lấy chi tiết Pose:", error);
      Alert.alert("Lỗi", "Không thể lấy thông tin bài chấm điểm.");
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#9D174D", fontSize: 16 }}>Không tìm thấy bài chấm điểm này.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#D946EF", fontWeight: "bold" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Lịch sử</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Chi Tiết Bảng Điểm</Text>
        <Text style={styles.subtitle}>Nhân vật: {result.characterName}</Text>

        <View style={styles.resultCard}>
          {result.imageUrl && (
            <Image source={{ uri: result.imageUrl }} style={styles.coverImage} />
          )}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF4FF" },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 12 },
  backButtonText: { color: "#D946EF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "900", color: "#831843", marginBottom: 4, textAlign: "center" },
  subtitle: {
    fontSize: 16,
    color: "#BE185D",
    marginBottom: 24,
    fontWeight: "700",
    textAlign: "center",
  },

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
  coverImage: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
    resizeMode: "cover",
  },
  scoreCircleWrapper: { marginBottom: 24 },
  glowScoreText: {
    fontSize: 80,
    fontWeight: "900",
    color: "#D946EF",
    textShadowColor: "rgba(217, 70, 239, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  commentSection: {
    backgroundColor: "#FDF2F8",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  commentTitle: { color: "#BE185D", fontWeight: "900", fontSize: 16, marginBottom: 8 },
  commentText: { color: "#831843", lineHeight: 24, fontSize: 15, fontWeight: "500" },

  resultActions: { flexDirection: "row", gap: 12, width: "100%" },
  shareBtnContainer: { flex: 1, borderRadius: 16, overflow: "hidden", shadowColor: "#F472B6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  shareBtn: { paddingVertical: 14, alignItems: "center" },
  shareBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  feedbackBtn: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#F472B6" },
  feedbackBtnText: { color: "#F472B6", fontWeight: "900", fontSize: 14 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", width: "100%", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#831843", marginBottom: 8 },
  modalDesc: { color: "#BE185D", fontSize: 14, marginBottom: 20, lineHeight: 20 },
  reactionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  reactionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: "#FDF2F8", borderWidth: 1.5, borderColor: "#FBCFE8" },
  reactionBtnActive: { backgroundColor: "#FCE7F3", borderColor: "#D946EF" },
  reactionEmoji: { fontSize: 28, marginBottom: 4 },
  reactionText: { color: "#9D174D", fontWeight: "700", fontSize: 13 },
  reactionTextActive: { color: "#D946EF", fontWeight: "900" },
  modalInput: { backgroundColor: "#FDF2F8", borderWidth: 1, borderColor: "#FBCFE8", borderRadius: 16, padding: 16, height: 100, textAlignVertical: "top", fontSize: 15, color: "#831843", marginBottom: 24 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: "#F3F4F6" },
  modalCancelText: { color: "#4B5563", fontWeight: "800", fontSize: 15 },
  modalSubmitContainer: { flex: 1, borderRadius: 16, overflow: "hidden" },
  modalSubmit: { flex: 1, paddingVertical: 14, alignItems: "center" },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
