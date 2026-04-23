import { authService } from "@/src/services/authService";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!identifier.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email hoặc tên đăng nhập!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.passwordResetRequest({
        identifier,
      });

      if (response.data.code === 0) {
        Alert.alert(
          "Đã gửi email đặt lại mật khẩu",
          "Vui lòng kiểm tra hộp thư để đặt lại mật khẩu mới.",
          [
            {
              text: "Quay lại đăng nhập",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        );
      } else {
        Alert.alert("Thất bại", response.data.message || "Không tìm thấy tài khoản.");
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert("Lỗi", error.response.data?.message || "Gửi yêu cầu thất bại.");
      } else {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#4A3B6B" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={50} color="#B59DFF" />
          </View>

          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Nhập email hoặc tên đăng nhập, chúng tôi sẽ gửi link đặt lại mật khẩu đến email của bạn.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email hoặc tên đăng nhập"
            placeholderTextColor="#A090C5"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
            onPress={handleSendRequest}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Gửi yêu cầu</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F4F1FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4A3B6B",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E7AB5",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#4A3B6B",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    marginBottom: 20,
  },
  sendBtn: {
    backgroundColor: "#B59DFF",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
