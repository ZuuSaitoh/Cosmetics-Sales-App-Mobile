import axiosClient from "../api/axiosClient";

export const authService = {
  login: (data: { usernameOrEmail: string; password: string }) =>
    axiosClient.post("/auth/login", data),

  register: (data: { fullName: string; email: string; username: string; password: string; role: string }) =>
    axiosClient.post("/auth/register", data),

  passwordResetRequest: (data: { identifier: string }) =>
    axiosClient.post("/auth/password-reset-request", data),

  passwordReset: (data: { token: string; newPassword: string }) =>
    axiosClient.post("/auth/password-reset", data),

  changePassword: (userId: number, data: { oldPassword: string; newPassword: string }) =>
    axiosClient.post(`/users/${userId}/change-password`, data),

  /** Xác nhận đăng nhập web qua QR (user đã login app). */
  approveQrLogin: (loginSessionToken: string) =>
    axiosClient.post("/auth/qr/approve", { loginSessionToken }),
};