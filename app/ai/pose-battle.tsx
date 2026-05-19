import AsyncStorage from "@react-native-async-storage/async-storage";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PickedImage, usePickedImage } from "../../hooks/usePickedImage";
import axiosClient from "../src/api/axiosClient";

type PoseScoreResult = {
  id?: number;
  score: number;
  comment: string;
  characterName: string;
  imageUrl?: string;
};

function buildFormData(image: PickedImage, characterName: string) {
  const formData = new FormData();
  formData.append("image", {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as any);
  formData.append("characterName", characterName);
  return formData;
}

async function fetchPoseScore(
  image: PickedImage,
  characterName: string,
): Promise<PoseScoreResult> {
  const token = await AsyncStorage.getItem("cosmate_token");
  if (!token) {
    throw new Error("Vui lòng đăng nhập để dùng tính năng này.");
  }

  const response = await fetch(`${axiosClient.defaults.baseURL}/search/pose-score`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: buildFormData(image, characterName),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Chấm điểm thất bại.");
  }

  return data?.result as PoseScoreResult;
}

export default function PoseBattleScreen() {
  const { image, previewUri, pickFromLibrary, takePhoto, clearImage } = usePickedImage();
  const [characterName, setCharacterName] = useState("");
  const [result, setResult] = useState<PoseScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScore = async () => {
    if (!image?.uri) {
      Alert.alert("Thiếu ảnh", "Vui lòng chụp hoặc chọn một bức ảnh.");
      return;
    }
    if (!characterName.trim()) {
      Alert.alert("Thiếu tên nhân vật", "Vui lòng nhập characterName.");
      return;
    }

    try {
      setLoading(true);
      const scored = await fetchPoseScore(image, characterName.trim());
      setResult(scored);
    } catch (error: any) {
      console.error("Pose score error:", error);
      Alert.alert("Lỗi", error?.message || "Không thể chấm điểm AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pose Battle</Text>
        <Text style={styles.subtitle}>Chụp ảnh hoặc chọn ảnh để AI chấm điểm pose cosplay.</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Text style={styles.actionButtonText}>Chụp ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={pickFromLibrary}>
            <Text style={styles.actionButtonSecondaryText}>Chọn từ thư viện</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewCard}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>Ảnh preview sẽ hiển thị ở đây</Text>
            </View>
          )}
          {previewUri ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearImage}>
              <Text style={styles.clearButtonText}>Xóa ảnh</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>characterName</Text>
          <TextInput
            value={characterName}
            onChangeText={setCharacterName}
            placeholder="Ví dụ: Naruto"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.scoreButton, loading && styles.scoreButtonDisabled]}
          onPress={handleScore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scoreButtonText}>Chấm điểm AI</Text>
          )}
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Kết quả AI</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Score</Text>
              <Text style={styles.resultValue}>{result.score}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Nhân vật</Text>
              <Text style={styles.resultValue}>{result.characterName}</Text>
            </View>
            {result.imageUrl ? (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Ảnh lưu</Text>
                <Text style={styles.resultValue} numberOfLines={1}>
                  {result.imageUrl}
                </Text>
              </View>
            ) : null}
            <Text style={styles.commentTitle}>Comment</Text>
            <Text style={styles.commentText}>{result.comment}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1020" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#C7D2FE", marginBottom: 20, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionButton: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  actionButtonSecondaryText: { color: "#E5E7EB", fontWeight: "700" },
  previewCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#243041",
    marginBottom: 18,
  },
  previewImage: { width: "100%", height: 320, borderRadius: 16, backgroundColor: "#0F172A" },
  previewPlaceholder: {
    height: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPlaceholderText: { color: "#94A3B8", textAlign: "center" },
  clearButton: { alignSelf: "flex-end", marginTop: 10 },
  clearButtonText: { color: "#FCA5A5", fontWeight: "700" },
  inputGroup: { marginBottom: 18 },
  label: { color: "#E5E7EB", marginBottom: 8, fontWeight: "700" },
  input: {
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
  },
  scoreButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 18,
  },
  scoreButtonDisabled: { opacity: 0.75 },
  scoreButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resultCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#243041",
  },
  resultTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  resultRow: { marginBottom: 10 },
  resultLabel: { color: "#94A3B8", fontSize: 13, marginBottom: 4 },
  resultValue: { color: "#E5E7EB", fontSize: 15, fontWeight: "700" },
  commentTitle: { color: "#C4B5FD", fontWeight: "800", marginTop: 8, marginBottom: 6 },
  commentText: { color: "#E5E7EB", lineHeight: 21 },
});
