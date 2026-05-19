import {
  PENDING_QR_LOGIN_PAYLOAD_KEY,
  PENDING_QR_LOGIN_SESSION_ID_KEY,
  PendingQrLoginPayload,
} from "@/src/constants/qrLogin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export async function savePendingQrLogin(
  payload: PendingQrLoginPayload,
): Promise<void> {
  await AsyncStorage.setItem(
    PENDING_QR_LOGIN_PAYLOAD_KEY,
    JSON.stringify(payload),
  );
  await AsyncStorage.setItem(
    PENDING_QR_LOGIN_SESSION_ID_KEY,
    payload.sessionId,
  );
}

async function readPendingQrLogin(): Promise<PendingQrLoginPayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_QR_LOGIN_PAYLOAD_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PendingQrLoginPayload;
      if (parsed?.sessionId?.trim()) {
        return {
          sessionId: parsed.sessionId.trim(),
          apiBase: parsed.apiBase?.trim() || undefined,
        };
      }
    } catch {
      // legacy
    }
  }

  const legacySessionId = await AsyncStorage.getItem(
    PENDING_QR_LOGIN_SESSION_ID_KEY,
  );
  if (legacySessionId?.trim()) {
    return { sessionId: legacySessionId.trim() };
  }

  return null;
}

export async function resumePendingQrLoginAfterLogin(): Promise<boolean> {
  const pending = await readPendingQrLogin();
  if (!pending) return false;

  await AsyncStorage.multiRemove([
    PENDING_QR_LOGIN_PAYLOAD_KEY,
    PENDING_QR_LOGIN_SESSION_ID_KEY,
  ]);

  navigateToQrLoginApprove(pending.sessionId, pending.apiBase);
  return true;
}

export function navigateToQrLoginApprove(
  sessionId: string,
  apiBase?: string,
): void {
  router.replace({
    pathname: "/(screens)/qr-login-approve" as any,
    params: {
      sessionId,
      ...(apiBase ? { apiBase } : {}),
    },
  });
}
