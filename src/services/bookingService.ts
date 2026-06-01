import axiosClient from "../api/axiosClient";

/** Service orders — thay cho API /bookings cũ (đã gỡ trên BE mới). */
export const bookingService = {
  getByProvider: () => axiosClient.get("/service-orders/provider"),

  create: (data: Record<string, unknown>) =>
    axiosClient.post("/service-orders/provider-create", data),

  pay: (
    serviceOrderId: number,
    params: { paymentMethod: string; returnUrl: string; isMobile?: boolean },
  ) =>
    axiosClient.post(`/service-orders/${serviceOrderId}/pay`, null, {
      params: { isMobile: true, ...params },
    }),

  confirm: (serviceOrderId: number) =>
    axiosClient.post(`/service-orders/${serviceOrderId}/confirm-by-cosplayer`),

  cancel: (serviceOrderId: number) =>
    axiosClient.post(`/service-orders/${serviceOrderId}/cancel`),
};
