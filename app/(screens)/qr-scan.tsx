import {
  openConfirmDeliveryFromQr,
  savePendingConfirmDelivery,
} from "@/src/utils/confirmDeliveryNavigation";
import { parseCosmateQr } from "@/src/utils/parseCosmateQr";
import { getAppAccessToken } from "@/src/utils/appAccessToken";
import {
  navigateToQrLoginApprove,
  savePendingQrLogin,
} from "@/src/utils/qrLoginNavigation";
import { alertOnce } from "@/src/utils/alertOnce";
import { Ionicons } from "@expo/vector-icons";
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
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const processingRef = useRef(false);
  const alertGuardRef = useRef(false);
  const lastInvalidRawRef = useRef<string | null>(null);

  const lockScanner = useCallback(() => {
    setScannerEnabled(false);
  }, []);

  const showScanIssue = useCallback(
    (title: string, message: string, goBack = true) => {
      lockScanner();
      alertOnce(alertGuardRef, title, message, () => {
        if (goBack) {
          router.back();
        } else {
          setScannerEnabled(true);
          processingRef.current = false;
          lastInvalidRawRef.current = null;
        }
      });
    },
    [lockScanner],
  );

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
    if (!scannerEnabled || processingRef.current) return;

    const payload = parseCosmateQr(data);
    if (!payload) {
      if (lastInvalidRawRef.current === data) return;
      lastInvalidRawRef.current = data;
      showScanIssue(
        "Mã QR không hợp lệ",
        "Vui lòng quét mã QR trên màn hình máy tính (đăng nhập hoặc gửi ảnh minh chứng).",
        true,
      );
      return;
    }

    processingRef.current = true;
    lockScanner();

    try {
      const authToken = await getAppAccessToken();

      if (payload.type === "confirm-delivery") {
        if (!payload.userId) {
          showScanIssue(
            "Mã QR không hợp lệ",
            "Mã gửi ảnh minh chứng thiếu userId. Vui lòng tạo mã QR mới trên web.",
          );
          return;
        }

        const navParams = {
          token: payload.token,
          apiBase: payload.apiBase,
          userId: payload.userId,
          orderId: payload.orderId,
          pickerMode: payload.pickerMode,
        };

        if (!authToken) {
          await savePendingConfirmDelivery(navParams);
          router.replace("/(auth)/login");
          return;
        }

        const result = await openConfirmDeliveryFromQr(navParams);
        if (!result.ok) {
          showScanIssue("Không thể tiếp tục", result.message);
          return;
        }
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
      showScanIssue("Lỗi", "Không thể xử lý mã QR. Vui lòng thử lại.");
    } finally {
      processingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scannerEnabled ? handleBarcodeScanned : undefined
          }
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
          Quét mã QR trên máy tính (đăng nhập hoặc gửi ảnh minh chứng)
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
