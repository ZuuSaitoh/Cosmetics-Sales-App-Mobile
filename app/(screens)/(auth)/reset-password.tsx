import axiosClient from "../api/axiosClient";
import { router, useLocalSearchParams } from "expo-router";
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

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const token = (params.token as string) || "";
  // Nếu có token → quên mật khẩu (từ email). Không có token → đổi mật khẩu (từ profile)
  const isForgotPassword = !!token;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    // Xác minh mật khẩu cũ (chỉ khi đổi mật khẩu từ profile)
    if (!isForgotPassword) {
      if (!oldPassword) {
        Alert.alert("Lỗi", "Vui lòng nhập mật khẩu cũ!");
        return;
      }
    }

    if (!newPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới!");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);
    try {
      // Đổi mật khẩu từ profile → xác minh mk cũ trước
      if (!isForgotPassword) {
        // Verify old password
        const verifyRes = await axiosClient.post("/auth/login", {
          usernameOrEmail: params.identifier as string || "",
          password: oldPassword,
        });
        if (verifyRes.data.code !== 0) {
          Alert.alert("Lỗi", "Mật khẩu cũ không đúng!");
          setIsLoading(false);
          return;
        }
      }

      const response = await axiosClient.post("/auth/password-reset", {
        token,
        newPassword,
      });

      if (response.data.code === 0) {
        Alert.alert(
          "Thành công",
          isForgotPassword
            ? "Mật khẩu đã được đặt lại. Hãy đăng nhập với mật khẩu mới."
            : "Mật khẩu đã được đổi thành công.",
          [
            {
              text: "OK",
              onPress: () =>
                isForgotPassword
                  ? router.replace("/(auth)/login")
                  : router.back(),
            },
          ],
        );
      } else {
        Alert.alert("Thất bại", response.data.message || "Đặt lại mật khẩu thất bại.");
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert("Lỗi", error.response.data?.message || "Đặt lại mật khẩu thất bại.");
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
            <Ionicons name="shield-checkmark-outline" size={50} color="#B59DFF" />
          </View>

          <Text style={styles.title}>
            {isForgotPassword ? "Đặt lại mật khẩu" : "Đổi mật khẩu"}
          </Text>
          <Text style={styles.subtitle}>
            {isForgotPassword
              ? "Nhập mật khẩu mới cho tài khoản của bạn."
              : "Nhập mật khẩu cũ để xác minh, sau đó đặt mật khẩu mới."}
          </Text>

          {/* Mật khẩu cũ — chỉ hiện khi đổi từ profile */}
          {!isForgotPassword && (
            <View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu cũ"
                  placeholderTextColor="#A090C5"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOld}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowOld(!showOld)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showOld ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#A090C5"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mật khẩu mới */}
          <View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới"
                placeholderTextColor="#A090C5"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#A090C5"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Xác nhận mật khẩu */}
          <View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor="#A090C5"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#A090C5"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, isLoading && styles.resetBtnDisabled]}
            onPress={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetBtnText}>
                {isForgotPassword ? "Đặt lại mật khẩu" : "Đổi mật khẩu"}
              </Text>
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
  passwordWrapper: { position: "relative", marginBottom: 16 },
  input: {
    backgroundColor: "#fff",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 16,
    color: "#4A3B6B",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtn: {
    backgroundColor: "#B59DFF",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  resetBtnDisabled: { opacity: 0.7 },
  resetBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
