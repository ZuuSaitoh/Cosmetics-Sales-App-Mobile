import axiosClient from "../api/axiosClient";

export const disputeService = {
  getByOrder: (orderId: number) =>
    axiosClient.get(`/disputes/order/${orderId}`),

  create: (data: { orderId: number; reason: string; evidenceImages?: string[] }) => {
    const formData = new FormData();
    formData.append("reason", data.reason);
    data.evidenceImages?.forEach((img) => {
      const filename = img.split("/").pop() || "evidence.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("files", { uri: img, name: filename, type } as any);
    });
    return axiosClient.post(`/disputes?orderId=${data.orderId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadEvidence: (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append("file", file as any);
    return axiosClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};