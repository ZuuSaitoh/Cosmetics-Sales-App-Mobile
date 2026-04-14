import axiosClient from "../api/axiosClient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ROLES = [
  {
    id: "COSPLAYER",
    label: "Cosplayer",
    desc: "Thuê trang phục & dịch vụ",
    icon: "person-outline" as const,
    color: "#FF6B9D",
    bg: "#FFF0F5",
  },
  {
    id: "PROVIDER_RENTAL",
    label: "Cho thuê trang phục",
    desc: "Mở shop cho thuê đồ cosplay",
    icon: "storefront-outline" as const,
    color: "#B59DFF",
    bg: "#F4F1FF",
  },
  {
    id: "PROVIDER_PHOTOGRAPHER",
    label: "Thợ ảnh",
    desc: "Cung cấp dịch vụ chụp ảnh cosplay",
    icon: "camera-outline" as const,
    color: "#FFB347",
    bg: "#FFF8E1",
  },
  {
    id: "PROVIDER_EVENT_STAFF",
    label: "Nhân sự sự kiện",
    desc: "Tham gia sự kiện cosplay",
    icon: "people-outline" as const,
    color: "#4ECDC4",
    bg: "#E8FAF8",
  },
];

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function RegisterScreen() {
  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên!";
    }
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email!";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Email không hợp lệ!";
    }
    if (!username.trim()) {
      newErrors.username = "Vui lòng nhập tên đăng nhập!";
    }
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu!";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự!";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu!";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp!";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    if (!selectedRole) {
      Alert.alert("Lỗi", "Vui lòng chọn vai trò!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/register", {
        fullName,
        email,
        username,
        password,
        role: selectedRole,
      });

      if (response.data.code === 0) {
        Alert.alert(
          "Đăng ký thành công!",
          "Bạn có thể đăng nhập ngay.",
          [
            {
              text: "Đăng nhập",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        );
      } else {
        Alert.alert("Đăng ký thất bại", response.data.message || "Vui lòng thử lại.");
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert("Lỗi", error.response.data?.message || "Đăng ký thất bại.");
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>CosMate</Text>
          <Text style={styles.subtitle}>
            {step === "role" ? "Chọn vai trò của bạn" : "Tạo tài khoản mới"}
          </Text>
        </View>

        {/* STEP 1: CHỌN ROLE */}
        {step === "role" && (
          <View style={styles.roleContainer}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  { backgroundColor: role.bg },
                  selectedRole === role.id && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.roleIconWrap,
                    {
                      backgroundColor:
                        selectedRole === role.id ? role.color : "#fff",
                    },
                  ]}
                >
                  <Ionicons
                    name={role.icon}
                    size={28}
                    color={
                      selectedRole === role.id ? "#fff" : role.color
                    }
                  />
                </View>
                <View style={styles.roleTextWrap}>
                  <Text
                    style={[
                      styles.roleLabel,
                      { color: selectedRole === role.id ? role.color : "#333" },
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text style={styles.roleDesc}>{role.desc}</Text>
                </View>
                {selectedRole === role.id && (
                  <View style={styles.roleCheckmark}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={role.color}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.nextBtn,
                !selectedRole && styles.nextBtnDisabled,
              ]}
              onPress={() => {
                if (!selectedRole) {
                  Alert.alert("Thông báo", "Vui lòng chọn vai trò!");
                  return;
                }
                setStep("form");
              }}
            >
              <Text style={styles.nextBtnText}>Tiếp tục</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: FORM ĐĂNG KÝ */}
        {step === "form" && (
          <View style={styles.formContainer}>
            {/* Role đã chọn */}
            {(() => {
              const role = ROLES.find((r) => r.id === selectedRole);
              return role ? (
                <TouchableOpacity
                  style={[styles.selectedRoleBanner, { backgroundColor: role.bg }]}
                  onPress={() => setStep("role")}
                >
                  <Ionicons name={role.icon} size={18} color={role.color} />
                  <Text style={[styles.selectedRoleText, { color: role.color }]}>
                    {role.label}
                  </Text>
                  <Text style={styles.changeRoleText}>Đổi vai trò</Text>
                </TouchableOpacity>
              ) : null;
            })()}

            <View>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Họ và tên"
                placeholderTextColor="#A090C5"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
                }}
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            <View>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email"
                placeholderTextColor="#A090C5"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View>
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="Tên đăng nhập"
                placeholderTextColor="#A090C5"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errors.username) setErrors((e) => ({ ...e, username: undefined }));
                }}
                autoCapitalize="none"
              />
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
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

            <View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  placeholder="Xác nhận mật khẩu"
                  placeholderTextColor="#A090C5"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                />
                <View style={styles.eyeBtn}>
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#A090C5"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Đăng ký</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep("role")}
            >
              <Ionicons name="arrow-back" size={18} color="#B59DFF" />
              <Text style={styles.backBtnText}> Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LINK ĐĂNG NHẬP */}
        {step === "role" && (
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.loginLinkBtn}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 30 },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 30 },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#4A3B6B",
    marginBottom: 5,
  },
  subtitle: { fontSize: 16, color: "#8E7AB5" },

  // ROLE STEP
  roleContainer: { flex: 1 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleCardSelected: { borderColor: "#B59DFF" },
  roleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTextWrap: { flex: 1, marginLeft: 14 },
  roleLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  roleDesc: { fontSize: 13, color: "#888" },
  roleCheckmark: { marginLeft: 8 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#B59DFF",
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 10,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },

  // FORM STEP
  formContainer: { flex: 1 },
  selectedRoleBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedRoleText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  changeRoleText: { fontSize: 13, color: "#888" },
  input: {
    backgroundColor: "#fff",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
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
    backgroundColor: "#fff",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 15,
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
  registerBtn: {
    backgroundColor: "#B59DFF",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
  },
  backBtnText: { fontSize: 15, fontWeight: "600", color: "#B59DFF" },

  // LOGIN LINK
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loginLinkText: { fontSize: 14, color: "#888" },
  loginLinkBtn: { fontSize: 14, fontWeight: "bold", color: "#B59DFF" },
});
