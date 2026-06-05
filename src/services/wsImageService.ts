import axios from "axios";
import { Platform } from "react-native";
import { normalizeApiOrigin, rootAxiosClient } from "../api/axiosClient";
import { getAppAccessToken } from "../utils/appAccessToken";

function appendMediaToFormData(
  formData: FormData,
  mediaUri: string,
  index: number,
  mimeType?: string,
) {
  const localUri =
    Platform.OS === "ios" ? mediaUri.replace("file://", "") : mediaUri;
  const filename = localUri.split("/").pop() || `confirm-${index + 1}.jpg`;
  
  let type = mimeType;
  if (!type) {
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : "";
    if (["mp4", "mov", "m4v", "3gp", "avi", "quicktime"].includes(ext)) {
      type = `video/${ext === "mov" ? "quicktime" : ext}`;
    } else {
      type = match ? `image/${match[1]}` : "image/jpeg";
    }
  }

  formData.append("file", {
    uri: localUri,
    name: filename,
    type,
  } as any);
}

async function postWsImageUpload(
  sessionId: string,
  mediaUri: string,
  index: number,
  apiBase?: string,
  mimeType?: string,
) {
  const formData = new FormData();
  appendMediaToFormData(formData, mediaUri, index, mimeType);

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
  uploadImage: (
    sessionId: string,
    mediaUri: string,
    apiBase?: string,
    index = 0,
    mimeType?: string,
  ) => postWsImageUpload(sessionId, mediaUri, index, apiBase, mimeType),

  /** Upload 1–5 ảnh/video; mỗi file một request (field `file` đơn). */
  uploadConfirmDeliveryImages: async (
    sessionId: string,
    assets: { uri: string; mimeType?: string }[],
    apiBase?: string,
  ): Promise<void> => {
    for (let i = 0; i < assets.length; i++) {
      const res = await wsImageService.uploadImage(
        sessionId,
        assets[i].uri,
        apiBase,
        i,
        assets[i].mimeType,
      );
      if (res.data?.code !== undefined && res.data.code !== 0) {
        throw Object.assign(new Error(res.data.message || "Upload thất bại"), {
          response: res,
        });
      }
    }
  },
};
