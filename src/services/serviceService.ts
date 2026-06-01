import axiosClient from "../api/axiosClient";

export const serviceService = {
  getAll: () =>
    axiosClient.get("/services"),

  getById: (id: number) =>
    axiosClient.get(`/services/${id}`),
};