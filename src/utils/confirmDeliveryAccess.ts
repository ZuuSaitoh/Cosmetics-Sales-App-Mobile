import { jwtDecode } from "jwt-decode";
import { getAppAccessToken } from "@/src/utils/appAccessToken";

export function parseQrUserId(raw: string | undefined | null): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const id = Number(String(raw).trim());
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getAppUserIdFromToken(token: string): number | null {
  try {
    const decoded = jwtDecode<{ sub?: string | number }>(token);
    return parseQrUserId(
      decoded.sub != null ? String(decoded.sub) : null,
    );
  } catch {
    return null;
  }
}

export async function getAppUserId(): Promise<number | null> {
  const token = await getAppAccessToken();
  if (!token) return null;
  return getAppUserIdFromToken(token);
}

export type ConfirmDeliveryAccessResult =
  | { ok: true; appUserId: number; qrUserId: number }
  | { ok: false; message: string };

/** So khớp userId trên QR (web) với userId từ JWT app. */
export async function assertConfirmDeliveryQrOwner(
  qrUserIdRaw: string | undefined | null,
): Promise<ConfirmDeliveryAccessResult> {
  const qrUserId = parseQrUserId(qrUserIdRaw);
  if (qrUserId == null) {
    return {
      ok: false,
      message:
        "Mã QR thiếu thông tin tài khoản. Vui lòng tạo mã mới trên trang web.",
    };
  }

  const appUserId = await getAppUserId();
  if (appUserId == null) {
    return {
      ok: false,
      message: "Vui lòng đăng nhập app trước khi quét mã gửi ảnh minh chứng.",
    };
  }

  if (appUserId !== qrUserId) {
    return {
      ok: false,
      message:
        "Mã QR thuộc tài khoản khác. Vui lòng đăng nhập đúng tài khoản trên app rồi quét lại.",
    };
  }

  return { ok: true, appUserId, qrUserId };
}
