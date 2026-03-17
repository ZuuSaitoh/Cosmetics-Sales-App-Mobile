import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router"; // Dùng để chuyển trang
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

// ⚠️ THAY CÁI NÀY BẰNG IPV4 CỦA MÁY TÍNH BẠN
const API_URL = "http://192.168.101.107:8080/api/auth/login";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Trạng thái đang gọi API

  // Hàm xử lý Đăng nhập
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(API_URL, {
        usernameOrEmail: email, // Khớp với JSON bạn đưa
        password: password,
      });

      // Kiểm tra schema JSON trả về (code: 0 là thành công)
      if (response.data.code === 0) {
        const token = response.data.result.token;

        // 1. Lưu token vào bộ nhớ điện thoại
        await AsyncStorage.setItem("cosmate_token", token);

        // 2. GIẢI MÃ TOKEN ĐỂ CHECK ROLE
        const decoded: any = jwtDecode(token);
        const roles = decoded.roles || []; // Lấy mảng roles từ token ra

        // 3. RẼ NHÁNH CHUYỂN TRANG THEO ROLE ĐÍCH DANH
        if (roles.includes("PROVIDER_RENTAL")) {
          // Nếu là Chủ shop -> Đá sang thư mục Quản lý Item
          router.replace("/(provider)/items");
        } else if (roles.includes("COSPLAYER")) {
          // Nếu là Khách đi thuê -> Đá sang màn hình Track đơn hàng
          router.replace("/(tabs)");
        } else {
          // Lưới an toàn: Bắt lỗi nếu tài khoản bị mất Role ở database
          Alert.alert(
            "Lỗi phân quyền",
            "Tài khoản của bạn chưa được cấp quyền hợp lệ!",
          );
        }
      } else {
        // API trả về lỗi (sai pass, user không tồn tại...)
        Alert.alert(
          "Đăng nhập thất bại",
          response.data.message || "Sai thông tin.",
        );
      }
    } catch (error: any) {
      setIsLoading(false); // Tắt vòng xoay loading

      if (error.response) {
        // Server ĐÃ NHẬN được request nhưng trả về lỗi (400, 401, 403, 500...)
        console.log("Chi tiết lỗi từ Spring Boot:", error.response.data);
        Alert.alert(
          "Sai thông tin (Lỗi 400)",
          `Server báo: ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.request) {
        // Bấm gửi nhưng Server không thèm trả lời (Tắt server, sai IP)
        Alert.alert("Lỗi mạng", "Không thể kết nối đến máy chủ.");
      } else {
        // Lỗi do code React Native của mình
        Alert.alert("Lỗi App", error.message);
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

        {/* Nút Đăng nhập có trạng thái Loading */}
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
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#4A3B6B",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E7AB5",
    textAlign: "center",
    marginBottom: 40,
  },
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
