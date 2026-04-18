import axiosClient from "../api/axiosClient";

export const notificationService = {
  getAll: () =>
    axiosClient.get("/notifications"),

  markAsRead: (notificationId: number) =>
    axiosClient.post(`/notifications/mark-read/${notificationId}`),

  markAllAsRead: () =>
    axiosClient.post("/notifications/mark-all-read"),

  delete: (notificationId: number) =>
    axiosClient.delete(`/notifications/${notificationId}`),

  create: (data: { userId: number; title: string; message: string }) =>
    axiosClient.post("/notifications", data),
};