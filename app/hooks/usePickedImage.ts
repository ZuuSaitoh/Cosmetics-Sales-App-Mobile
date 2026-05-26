import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";

export type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

function getFileName(uri: string) {
  const fileName = uri.split("/").pop() || `image-${Date.now()}.jpg`;
  return fileName.includes(".") ? fileName : `${fileName}.jpg`;
}

function getMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Chuẩn hóa URI cho FormData trên Android.
 * Android cần `file://` prefix, iOS trả sẵn.
 */
function normalizeUri(uri: string): string {
  if (Platform.OS === "android" && !uri.startsWith("file://")) {
    return `file://${uri}`;
  }
  return uri;
}

function assetToPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  const uri = normalizeUri(asset.uri);
  return {
    uri,
    name: asset.fileName || getFileName(asset.uri),
    type: asset.mimeType || getMimeType(asset.uri),
  };
}

export function usePickedImage() {
  const [image, setImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const pickFromLibrary = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Thiếu quyền", "Cần quyền truy cập thư viện ảnh để tiếp tục.");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return null;

      const picked = assetToPickedImage(result.assets[0]);
      setImage(picked);
      setPreviewUri(result.assets[0].uri);
      return picked;
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn ảnh từ thư viện.");
      return null;
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Thiếu quyền", "Cần quyền camera để chụp ảnh.");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return null;

      const picked = assetToPickedImage(result.assets[0]);
      setImage(picked);
      setPreviewUri(result.assets[0].uri);
      return picked;
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chụp ảnh từ camera.");
      return null;
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setPreviewUri(null);
  }, []);

  return {
    image,
    previewUri,
    pickFromLibrary,
    takePhoto,
    clearImage,
    setImage,
  };
}
