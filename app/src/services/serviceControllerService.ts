import axiosClient from "../api/axiosClient";

export const serviceControllerService = {
  // service-controller
  getServiceById: (id: number) => axiosClient.get(`/services/${id}`),

  updateService: (id: number, data: FormData | Record<string, unknown>) =>
    axiosClient.put(`/services/${id}`, data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
    }),

  deleteService: (id: number) => axiosClient.delete(`/services/${id}`),

  getAllServices: () => axiosClient.get("/services"),

  createService: (data: FormData | Record<string, unknown>) =>
    axiosClient.post("/services", data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
    }),

  getServicesByType: (serviceType: string) =>
    axiosClient.get(`/services/type/${serviceType}`),

  getServicesByProvider: (providerId: number) =>
    axiosClient.get(`/services/provider/${providerId}`),

  getAllServicesByProvider: (providerId: number) =>
    axiosClient.get(`/services/provider/${providerId}/all`),

  // service-order-controller
  startServiceNow: (id: number) =>
    axiosClient.post(`/service-orders/${id}/start-service-now`),

  providerSetWaiting: (id: number) =>
    axiosClient.post(`/service-orders/${id}/provider-set-waiting`),

  providerComplete: (id: number) =>
    axiosClient.post(`/service-orders/${id}/provider-complete`),

  payServiceOrder: (id: number, data?: Record<string, unknown>) =>
    axiosClient.post(`/service-orders/${id}/pay`, data ?? {}),

  confirmByCosplayer: (id: number) =>
    axiosClient.post(`/service-orders/${id}/confirm-by-cosplayer`),

  cancelServiceOrder: (id: number) =>
    axiosClient.post(`/service-orders/${id}/cancel`),

  providerCreateServiceOrder: (data: Record<string, unknown>) =>
    axiosClient.post("/service-orders/provider-create", data),

  getProviderServiceOrders: () => axiosClient.get("/service-orders/provider"),

  getCosplayerServiceOrders: (userId: number) =>
    axiosClient.get(`/service-orders/cosplayer/${userId}`),
};
