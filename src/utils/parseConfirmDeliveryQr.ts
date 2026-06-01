import { parseCosmateQr } from "./parseCosmateQr";

/** @deprecated Dùng parseCosmateQr */
export function parseConfirmDeliverySessionToken(raw: string): string | null {
  const payload = parseCosmateQr(raw);
  return payload?.type === "confirm-delivery" ? payload.token : null;
}
