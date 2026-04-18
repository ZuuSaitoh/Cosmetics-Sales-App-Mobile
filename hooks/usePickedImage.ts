import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      const picked = {
        uri: asset.uri,
        name: getFileName(asset.uri),
        type: asset.mimeType || getMimeType(asset.uri),
      };

      setImage(picked);
      setPreviewUri(asset.uri);
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

      const asset = result.assets[0];
      const picked = {
        uri: asset.uri,
        name: getFileName(asset.uri),
        type: asset.mimeType || getMimeType(asset.uri),
      };

      setImage(picked);
      setPreviewUri(asset.uri);
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
