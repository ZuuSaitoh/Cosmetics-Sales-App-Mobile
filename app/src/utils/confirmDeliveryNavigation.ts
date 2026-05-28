import { PENDING_CONFIRM_DELIVERY_TOKEN_KEY } from "@/src/constants/confirmDelivery";
import {
  getAppRoles,
  isProviderRentalRole,
} from "@/src/utils/appAccessToken";
import { assertConfirmDeliveryQrOwner } from "@/src/utils/confirmDeliveryAccess";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export type ConfirmDeliveryPickerMode = "camera" | "library";

const PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY =
  "cosmate_pending_confirm_delivery_payload";

export type ConfirmDeliveryNavParams = {
  token: string;
  apiBase?: string;
  userId: string;
  orderId?: string;
  pickerMode?: ConfirmDeliveryPickerMode;
};

export async function resolveConfirmDeliveryPickerMode(
  params: ConfirmDeliveryNavParams,
): Promise<ConfirmDeliveryPickerMode> {
  if (params.pickerMode === "library" || params.pickerMode === "camera") {
    return params.pickerMode;
  }

  const roles = await getAppRoles();
  if (isProviderRentalRole(roles)) {
    return "library";
  }

  return "camera";
}

type PendingConfirmDeliveryPayload = ConfirmDeliveryNavParams;

export async function savePendingConfirmDelivery(
  payload: ConfirmDeliveryNavParams,
): Promise<void> {
  await AsyncStorage.setItem(
    PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY,
    JSON.stringify(payload),
  );
  await AsyncStorage.setItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY, payload.token);
}

async function readPendingConfirmDelivery(): Promise<PendingConfirmDeliveryPayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PendingConfirmDeliveryPayload;
      if (parsed?.token?.trim() && parsed?.userId?.trim()) {
        return {
          token: parsed.token.trim(),
          userId: parsed.userId.trim(),
          apiBase: parsed.apiBase?.trim() || undefined,
          orderId: parsed.orderId?.trim() || undefined,
          pickerMode: parsed.pickerMode,
        };
      }
    } catch {
      // legacy
    }
  }

  const legacy = await AsyncStorage.getItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY);
  if (legacy?.trim()) {
    return null;
  }

  return null;
}

export async function clearPendingConfirmDelivery(): Promise<void> {
  await AsyncStorage.multiRemove([
    PENDING_CONFIRM_DELIVERY_PAYLOAD_KEY,
    PENDING_CONFIRM_DELIVERY_TOKEN_KEY,
  ]);
}

/** @deprecated Dùng savePendingConfirmDelivery */
export async function savePendingConfirmDeliveryToken(
  sessionToken: string,
  apiBase?: string,
): Promise<void> {
  await savePendingConfirmDelivery({
    token: sessionToken,
    apiBase,
    userId: "",
  });
}

export type ConfirmDeliveryOpenResult =
  | { ok: true }
  | { ok: false; message: string };

export async function resumePendingConfirmDeliveryAfterLogin(): Promise<ConfirmDeliveryOpenResult | null> {
  const pending = await readPendingConfirmDelivery();
  if (!pending) return null;

  const access = await assertConfirmDeliveryQrOwner(pending.userId);
  await clearPendingConfirmDelivery();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  await navigateToConfirmDeliveryCapture(pending);
  return { ok: true };
}

export async function openConfirmDeliveryFromQr(
  params: ConfirmDeliveryNavParams,
): Promise<ConfirmDeliveryOpenResult> {
  const access = await assertConfirmDeliveryQrOwner(params.userId);
  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  await navigateToConfirmDeliveryCapture(params);
  return { ok: true };
}

export async function navigateToConfirmDeliveryCapture(
  params: ConfirmDeliveryNavParams,
): Promise<void> {
  const pickerMode = await resolveConfirmDeliveryPickerMode(params);

  router.replace({
    pathname: "/(screens)/confirm-delivery-capture" as any,
    params: {
      token: params.token,
      userId: params.userId,
      pickerMode,
      ...(params.apiBase ? { apiBase: params.apiBase } : {}),
      ...(params.orderId ? { orderId: params.orderId } : {}),
    },
  });
}
