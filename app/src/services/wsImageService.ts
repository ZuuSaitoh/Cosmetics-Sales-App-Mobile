import { Platform } from "react-native";
import { rootAxiosClient } from "../api/axiosClient";

function appendImageToFormData(
  formData: FormData,
  imageUri: string,
  index: number,
) {
  const localUri =
    Platform.OS === "ios" ? imageUri.replace("file://", "") : imageUri;
  const filename = localUri.split("/").pop() || `confirm-${index + 1}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri: localUri,
    name: filename,
    type,
  } as any);
}

export const wsImageService = {
  /** sessionId = session token từ QR (confirm-delivery?token=...) */
  uploadImage: (sessionId: string, imageUri: string, index = 0) => {
    const formData = new FormData();
    appendImageToFormData(formData, imageUri, index);

    return rootAxiosClient.post("/ws-image/upload", formData, {
      params: { sessionId },
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** Upload 1–5 ảnh; mỗi ảnh một request (field `file` đơn). */
  uploadConfirmDeliveryImages: async (
    sessionId: string,
    imageUris: string[],
  ): Promise<void> => {
    for (let i = 0; i < imageUris.length; i++) {
      const res = await wsImageService.uploadImage(sessionId, imageUris[i], i);
      if (res.data?.code !== undefined && res.data.code !== 0) {
        throw Object.assign(new Error(res.data.message || "Upload thất bại"), {
          response: res,
        });
      }
    }
  },
};
