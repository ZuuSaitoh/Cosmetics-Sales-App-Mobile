import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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
import axiosClient from "../../api/axiosClient";

export default function ReviewScreen() {
  // Lấy orderId và cosplayerId từ params truyền qua
  const { orderId, cosplayerId } = useLocalSearchParams();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. CHỌN ẢNH REVIEW
  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true, // Cho chọn nhiều ảnh
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map((asset) => asset.uri);
      setImages([...images, ...selectedUris]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 2. GỬI ĐÁNH GIÁ (POST /api/reviews)
  const handleSubmitReview = async () => {
    if (!rating) {
      Alert.alert("Lỗi", "Sếp chưa chọn số sao đánh giá kìa!");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Các params bắt buộc theo Swagger
      formData.append("cosplayerId", String(cosplayerId));
      formData.append("orderId", String(orderId));
      formData.append("rating", String(rating));
      formData.append("comment", comment);

      // Xử lý mảng file ảnh
      images.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `review_img_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append("files", { uri, name: filename, type } as any);
      });

      const res = await axiosClient.post("/reviews", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Cảm ơn sếp đã đánh giá! 💜", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không gửi được đánh giá.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá dịch vụ</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PHẦN CHỌN SAO */}
        <View style={styles.ratingBox}>
          <Text style={styles.label}>Đồ cosplay thế nào ?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={40}
                  color={star <= rating ? "#FFD700" : "#CCC"}
                  style={{ marginHorizontal: 5 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 5
              ? "Cực phẩm!"
              : rating >= 3
                ? "Tạm ổn"
                : "Hơi thất vọng"}
          </Text>
        </View>

        {/* NHẬP COMMENT */}
        <TextInput
          style={styles.commentInput}
          placeholder="Chia sẻ cảm nhận của bạn về bộ đồ này nha..."
          placeholderTextColor="#A090C5"
          multiline
          numberOfLines={6}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

        {/* CHỌN ẢNH */}
        <Text style={styles.label}>Hình ảnh thực tế (nếu có)</Text>
        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.previewImg} />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={20} color="#FF4D4D" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addImgBtn} onPress={pickImages}>
            <Ionicons name="camera-outline" size={30} color="#B59DFF" />
            <Text style={styles.addImgText}>Thêm ảnh</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmitReview}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  scrollContent: { padding: 20 },
  ratingBox: { alignItems: "center", marginBottom: 30 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A3B6B",
    marginBottom: 15,
  },
  starsRow: { flexDirection: "row" },
  ratingText: { marginTop: 10, color: "#B59DFF", fontWeight: "bold" },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 15,
    padding: 15,
    height: 150,
    backgroundColor: "#F9F9FF",
    color: "#333",
    marginBottom: 25,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },
  imageWrapper: { position: "relative" },
  previewImg: { width: 100, height: 100, borderRadius: 10 },
  removeBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  addImgBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B59DFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9FF",
  },
  addImgText: { fontSize: 12, color: "#B59DFF", marginTop: 5 },
  submitBtn: {
    backgroundColor: "#B59DFF",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    elevation: 3,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
