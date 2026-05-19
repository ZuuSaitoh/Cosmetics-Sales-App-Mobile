import { PENDING_QR_LOGIN_SESSION_ID_KEY } from "@/src/constants/qrLogin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export async function savePendingQrLoginSessionId(
  sessionId: string,
): Promise<void> {
  await AsyncStorage.setItem(PENDING_QR_LOGIN_SESSION_ID_KEY, sessionId);
}

export async function resumePendingQrLoginAfterLogin(): Promise<boolean> {
  const pending = await AsyncStorage.getItem(PENDING_QR_LOGIN_SESSION_ID_KEY);
  if (!pending) return false;

  await AsyncStorage.removeItem(PENDING_QR_LOGIN_SESSION_ID_KEY);
  router.replace({
    pathname: "/(screens)/qr-login-approve" as any,
    params: { sessionId: pending },
  });
  return true;
}

export function navigateToQrLoginApprove(sessionId: string): void {
  router.replace({
    pathname: "/(screens)/qr-login-approve" as any,
    params: { sessionId },
  });
}
