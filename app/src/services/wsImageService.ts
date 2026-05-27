import axios from "axios";
import { Platform } from "react-native";
import { normalizeApiOrigin, rootAxiosClient } from "../api/axiosClient";
import { getAppAccessToken } from "../utils/appAccessToken";

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

async function postWsImageUpload(
  sessionId: string,
  imageUri: string,
  index: number,
  apiBase?: string,
) {
  const formData = new FormData();
  appendImageToFormData(formData, imageUri, index);

  const origin = normalizeApiOrigin(apiBase);
  const accessToken = await getAppAccessToken();
  if (!accessToken) {
    throw Object.assign(new Error("NOT_LOGGED_IN"), {
      response: {
        status: 401,
        data: { message: "Vui lòng đăng nhập app để gửi ảnh." },
      },
    });
  }
  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${accessToken}`,
  };

  if (apiBase?.trim()) {
    return axios.post(`${origin}/ws-image/upload`, formData, {
      params: { sessionId },
      headers,
    });
  }

  return rootAxiosClient.post("/ws-image/upload", formData, {
    params: { sessionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export const wsImageService = {
  /** sessionId = session token từ QR (confirm-delivery?token=...) */
  uploadImage: (sessionId: string, imageUri: string, apiBase?: string, index = 0) =>
    postWsImageUpload(sessionId, imageUri, index, apiBase),

  /** Upload 1–5 ảnh; mỗi ảnh một request (field `file` đơn). */
  uploadConfirmDeliveryImages: async (
    sessionId: string,
    imageUris: string[],
    apiBase?: string,
  ): Promise<void> => {
    for (let i = 0; i < imageUris.length; i++) {
      const res = await wsImageService.uploadImage(
        sessionId,
        imageUris[i],
        apiBase,
        i,
      );
      if (res.data?.code !== undefined && res.data.code !== 0) {
        throw Object.assign(new Error(res.data.message || "Upload thất bại"), {
          response: res,
        });
      }
    }
  },
};
