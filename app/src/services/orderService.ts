import axiosClient from "../api/axiosClient";

export const orderService = {
  getUserOrders: (userId: number) => axiosClient.get(`/orders/user/${userId}`),

  getProviderOrders: (providerId: number) =>
    axiosClient.get(`/orders/provider/${providerId}`),

  getOrder: (orderId: number) => axiosClient.get(`/orders/${orderId}`),

  createOrder: (cosplayerId: number, data: Record<string, unknown>) =>
    axiosClient.post(`/orders?cosplayerId=${cosplayerId}`, data),

  cancelOrder: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/cancel`, { status: "CANCELLED" }),

  repayOrder: (
    orderId: number,
    params: { cosplayerId: number; paymentMethod: string; returnUrl: string },
  ) => axiosClient.post(`/orders/${orderId}/pay`, null, { params }),

  confirmDelivery: (
    orderId: number,
    images?: { uri: string; name: string; type: string }[],
  ) => {
    const formData = new FormData();
    images?.forEach((img) => {
      formData.append("images", {
        uri: img.uri,
        name: img.name,
        type: img.type,
      } as any);
    });
    return axiosClient.post(`/orders/${orderId}/confirm-delivery`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  prepareOrder: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/prepare`),

  shipOrder: (
    orderId: number,
    formData: FormData,
    params: { trackingCode?: string }, // 🚩 Sửa ở đây
  ) =>
    axiosClient.post(`/orders/${orderId}/ship`, formData, {
      params,
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deliverOut: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/deliver-out`),

  completeOrder: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/complete`),

  updateOrderStatus: (orderId: number, status: string) =>
    axiosClient.put(`/orders/${orderId}/status`, { status }),

  getOrderTracking: (orderId: number) =>
    axiosClient.get(`/order-tracking/order/${orderId}`),

  confirmPayment: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/confirm-payment`),

  returnItem: (orderId: number, trackingCode: string, imageUri: string) => {
    const formData = new FormData();

    // Xử lý file ảnh từ URI
    const filename = imageUri.split("/").pop() || "return-image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    // Append đúng tên 'images' như Swagger yêu cầu
    formData.append("images", { uri: imageUri, name: filename, type } as any);

    return axiosClient.post(`/orders/${orderId}/return`, formData, {
      params: {
        trackingCode: trackingCode, // Đẩy lên URL dưới dạng Query
      },
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "*/*",
      },
    });
  },

  getCostumeImage: (costumeId: number) =>
    axiosClient.get(`/images/costume/${costumeId}`),
};
