import {
    navigateToConfirmDeliveryCapture,
    savePendingConfirmDeliveryToken,
} from "@/src/utils/confirmDeliveryNavigation";
import { parseCosmateQr } from "@/src/utils/parseCosmateQr";
import {
    navigateToQrLoginApprove,
    savePendingQrLogin,
} from "@/src/utils/qrLoginNavigation";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QrScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const hasHandledScanRef = useRef(false);

  const requestPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      Alert.alert("Cấp quyền", "Cần cấp quyền camera để quét mã QR.");
    }
  }, []);

  React.useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (hasHandledScanRef.current) return;

    const payload = parseCosmateQr(data);
    if (!payload) {
      Alert.alert(
        "Mã QR không hợp lệ",
        "Vui lòng quét mã QR trên màn hình máy tính (đăng nhập hoặc xác nhận nhận hàng).",
      );
      return;
    }

    hasHandledScanRef.current = true;

    try {
      const authToken = await AsyncStorage.getItem("cosmate_token");

      if (payload.type === "confirm-delivery") {
        if (!authToken) {
          await savePendingConfirmDeliveryToken(payload.token, payload.apiBase);
          router.replace("/(auth)/login");
          return;
        }
        navigateToConfirmDeliveryCapture(payload.token, payload.apiBase);
        return;
      }

      if (!authToken) {
        await savePendingQrLogin({
          sessionId: payload.sessionId,
          apiBase: payload.apiBase,
        });
        router.replace("/(auth)/login");
        return;
      }
      navigateToQrLoginApprove(payload.sessionId, payload.apiBase);
    } catch {
      hasHandledScanRef.current = false;
      Alert.alert("Lỗi", "Không thể xử lý mã QR. Vui lòng thử lại.");
    }
  };

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : (
        <View style={styles.permissionFallback}>
          <Ionicons name="camera-outline" size={48} color="#8E7AB5" />
          <Text style={styles.permissionText}>
            {hasPermission === false
              ? "Chưa có quyền camera"
              : "Đang kiểm tra quyền camera..."}
          </Text>
          {hasPermission === false ? (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
            >
              <Text style={styles.permissionBtnText}>Cấp quyền lại</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Quét QR</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <View style={styles.scanOverlay} pointerEvents="none">
        <View style={styles.scanFrame} />
        <Text style={styles.scannerHint}>
          Quét mã QR trên máy tính (đăng nhập hoặc xác nhận nhận hàng)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#B59DFF",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  scannerHint: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    marginTop: 24,
    marginHorizontal: 32,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    overflow: "hidden",
    lineHeight: 20,
  },
  permissionFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#1a1a1a",
  },
  permissionText: {
    color: "#ccc",
    fontSize: 15,
    marginTop: 16,
    textAlign: "center",
  },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: "#B59DFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionBtnText: { color: "#fff", fontWeight: "700" },
});
