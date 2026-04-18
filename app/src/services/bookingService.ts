import axiosClient from "../api/axiosClient";

export const bookingService = {
  getByProvider: (providerId: number) =>
    axiosClient.get(`/bookings/provider/${providerId}`),

  create: (cosplayerId: number, data: Record<string, unknown>) =>
    axiosClient.post(`/bookings?cosplayerId=${cosplayerId}`, data),

  pay: (bookingId: number, params: { cosplayerId: number; paymentMethod: string; returnUrl: string }) =>
    axiosClient.post(`/bookings/${bookingId}/pay`, null, { params }),

  confirm: (bookingId: number) =>
    axiosClient.post(`/bookings/${bookingId}/confirm`),

  cancel: (bookingId: number) =>
    axiosClient.post(`/bookings/${bookingId}/cancel`),
};