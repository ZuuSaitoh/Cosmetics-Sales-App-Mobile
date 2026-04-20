import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { walletService } from "@/src/services/walletService";

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

// Danh sách ngân hàng phổ biến Việt Nam
const BANK_LIST = [
  { code: "VCB", name: "Vietcombank" },
  { code: "VTB", name: "VietinBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "AGR", name: "Agribank" },
  { code: "MB", name: "MB Bank" },
  { code: "TPB", name: "TPBank" },
  { code: "ACB", name: "ACB" },
  { code: "TCB", name: "Techcombank" },
  { code: "VPB", name: "VPBank" },
  { code: "SHB", name: "SHB" },
  { code: "HDB", name: "HDBank" },
  { code: "MSB", name: "MSB" },
  { code: "OCB", name: "OCB" },
  { code: "SCB", name: "SCB" },
  { code: "STB", name: "Sacombank" },
  { code: "CTG", name: "CTG - Citibank" },
];

export default function WithdrawScreen() {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const formatInputAmount = (val: string) => {
    if (!val) return "";
    const rawValue = val.replace(/\D/g, "");
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatInputAmount(text);
    setDisplayAmount(formatted);
    const rawValue = formatted.replace(/\./g, "");
    setAmount(rawValue);
  };

  const handleWithdraw = async () => {
    if (!amount || parseInt(amount) < 50000) {
      Alert.alert("Lỗi", "Số tiền rút tối thiểu là 50.000đ");
      return;
    }
    if (!bankName) {
      Alert.alert("Lỗi", "Vui lòng chọn ngân hàng.");
      return;
    }
    if (!bankAccountNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số tài khoản.");
      return;
    }
    if (!bankAccountName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản.");
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn.");
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded.sub;

      const res = await walletService.withdraw({
        amount: parseInt(amount),
        bankName,
        bankAccountNumber: bankAccountNumber.trim(),
      });

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Yêu cầu rút tiền đã được gửi. Vui lòng chờ duyệt.", [
          {
            text: "OK",
            onPress: () => {
              router.push("/(screens)/withdraw-history" as any);
            },
          },
        ]);
        setAmount("");
        setDisplayAmount("");
        setBankName("");
        setBankAccountNumber("");
        setBankAccountName("");
      } else {
        Alert.alert("Lỗi", res.data.message || "Không thể tạo yêu cầu rút tiền.");
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Lỗi kết nối máy chủ.";
      Alert.alert("Lỗi", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rút tiền về tài khoản</Text>
        <TouchableOpacity
          onPress={() => router.push("/(screens)/withdraw-history" as any)}
        >
          <Ionicons name="time-outline" size={22} color="#4A3B6B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Số tiền rút */}
          <View style={styles.section}>
            <Text style={styles.label}>Số tiền rút (VND)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencySymbol}>₫</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#C4B5E0"
                keyboardType="numeric"
                value={displayAmount}
                onChangeText={handleAmountChange}
              />
            </View>

            <Text style={styles.minLabel}>Tối thiểu 50.000đ</Text>

            {/* Preset buttons */}
            <View style={styles.presetContainer}>
              {PRESET_AMOUNTS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetBtn,
                    amount === val.toString() && styles.presetBtnActive,
                  ]}
                  onPress={() => handleAmountChange(val.toString())}
                >
                  <Text
                    style={[
                      styles.presetText,
                      amount === val.toString() && styles.presetTextActive,
                    ]}
                  >
                    {val >= 1000000
                      ? `${(val / 1000000).toFixed(0)}M`
                      : `${val / 1000}k`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Thông tin tài khoản ngân hàng */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản nhận tiền</Text>

            {/* Chọn ngân hàng */}
            <Text style={styles.label}>Ngân hàng</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowBankModal(true)}
            >
              <Text
                style={[
                  styles.selectPlaceholder,
                  bankName && styles.selectTextFilled,
                ]}
              >
                {bankName || "— Chọn ngân hàng —"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#8E7AB5" />
            </TouchableOpacity>

            {/* Số tài khoản */}
            <Text style={styles.label}>Số tài khoản</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số tài khoản"
              placeholderTextColor="#C4B5E0"
              keyboardType="number-pad"
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
            />

            {/* Tên chủ tài khoản */}
            <Text style={styles.label}>Tên chủ tài khoản</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên chủ tài khoản"
              placeholderTextColor="#C4B5E0"
              autoCapitalize="words"
              value={bankAccountName}
              onChangeText={setBankAccountName}
            />
          </View>

          {/* Nút rút tiền */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleWithdraw}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Rút tiền ngay</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            * Yêu cầu rút tiền sẽ được xử lý trong 1-3 ngày làm việc.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal chọn ngân hàng */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showBankModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bankList} showsVerticalScrollIndicator={false}>
              {BANK_LIST.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  style={[
                    styles.bankItem,
                    bankName === bank.name && styles.bankItemActive,
                  ]}
                  onPress={() => {
                    setBankName(bank.name);
                    setShowBankModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.bankName,
                      bankName === bank.name && styles.bankNameActive,
                    ]}
                  >
                    {bank.name}
                  </Text>
                  {bankName === bank.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#B59DFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Import Modal

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  scrollContent: { padding: 20, paddingBottom: 50 },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A3B6B",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E7AB5",
    marginBottom: 8,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0D7FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A3B6B",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A3B6B",
    padding: 0,
  },
  minLabel: {
    fontSize: 12,
    color: "#A090C5",
    marginTop: 6,
    marginBottom: 14,
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0D7FF",
  },
  presetBtnActive: {
    backgroundColor: "#B59DFF",
    borderColor: "#B59DFF",
  },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A3B6B",
  },
  presetTextActive: { color: "#fff" },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  selectPlaceholder: { fontSize: 15, color: "#C4B5E0" },
  selectTextFilled: { fontSize: 15, color: "#4A3B6B", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0D7FF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#4A3B6B",
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#B59DFF",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disclaimer: {
    fontSize: 12,
    color: "#A090C5",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 0,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 17, fontWeight: "bold", color: "#4A3B6B" },
  bankList: { paddingBottom: 20 },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  bankItemActive: { backgroundColor: "#F9F8FF" },
  bankName: { fontSize: 15, color: "#333" },
  bankNameActive: {
    fontSize: 15,
    fontWeight: "600",
    color: "#B59DFF",
  },
});