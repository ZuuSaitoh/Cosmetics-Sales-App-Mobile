import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../api/axiosClient";
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
import { Ionicons } from "@expo/vector-icons";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email hoặc tên đăng nhập!";
    } else if (email.includes("@") && !isValidEmail(email)) {
      newErrors.email = "Email không hợp lệ!";
    }
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu!";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự!";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/login", {
        usernameOrEmail: email,
        password: password,
      });

      if (response.data.code === 0) {
        const token = response.data.result.token;
        await AsyncStorage.setItem("cosmate_token", token);

        const decoded: any = jwtDecode(token);
        const roles = decoded.roles || [];

        if (roles.includes("PROVIDER_RENTAL")) {
          router.replace("/(provider-tabs)/items");
        } else if (
          roles.includes("PROVIDER_PHOTOGRAPHER") ||
          roles.includes("PROVIDER_STAFF")
        ) {
          router.replace("/(provider-service-tabs)/service-management" as any);
        } else if (roles.includes("COSPLAYER")) {
          router.replace("/(tabs)");
        } else {
          Alert.alert("Lỗi phân quyền", "Tài khoản không hợp lệ!");
        }
      } else {
        Alert.alert("Đăng nhập thất bại", response.data.message || "Sai thông tin.");
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert("Lỗi", error.response.data?.message || "Sai tài khoản hoặc mật khẩu.");
      } else {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
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

        <View>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Email hoặc Tên đăng nhập"
            placeholderTextColor="#A090C5"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.passwordInput, errors.password && styles.inputError]}
              placeholder="Mật khẩu"
              placeholderTextColor="#A090C5"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
            />
            <View style={styles.eyeBtn}>
              <TouchableOpacity
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
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

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

        <View style={styles.registerLink}>
          <Text style={styles.registerLinkText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
            <Text style={styles.registerLinkBtn}>Đăng kí</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#FF5252",
  },
  errorText: {
    fontSize: 12,
    color: "#FF5252",
    marginBottom: 10,
    marginLeft: 4,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    backgroundColor: "#FFFFFF",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 16,
    color: "#4A3B6B",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    marginBottom: 4,
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
  loginButton: {
    backgroundColor: "#B59DFF",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  registerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerLinkText: { fontSize: 14, color: "#888" },
  registerLinkBtn: { fontSize: 14, fontWeight: "bold", color: "#B59DFF" },
});