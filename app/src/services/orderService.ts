import axiosClient from "../api/axiosClient";

export const orderService = {
  getUserOrders: (userId: number) =>
    axiosClient.get(`/orders/user/${userId}`),

  getProviderOrders: (providerId: number) =>
    axiosClient.get(`/orders/provider/${providerId}`),

  getOrder: (orderId: number) =>
    axiosClient.get(`/orders/${orderId}`),

  createOrder: (cosplayerId: number, data: Record<string, unknown>) =>
    axiosClient.post(`/orders?cosplayerId=${cosplayerId}`, data),

  cancelOrder: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/cancel`, { status: "CANCELLED" }),

  repayOrder: (orderId: number, params: { cosplayerId: number; paymentMethod: string; returnUrl: string }) =>
    axiosClient.post(`/orders/${orderId}/pay`, null, { params }),

  confirmDelivery: (orderId: number, images?: { uri: string; name: string; type: string }[]) => {
    const formData = new FormData();
    images?.forEach((img) => {
      formData.append("images", { uri: img.uri, name: img.name, type: img.type } as any);
    });
    return axiosClient.post(`/orders/${orderId}/confirm-delivery`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  prepareOrder: (orderId: number) =>
    axiosClient.post(`/orders/${orderId}/prepare`),

  shipOrder: (orderId: number, params: { trackingNumber?: string }) =>
    axiosClient.post(`/orders/${orderId}/ship`, null, { params }),

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

  returnItem: (orderId: number, params: {
    returnCondition: string;
    trackingCode?: string;
    note?: string;
    evidenceImages?: string[];
  }) => {
    const formData = new FormData();
    params.evidenceImages?.forEach((uri) => {
      const filename = uri.split("/").pop() || "return-image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("images", { uri, name: filename, type } as any);
    });
    const qs = params.trackingCode ? `?trackingCode=${encodeURIComponent(params.trackingCode)}` : "";
    return axiosClient.post(`/orders/${orderId}/return${qs}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getCostumeImage: (costumeId: number) =>
    axiosClient.get(`/images/costume/${costumeId}`),
};