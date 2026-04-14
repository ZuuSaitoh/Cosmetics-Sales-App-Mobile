import AsyncStorage from "@react-native-async-storage/async-storage";
// 1. Dùng axiosClient thay vì axios mặc định
import axiosClient from '../api/axiosClient'; 
import { router } from "expo-router"; 
import { jwtDecode } from "jwt-decode";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      // 2. GỌI API QUA axiosClient (Chỉ cần viết cái "đuôi" /auth/login)
      const response = await axiosClient.post("/auth/login", {
        usernameOrEmail: email,
        password: password,
      });

      if (response.data.code === 0) {
        const token = response.data.result.token;

        // Lưu token vào máy
        await AsyncStorage.setItem("cosmate_token", token);

        // Giải mã check Role
        const decoded: any = jwtDecode(token);
        const roles = decoded.roles || []; 

        if (roles.includes("PROVIDER_RENTAL")) {
          // Chủ shop thuê đồ -> Vào thẳng Kho đồ (Items)
          router.replace("/(provider-tabs)/items");
        } else if (roles.includes("PROVIDER_PHOTOGRAPHER") || roles.includes("PROVIDER_STAFF")) {
          // Thợ ảnh / Staff -> Vào quản lý dịch vụ
          router.replace("/(provider-service-tabs)/service-management" as any);
        } else if (roles.includes("COSPLAYER")) {
          // Khách hàng -> Vào tab đơn hàng
          router.replace("/(tabs)");
        } else {
          Alert.alert("Lỗi phân quyền", "Tài khoản không hợp lệ!");
        }
      } else {
        Alert.alert("Đăng nhập thất bại", response.data.message || "Sai thông tin.");
      }
    } catch (error: any) {
      // Vì dùng axiosClient nên cấu trúc error vẫn giữ nguyên của axios
      if (error.response) {
        console.log("Lỗi từ Spring Boot:", error.response.data);
        Alert.alert("Lỗi", error.response.data.message || "Sai tài khoản hoặc mật khẩu.");
      } else {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ. Kiểm tra lại IP trong axiosClient nhé!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>CosMate</Text>
        <Text style={styles.subtitle}>Quản lý & Theo dõi đơn hàng</Text>

        <TextInput
          style={styles.input}
          placeholder="Email hoặc Tên đăng nhập"
          placeholderTextColor="#A090C5"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#A090C5"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", justifyContent: "center" },
  formContainer: { paddingHorizontal: 30 },
  title: { fontSize: 40, fontWeight: "900", color: "#4A3B6B", textAlign: "center", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#8E7AB5", textAlign: "center", marginBottom: 40 },
  input: {
    backgroundColor: "#FFFFFF",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#4A3B6B",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: "#B59DFF",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});