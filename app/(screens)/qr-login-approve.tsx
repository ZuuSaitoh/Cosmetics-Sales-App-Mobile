import { authService } from "@/src/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function mapApproveError(error: any): string {
  const status = error.response?.status;
  const message = error.response?.data?.message;

  if (status === 410) {
    return "Phiên QR đã hết hạn. Vui lòng quét lại mã trên máy tính.";
  }
  if (status === 403) {
    return message || "Bạn không có quyền xác nhận đăng nhập này.";
  }
  if (status === 401) {
    return "Phiên đăng nhập app đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (message) return message;
  return "Không thể xác nhận. Vui lòng thử lại.";
}

export default function QrLoginApproveScreen() {
  const { sessionToken } = useLocalSearchParams<{ sessionToken?: string }>();
  const loginSessionToken =
    typeof sessionToken === "string" ? sessionToken.trim() : "";

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loginSessionToken) {
      Alert.alert("Lỗi", "Phiên đăng nhập không hợp lệ. Vui lòng quét lại mã QR.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [loginSessionToken]);

  const handleApprove = async () => {
    if (!loginSessionToken) return;

    setIsSubmitting(true);
    try {
      const res = await authService.approveQrLogin(loginSessionToken);

      if (res.data?.code !== undefined && res.data.code !== 0) {
        Alert.alert("Thông báo", res.data.message || "Không thể xác nhận.");
        return;
      }

      Alert.alert(
        "Thành công",
        "Đã cho phép đăng nhập trên máy tính.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert("Lỗi", mapApproveError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loginSessionToken) {
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
        <Text style={styles.headerTitle}>Xác nhận đăng nhập</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="desktop-outline" size={40} color="#B59DFF" />
        </View>

        <Text style={styles.title}>Cho phép đăng nhập trên trình duyệt?</Text>
        <Text style={styles.subtitle}>
          Một thiết bị đang yêu cầu đăng nhập CosMate bằng tài khoản của bạn.
          Chỉ xác nhận nếu bạn đang thao tác trên máy tính của mình.
        </Text>

        <TouchableOpacity
          style={[styles.approveBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleApprove}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.approveBtnText}>Xác nhận</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A3B6B",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E7AB5",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  approveBtn: {
    width: "100%",
    backgroundColor: "#B59DFF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  approveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnDisabled: { opacity: 0.7 },
  cancelBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  cancelBtnText: { color: "#8E7AB5", fontSize: 16, fontWeight: "600" },
});
