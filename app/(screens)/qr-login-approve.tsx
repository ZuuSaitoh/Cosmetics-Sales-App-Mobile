import { authService } from "@/src/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { getAppAccessToken } from "@/src/utils/appAccessToken";
import { router, useLocalSearchParams } from "expo-router";
import { jwtDecode } from "jwt-decode";
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
  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message;

  if (status === 410) {
    return "Phiên QR đã hết hạn. Vui lòng quét lại mã trên máy tính.";
  }
  if (status === 403) {
    return message || "Bạn không có quyền xác nhận đăng nhập này.";
  }
  if (status === 404) {
    return "Không tìm thấy phiên QR. Kiểm tra mã QR mới hoặc apiBase trên mã.";
  }
  if (status === 401) {
    if (error.message === "APP_JWT_EXPIRED") {
      return "Phiên đăng nhập app đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (message && typeof message === "string" && message.trim()) {
      return message;
    }
    return "Không xác thực được. Vui lòng đăng nhập lại app và thử lại.";
  }
  if (message && typeof message === "string") return message;
  return "Không thể xác nhận. Vui lòng thử lại.";
}

async function assertAppJwtValid(): Promise<void> {
  const token = await getAppAccessToken();
  if (!token) {
    const err = new Error("NOT_LOGGED_IN") as Error & {
      response?: { status: number };
    };
    err.response = { status: 401 };
    throw err;
  }

  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      const err = new Error("APP_JWT_EXPIRED") as Error & {
        response?: { status: number };
      };
      err.response = { status: 401 };
      throw err;
    }
  } catch (e) {
    if ((e as Error).message === "APP_JWT_EXPIRED") throw e;
    const err = new Error("APP_JWT_INVALID") as Error & {
      response?: { status: number };
    };
    err.response = { status: 401 };
    throw err;
  }
}

export default function QrLoginApproveScreen() {
  const { sessionId, apiBase } = useLocalSearchParams<{
    sessionId?: string;
    apiBase?: string;
  }>();
  const qrSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
  const qrApiBase = typeof apiBase === "string" ? apiBase.trim() : undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!qrSessionId) {
      Alert.alert("Lỗi", "Phiên đăng nhập không hợp lệ. Vui lòng quét lại mã QR.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [qrSessionId]);

  const handleApprove = async () => {
    if (!qrSessionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await assertAppJwtValid();

      const res = await authService.approveQrLogin(qrSessionId, qrApiBase);

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
      if (
        error.message === "NOT_LOGGED_IN" ||
        error.message === "APP_JWT_EXPIRED" ||
        error.message === "APP_JWT_INVALID"
      ) {
        Alert.alert("Lỗi", mapApproveError(error), [
          { text: "Đăng nhập", onPress: () => router.replace("/(auth)/login") },
          { text: "Hủy", style: "cancel" },
        ]);
        return;
      }

      Alert.alert("Lỗi", mapApproveError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!qrSessionId) {
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
