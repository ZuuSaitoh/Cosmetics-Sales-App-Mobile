import axios from "axios";
import { normalizeApiOrigin } from "../api/axiosClient";
import { getAppAccessToken } from "../utils/appAccessToken";
import {
  logQrApproveError,
  logQrApproveRequest,
  logQrApproveResponse,
} from "../utils/qrApproveDebugLog";
import axiosClient from "../api/axiosClient";

export const authService = {
  login: (data: { usernameOrEmail: string; password: string }) =>
    axiosClient.post("/auth/login", data),

  register: (data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    role: string;
  }) => axiosClient.post("/auth/register", data),

  passwordResetRequest: (data: { identifier: string }) =>
    axiosClient.post("/auth/password-reset-request", data),

  passwordReset: (data: { token: string; newPassword: string }) =>
    axiosClient.post("/auth/password-reset", data),

  changePassword: (
    userId: number,
    data: { oldPassword: string; newPassword: string },
  ) => axiosClient.post(`/users/${userId}/change-password`, data),

  /**
   * Xác nhận đăng nhập web qua QR.
   * Bearer = JWT user app (access_token), body.sessionId = uuid từ QR.
   */
  approveQrLogin: async (sessionId: string, apiBase?: string) => {
    const accessToken = await getAppAccessToken();
    if (!accessToken) {
      const err = new Error("NOT_LOGGED_IN") as Error & {
        response?: { status: number; data?: { message?: string } };
      };
      err.response = {
        status: 401,
        data: {
          message:
            "Chưa có JWT đăng nhập app hợp lệ. Vui lòng đăng xuất và đăng nhập lại.",
        },
      };
      throw err;
    }

    const origin = normalizeApiOrigin(apiBase);
    const url = `${origin}/api/auth/qr-approve`;
    const body = { sessionId: sessionId.trim() };
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    logQrApproveRequest({ url, headers, body });

    try {
      const res = await axios.post(url, body, { headers });
      logQrApproveResponse(res.status, res.data);
      return res;
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      logQrApproveError(
        axiosErr.response?.status,
        axiosErr.response?.data,
        axiosErr.message,
      );
      throw error;
    }
  },
};
