export const PENDING_QR_LOGIN_SESSION_ID_KEY =
  "cosmate_pending_qr_login_session_id";

/** JSON: { sessionId, apiBase? } */
export const PENDING_QR_LOGIN_PAYLOAD_KEY = "cosmate_pending_qr_login_payload";

export type PendingQrLoginPayload = {
  sessionId: string;
  apiBase?: string;
};
