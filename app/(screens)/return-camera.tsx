import { orderService } from "@/src/services/orderService";
import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function ReturnCameraScreen() {
  const { id } = useLocalSearchParams(); // Nhận id đơn hàng
  const [returnImage, setReturnImage] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Mở Camera bắt buộc (chống gian lận)
  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Cấp quyền",
        "Vui lòng cho phép ứng dụng dùng Camera để chụp ảnh nhé!",
      );
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setReturnImage(result.assets[0]);
    }
  };

  const submitReturn = async () => {
    if (!returnImage) {
      Alert.alert(
        "Thiếu thông tin",
        "Bạn phải chụp ảnh tình trạng đồ trước khi gửi trả để bảo vệ tiền cọc nhé!",
      );
      return;
    }
    if (!trackingCode.trim()) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập mã vận đơn để Chủ shop dễ dàng theo dõi.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 🚩 Gọi API với đúng 3 tham số tách biệt: ID đơn, Mã vận đơn, và Link ảnh
      // (Đảm bảo sếp đã cập nhật hàm returnItem trong orderService.ts như tui chỉ ở trên)
      const res = await orderService.returnItem(
        Number(id),
        trackingCode,
        returnImage.uri, // Gửi trực tiếp đường dẫn ảnh để Service tự đóng gói FormData
      );

      if (res.data.code === 0) {
        Alert.alert("Hoàn tất", "Đã gửi thông tin trả hàng thành công! 🫡", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Thông báo", res.data.message || "Không thể trả hàng.");
      }
    } catch (error: any) {
      console.error("Lỗi trả hàng:", error);
      // Hiển thị lỗi chi tiết hơn để dễ debug
      const errorMsg = error.response?.data?.message || "Lỗi kết nối Server";
      Alert.alert("Lỗi Hệ Thống", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenScanner = async () => {
    // Tái sử dụng quyền camera của ImagePicker hoặc expo-camera đều được
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cấp quyền", "Cần cấp quyền camera để quét mã QR.");
      return;
    }
    setIsScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (data) {
      setTrackingCode(data.toUpperCase());
      setIsScannerVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận Trả đồ</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.warningBox}>
            <Ionicons name="shield-checkmark" size={24} color="#FF9900" />
            <Text style={styles.warningText}>
              Chụp ảnh tình trạng bộ đồ lúc đóng gói giúp bạn lấy lại 100% tiền
              cọc nếu đồ không bị hư hại.
            </Text>
          </View>

          <Text style={styles.label}>Ảnh minh chứng (Bắt buộc)</Text>
          <TouchableOpacity style={styles.imageBox} onPress={takePicture}>
            {returnImage ? (
              <Image
                source={{ uri: returnImage.uri }}
                style={styles.imagePreview}
              />
            ) : (
              <>
                <Ionicons name="camera" size={40} color="#B59DFF" />
                <Text style={styles.imageBoxText}>Bấm để mở Camera</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Mã vận đơn hoàn trả (Bắt buộc)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputText}
              placeholder="Ví dụ: GHTK123456789..."
              value={trackingCode}
              onChangeText={setTrackingCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.qrScanBtn}
              onPress={handleOpenScanner}
            >
              <Ionicons name="qr-code-outline" size={24} color="#FF9900" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnSubmit, isSubmitting && { opacity: 0.7 }]}
            onPress={submitReturn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSubmitText}>Gửi yêu cầu trả hàng</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Modal Quét QR (Tương tự như bên Provider) */}
      <Modal
        visible={isScannerVisible}
        animationType="slide"
        onRequestClose={() => setIsScannerVisible(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              isScannerVisible ? handleBarcodeScanned : undefined
            }
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scannerHint}>Đưa mã QR vào khung để quét</Text>
          </View>
          <TouchableOpacity
            style={styles.scannerCloseBtn}
            onPress={() => setIsScannerVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  content: { padding: 20 },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FFF9F0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    color: "#D97706",
    fontSize: 13,
    lineHeight: 20,
  },
  label: { fontSize: 15, fontWeight: "bold", color: "#333", marginBottom: 10 },
  imageBox: {
    height: 180,
    backgroundColor: "#F4F1FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1C4E9",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imageBoxText: { marginTop: 10, color: "#8E7AB5", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    marginBottom: 30,
    color: "#333",
  },
  btnSubmit: {
    backgroundColor: "#FF9900",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#FF9900",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  btnSubmitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D7FF",
    borderRadius: 10,
    backgroundColor: "#F8F9FA",
    marginBottom: 30,
  },
  inputText: { flex: 1, padding: 15, fontSize: 16, color: "#333" },
  qrScanBtn: { padding: 12, justifyContent: "center", alignItems: "center" },
  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FF9900",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  scannerHint: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  scannerCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});
