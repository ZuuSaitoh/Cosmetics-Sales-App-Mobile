import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosClient from "./api/axiosClient";
import { PickedImage, usePickedImage } from "./hooks/usePickedImage";

type SearchCostume = {
  costumeId?: number;
  costumeName: string;
  imageUrl: string;
  price: number | string;
  similarityScore: number;
};

function buildFormData(image: PickedImage, text: string) {
  const formData = new FormData();
  formData.append("files", {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as any);
  formData.append("text", text);
  return formData;
}

async function searchByImage(image: PickedImage, text: string): Promise<SearchCostume[]> {
  const token = await AsyncStorage.getItem("cosmate_token");
  if (!token) {
    throw new Error("Vui lòng đăng nhập để dùng tính năng này.");
  }

  const response = await fetch(`${axiosClient.defaults.baseURL}/search/ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: buildFormData(image, text),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Tìm kiếm thất bại.");
  }

  return (data?.result ?? []) as SearchCostume[];
}

export default function ImageSearchScreen() {
  const { image, previewUri, pickFromLibrary, takePhoto, clearImage } = usePickedImage();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchCostume[]>([]);

  const hasResults = useMemo(() => results.length > 0, [results]);

  const handleSearch = async () => {
    if (!image?.uri) {
      Alert.alert("Thiếu ảnh", "Vui lòng chụp hoặc chọn một bức ảnh.");
      return;
    }

    try {
      setLoading(true);
      const data = await searchByImage(image, keyword.trim());
      setResults(data);
    } catch (error: any) {
      console.error("AI image search error:", error);
      Alert.alert("Lỗi", error?.message || "Không thể tìm kiếm AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>AI Image Search</Text>
        <Text style={styles.subtitle}>Tìm bộ đồ giống ảnh mẫu bằng AI, có thể thêm từ khóa phụ.</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={pickFromLibrary}>
            <Text style={styles.actionButtonSecondaryText}>Thư viện</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewCard}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>Ảnh sẽ được preview tại đây</Text>
            </View>
          )}
          {previewUri ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearImage}>
              <Text style={styles.clearButtonText}>Xóa ảnh</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Từ khóa phụ</Text>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder='Ví dụ: "áo choàng đỏ"'
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Tìm kiếm</Text>}
        </TouchableOpacity>

        {hasResults ? (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Kết quả</Text>
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.costumeId ?? index}`}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.costumeName}</Text>
                    <Text style={styles.cardPrice}>{new Intl.NumberFormat("vi-VN").format(Number(item.price))}đ</Text>
                    <Text style={styles.cardScore}>similarityScore: {item.similarityScore.toFixed(4)}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08111F" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#C7D2FE", marginBottom: 20, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  actionButtonText: { color: "#fff", fontWeight: "800" },
  actionButtonSecondary: { flex: 1, backgroundColor: "#1F2937", paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  actionButtonSecondaryText: { color: "#E5E7EB", fontWeight: "800" },
  previewCard: { backgroundColor: "#111827", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#243041", marginBottom: 18 },
  previewImage: { width: "100%", height: 300, borderRadius: 16, backgroundColor: "#0F172A" },
  previewPlaceholder: { height: 300, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#334155", alignItems: "center", justifyContent: "center" },
  previewPlaceholderText: { color: "#94A3B8", textAlign: "center" },
  clearButton: { alignSelf: "flex-end", marginTop: 10 },
  clearButtonText: { color: "#FCA5A5", fontWeight: "700" },
  inputGroup: { marginBottom: 18 },
  label: { color: "#E5E7EB", marginBottom: 8, fontWeight: "700" },
  input: { backgroundColor: "#111827", borderColor: "#334155", borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: "#fff" },
  searchButton: { backgroundColor: "#F59E0B", paddingVertical: 16, borderRadius: 18, alignItems: "center", marginBottom: 18 },
  searchButtonDisabled: { opacity: 0.75 },
  searchButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resultSection: { marginTop: 4 },
  resultTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  card: { flexDirection: "row", backgroundColor: "#111827", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#243041", marginBottom: 12 },
  cardImage: { width: 96, height: 96, backgroundColor: "#0F172A" },
  cardBody: { flex: 1, padding: 12, gap: 6 },
  cardTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  cardPrice: { color: "#86EFAC", fontWeight: "700" },
  cardScore: { color: "#C7D2FE", fontSize: 12 },
});
