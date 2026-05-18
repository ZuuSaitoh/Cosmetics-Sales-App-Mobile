export type CosmateQrPayload =
  | { type: "confirm-delivery"; token: string }
  | { type: "qr-login"; sessionToken: string };

function normalizeQrUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const normalized = /^cosmate(app)?:\/\//i.test(trimmed)
      ? trimmed.replace(/^cosmate(app)?:\/\//i, "https://app.cosmate.local/")
      : trimmed;
    return new URL(normalized);
  } catch {
    return null;
  }
}

/** Parse QR từ web: confirm-delivery hoặc qr-login. */
export function parseCosmateQr(raw: string): CosmateQrPayload | null {
  const url = normalizeQrUrl(raw);
  if (!url) return null;

  const path = url.pathname.toLowerCase();

  if (path.includes("confirm-delivery")) {
    const token = url.searchParams.get("token")?.trim();
    return token ? { type: "confirm-delivery", token } : null;
  }

  if (path.includes("qr-login")) {
    const sessionToken = url.searchParams.get("sessionToken")?.trim();
    return sessionToken ? { type: "qr-login", sessionToken } : null;
  }

  return null;
}
