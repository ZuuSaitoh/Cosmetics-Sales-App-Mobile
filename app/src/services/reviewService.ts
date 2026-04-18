import axiosClient from "../api/axiosClient";

export const reviewService = {
  getByCostume: (costumeId: number) =>
    axiosClient.get(`/reviews/costume/${costumeId}`),

  getByOrder: (orderId: number) =>
    axiosClient.get(`/reviews/order/${orderId}`),

  submit: (data: {
    cosplayerId: number;
    orderId: number;
    rating: number;
    comment: string;
    files?: { uri: string; name: string; type: string }[];
  }) => {
    const formData = new FormData();
    formData.append("cosplayerId", String(data.cosplayerId));
    formData.append("orderId", String(data.orderId));
    formData.append("rating", String(data.rating));
    formData.append("comment", data.comment);
    data.files?.forEach((file) => {
      formData.append("files", { uri: file.uri, name: file.name, type: file.type } as any);
    });
    return axiosClient.post("/reviews", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};