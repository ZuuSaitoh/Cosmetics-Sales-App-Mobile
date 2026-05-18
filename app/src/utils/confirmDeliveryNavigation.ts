import { PENDING_CONFIRM_DELIVERY_TOKEN_KEY } from "@/src/constants/confirmDelivery";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export async function savePendingConfirmDeliveryToken(
  sessionToken: string,
): Promise<void> {
  await AsyncStorage.setItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY, sessionToken);
}

export async function resumePendingConfirmDeliveryAfterLogin(): Promise<boolean> {
  const pending = await AsyncStorage.getItem(
    PENDING_CONFIRM_DELIVERY_TOKEN_KEY,
  );
  if (!pending) return false;

  await AsyncStorage.removeItem(PENDING_CONFIRM_DELIVERY_TOKEN_KEY);
  router.replace({
    pathname: "/(screens)/confirm-delivery-capture" as any,
    params: { token: pending },
  });
  return true;
}

export function navigateToConfirmDeliveryCapture(sessionToken: string): void {
  router.replace({
    pathname: "/(screens)/confirm-delivery-capture" as any,
    params: { token: sessionToken },
  });
}
