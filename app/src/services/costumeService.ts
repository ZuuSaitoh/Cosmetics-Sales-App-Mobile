import axiosClient from "../api/axiosClient";

export const costumeService = {
  getAll: (params?: { keyword?: string; category?: string }) =>
    axiosClient.get("/costumes", { params }),

  search: (params?: { keyword?: string; category?: string; minPrice?: number; maxPrice?: number }) =>
    axiosClient.get("/costumes/search", { params }),

  getById: (id: number) =>
    axiosClient.get(`/costumes/${id}`),

  getByProvider: (providerId: number) =>
    axiosClient.get(`/costumes/provider/${providerId}`),

  create: (data: Record<string, unknown>) =>
    axiosClient.post("/costumes", data),

  update: (id: number, data: Record<string, unknown>) =>
    axiosClient.put(`/costumes/${id}`, data),
};