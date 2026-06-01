import axiosClient from "../api/axiosClient";

export type UploadFilePayload = {
  uri: string;
  name: string;
  type: string;
};

export const uploadService = {
  uploadSingleImage: (file: UploadFilePayload) => {
    const formData = new FormData();
    formData.append("file", file as any);
    return axiosClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
