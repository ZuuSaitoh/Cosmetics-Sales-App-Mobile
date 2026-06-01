import { maskBearerForLog } from "@/src/utils/appAccessToken";

type QrApproveLogPayload = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

export function logQrApproveRequest(payload: QrApproveLogPayload): void {
  if (!__DEV__) return;

  const auth = payload.headers.Authorization ?? "";
  const maskedHeaders = {
    ...payload.headers,
    Authorization: auth.startsWith("Bearer ")
      ? `Bearer ${maskBearerForLog(auth.slice(7))}`
      : auth || "(missing)",
  };

  console.log("[qr-approve] REQUEST", {
    url: payload.url,
    headers: maskedHeaders,
    body: payload.body,
  });
}

export function logQrApproveResponse(
  status: number,
  data: unknown,
): void {
  if (!__DEV__) return;
  console.log("[qr-approve] RESPONSE", { status, data });
}

export function logQrApproveError(
  status: number | undefined,
  data: unknown,
  message?: string,
): void {
  if (!__DEV__) return;
  console.warn("[qr-approve] ERROR", { status, data, message });
}
