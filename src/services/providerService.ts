import axiosClient from "../api/axiosClient";

export const providerService = {
  getByRole: (role: "PROVIDER_PHOTOGRAPH" | "PROVIDER_EVENT_STAFF" | "PROVIDER_RENTAL") =>
    axiosClient.get(`/providers/role/${role}`),

  getById: (providerId: number) =>
    axiosClient.get(`/providers/id/${providerId}`),

  getByUser: (userId: number) =>
    axiosClient.get(`/providers/user/${userId}`),

  updateProfile: (providerId: number, data: Record<string, unknown>) =>
    axiosClient.put(`/providers/${providerId}`, data),

  updateCoverImage: (providerId: number, formData: FormData) =>
    axiosClient.put(`/providers/${providerId}/cover-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};