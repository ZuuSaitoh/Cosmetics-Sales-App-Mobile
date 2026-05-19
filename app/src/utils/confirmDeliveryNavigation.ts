import { PENDING_CONFIRM_DELIVERY_TOKEN_KEY } from "@/src/constants/confirmDelivery";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY =
  "cosmate_pending_confirm_delivery_payload";

type PendingConfirmDeliveryPayload = {
  token: string;
  apiBase?: string;
};

export async function savePendingConfirmDeliveryToken(
  sessionToken: string,
  apiBase?: string,
): Promise<void> {
  const payload: PendingConfirmDeliveryPayload = {
    token: sessionToken,
    apiBase,
  };
  await AsyncStorage.setItem(
    PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY,
    JSON.stringify(payload),
  );
  await AsyncStorage.setItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY, sessionToken);
}

async function readPendingConfirmDelivery(): Promise<PendingConfirmDeliveryPayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PendingConfirmDeliveryPayload;
      if (parsed?.token?.trim()) {
        return {
          token: parsed.token.trim(),
          apiBase: parsed.apiBase?.trim() || undefined,
        };
      }
    } catch {
      // legacy
    }
  }

  const legacy = await AsyncStorage.getItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY);
  if (legacy?.trim()) {
    return { token: legacy.trim() };
  }

  return null;
}

export async function resumePendingConfirmDeliveryAfterLogin(): Promise<boolean> {
  const pending = await readPendingConfirmDelivery();
  if (!pending) return false;

  await AsyncStorage.multiRemove([
    PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY,
    PENDING_CONFIRM_DELIVERY_TOKEN_KEY,
  ]);

  navigateToConfirmDeliveryCapture(pending.token, pending.apiBase);
  return true;
}

export function navigateToConfirmDeliveryCapture(
  sessionToken: string,
  apiBase?: string,
): void {
  router.replace({
    pathname: "/(screens)/confirm-delivery-capture" as any,
    params: {
      token: sessionToken,
      ...(apiBase ? { apiBase } : {}),
    },
  });
}
