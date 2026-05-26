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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PickedImage, usePickedImage } from "@/hooks/usePickedImage";
import axiosClient from "@/src/api/axiosClient";

// ─── Types ──────────────────────────────────────────────────────────
type SearchCostume = {
  costumeId: number;
  costumeName: string;
  imageUrl: string;
  price: number | string;
  similarityScore: number;
};

// ─── Thresholds ──────────────────────────────────────────────────
const EXACT_MATCH_THRESHOLD = 70;
const SUGGESTED_MATCH_THRESHOLD = 50;

// ─── API Helper ──────────────────────────────────────────────────
async function buildFormData(image: PickedImage | null, text: string): Promise<FormData> {
  const formData = new FormData();
  
  if (image?.uri) {
    const filename = image.uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (Platform.OS === 'web') {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      formData.append('files', blob, filename);
    } else {
      formData.append('files', {
        uri: image.uri,
        name: filename,
        type: type,
      } as any);
    }
  }

  if (text) {
    formData.append("text", text);
  }
  return formData;
}

async function searchByImage(
  image: PickedImage | null,
  text: string,
): Promise<{ results: SearchCostume[]; message: string }> {
  const formData = await buildFormData(image, text);

  // Gọi API, kết quả JSON trực tiếp trong response.data.result
  const response = await axiosClient.post<{
    result: SearchCostume[];
    message?: string;
  }>("/search/ai", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (data, headers) => {
      delete headers["Content-Type"];
      delete headers["content-type"];
      return data;
    },
    timeout: 60_000,
  });

  return {
    results: response.data?.result ?? [],
    message: response.data?.message ?? "",
  };
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function ImageSearchScreen() {
  const { image, previewUri, pickFromLibrary, takePhoto, clearImage } =
    usePickedImage();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchCostume[]>([]);
  const [apiMessage, setApiMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Phân loại kết quả
  const { exactMatches, suggestedMatches } = useMemo(() => {
    const exact: SearchCostume[] = [];
    const suggested: SearchCostume[] = [];
    for (const item of results) {
      // Backend trả về tỷ lệ fraction (VD: 0.65 -> 65%)
      const scorePercent = item.similarityScore * 100;
      
      const mappedItem = {
        ...item,
        similarityScore: scorePercent,
      };

      if (scorePercent >= EXACT_MATCH_THRESHOLD) {
        exact.push(mappedItem);
      } else if (scorePercent >= SUGGESTED_MATCH_THRESHOLD) {
        suggested.push(mappedItem);
      }
    }
    return { exactMatches: exact, suggestedMatches: suggested };
  }, [results]);

  const hasValidResults = exactMatches.length > 0 || suggestedMatches.length > 0;

  const handleSearch = async () => {
    if (!image?.uri && !keyword.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng chụp ảnh, chọn ảnh hoặc nhập từ khóa để tìm kiếm.");
      return;
    }

    try {
      setLoading(true);
      setApiMessage("");
      setHasSearched(true);
      const { results: data, message } = await searchByImage(
        image,
        keyword.trim(),
      );
      setResults(data);
      setApiMessage(message);

    } catch (error: any) {
      console.error("AI image search error:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tìm kiếm AI.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Item ──────────────────────────────────────────────
  const renderCostumeCard = ({ item }: { item: SearchCostume }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrapper}>
          <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.cardImage} />
          {item.similarityScore > 0 && (
            <View
              style={[styles.scoreBadge, { backgroundColor: "#D946EF" }]}
            >
              <Text style={styles.scoreBadgeText}>
                ✨ {item.similarityScore.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.costumeName}
          </Text>
          <Text style={styles.cardPrice}>
            {new Intl.NumberFormat("vi-VN").format(Number(item.price))}đ / ngày
          </Text>
        </View>
      </View>
    );
  };

  // ─── Section Renderer ─────────────────────────────────────────
  const renderSection = (
    title: string,
    data: SearchCostume[],
    titleStyle?: object,
  ) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
        <FlatList
          data={data}
          keyExtractor={(item, idx) => `${item.costumeId ?? idx}`}
          scrollEnabled={false}
          renderItem={renderCostumeCard}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>CosMate AI Search</Text>
        <Text style={styles.subtitle}>
          Tìm bộ đồ giống ảnh mẫu bằng AI, có thể thêm từ khóa phụ.
        </Text>

        {/* Camera / Library Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButtonContainer} onPress={takePhoto}>
            <View style={[styles.actionButton, { backgroundColor: "#D946EF" }]}>
              <Text style={styles.actionButtonText}>📷 Chụp Ảnh</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={pickFromLibrary}
          >
            <Text style={styles.actionButtonSecondaryText}>🖼️ Thư viện</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        <View style={styles.previewCard}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderIcon}>✨</Text>
              <Text style={styles.previewPlaceholderText}>
                Tải ảnh trang phục bạn muốn tìm lên đây nhé!
              </Text>
            </View>
          )}
          {previewUri ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearImage}>
              <Text style={styles.clearButtonText}>✕ Xóa ảnh này</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Keyword Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Từ khóa phụ (tùy chọn)</Text>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder='Ví dụ: "áo choàng đỏ"'
            placeholderTextColor="#F472B6"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchButtonContainer}
          onPress={handleSearch}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View
            style={[styles.searchButton, loading && styles.searchButtonDisabled, { backgroundColor: "#D946EF" }]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.searchButtonText}> Đang phân tích bằng AI...</Text>
              </View>
            ) : (
              <Text style={styles.searchButtonText}>✨ TÌM KIẾM BẰNG AI</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* API fallback message */}
        {apiMessage && apiMessage.includes("bảo trì") ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>⚠️ {apiMessage}</Text>
          </View>
        ) : null}

        {/* Results */}
        {hasSearched && !loading ? (
          <View style={styles.resultSection}>
            {hasValidResults ? (
              <>
                <Text style={styles.resultTitle}>
                  Kết quả phân tích
                </Text>
                <Text style={styles.disclaimerText}>
                  (Kết quả phân tích AI chỉ mang tính chất tham khảo)
                </Text>

                {exactMatches.length > 0 && (
                  <View>
                    {renderSection(
                      `🎯 Trùng khớp cao (${exactMatches.length})`,
                      exactMatches,
                      styles.titleExact
                    )}
                    <View style={styles.separator} />
                  </View>
                )}

                {suggestedMatches.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    {renderSection(
                      `💡 Có thể bạn cũng thích (${suggestedMatches.length})`,
                      suggestedMatches,
                      styles.titleSuggested
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>😿</Text>
                <Text style={styles.emptyText}>Tiếc quá, Bé Mèo chưa tìm thấy trang phục phù hợp!</Text>
                <Text style={styles.emptySubText}>Vui lòng thử chụp một góc khác hoặc đổi từ khóa nhé.</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF4FF" }, 
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: "900", color: "#831843", marginBottom: 8 }, 
  subtitle: {
    fontSize: 15,
    color: "#BE185D", 
    marginBottom: 24,
    lineHeight: 22,
  },

  // Action Row
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionButtonContainer: { flex: 1 },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8", 
  },
  actionButtonSecondaryText: {
    color: "#DB2777", 
    fontWeight: "800",
    fontSize: 15,
  },

  // Preview
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24, 
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCE7F3", 
    marginBottom: 20,
    shadowColor: "#F472B6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 18,
    backgroundColor: "#FDF2F8", 
    resizeMode: "cover",
  },
  previewPlaceholder: {
    height: 300,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FBCFE8", 
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FDF2F8", 
  },
  previewPlaceholderIcon: { fontSize: 52 },
  previewPlaceholderText: { color: "#F472B6", textAlign: "center", fontWeight: "600", fontSize: 15 },
  clearButton: { alignSelf: "flex-end", marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#FFF1F2", borderRadius: 8 },
  clearButtonText: { color: "#E11D48", fontWeight: "800" },

  // Input
  inputGroup: { marginBottom: 20 },
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

  // Search Button
  searchButtonContainer: { marginBottom: 24, borderRadius: 20, shadowColor: "#D946EF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  searchButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  searchButtonDisabled: { opacity: 0.7 },
  searchButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 17, textTransform: "uppercase", letterSpacing: 0.5 },
  loadingRow: { flexDirection: "row", alignItems: "center" },

  // Warning
  warningBanner: {
    backgroundColor: "#FEF3C7", 
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  warningBannerText: { color: "#92400E", fontSize: 14, fontWeight: "600", lineHeight: 20 },

  // Results
  resultSection: { marginTop: 8 },
  resultTitle: {
    color: "#831843",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  disclaimerText: {
    color: "#F472B6", 
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 20,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    marginBottom: 14,
  },
  titleExact: {
    color: "#312E81", 
    fontSize: 20,
    fontWeight: "900",
  },
  titleSuggested: {
    color: "#3730A3", 
    fontSize: 18,
    fontWeight: "800",
  },
  separator: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#E0E7FF", 
    marginVertical: 12,
  },

  // Empty State
  emptyState: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 70, marginBottom: 20 },
  emptyText: { color: "#831843", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  emptySubText: { color: "#F472B6", fontSize: 15, textAlign: "center", fontWeight: "600", lineHeight: 22 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#831843",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FCE7F3", 
  },
  cardImageWrapper: { position: "relative", padding: 8 },
  cardImage: { width: 110, height: 110, backgroundColor: "#F3F4F6", borderRadius: 14 },
  scoreBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreBadgeText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" }, 
  cardBody: { flex: 1, paddingVertical: 12, paddingRight: 16, paddingLeft: 8, gap: 8, justifyContent: "center" },
  cardTitle: { color: "#312E81", fontWeight: "800", fontSize: 16, lineHeight: 22 }, 
  cardPrice: { color: "#DB2777", fontWeight: "900", fontSize: 15 }, 
});
