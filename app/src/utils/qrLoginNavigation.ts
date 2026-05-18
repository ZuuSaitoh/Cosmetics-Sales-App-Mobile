import { PENDING_QR_LOGIN_SESSION_TOKEN_KEY } from "@/src/constants/qrLogin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export async function savePendingQrLoginSessionToken(
  sessionToken: string,
): Promise<void> {
  await AsyncStorage.setItem(PENDING_QR_LOGIN_SESSION_TOKEN_KEY, sessionToken);
}

export async function resumePendingQrLoginAfterLogin(): Promise<boolean> {
  const pending = await AsyncStorage.getItem(PENDING_QR_LOGIN_SESSION_TOKEN_KEY);
  if (!pending) return false;

  await AsyncStorage.removeItem(PENDING_QR_LOGIN_SESSION_TOKEN_KEY);
  router.replace({
    pathname: "/(screens)/qr-login-approve" as any,
    params: { sessionToken: pending },
  });
  return true;
}

export function navigateToQrLoginApprove(sessionToken: string): void {
  router.replace({
    pathname: "/(screens)/qr-login-approve" as any,
    params: { sessionToken },
  });
}
