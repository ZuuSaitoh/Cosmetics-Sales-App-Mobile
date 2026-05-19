export type CosmateQrPayload =
  | {
      type: "confirm-delivery";
      token: string;
      apiBase?: string;
      orderId?: string;
    }
  | { type: "qr-login"; sessionId: string; apiBase?: string };

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

/** sessionId / sessionToken / token — web gửi cùng một uuid. */
function readQrSessionId(url: URL): string | null {
  return (
    url.searchParams.get("sessionId")?.trim() ||
    url.searchParams.get("sessionToken")?.trim() ||
    url.searchParams.get("token")?.trim() ||
    null
  );
}

function readApiBase(url: URL): string | undefined {
  const apiBase = url.searchParams.get("apiBase")?.trim();
  return apiBase || undefined;
}

/** Parse QR từ web: confirm-delivery hoặc qr-login. */
export function parseCosmateQr(raw: string): CosmateQrPayload | null {
  const url = normalizeQrUrl(raw);
  if (!url) return null;

  const path = url.pathname.toLowerCase();
  const apiBase = readApiBase(url);

  if (path.includes("confirm-delivery")) {
    const token = readQrSessionId(url);
    const orderId = url.searchParams.get("orderId")?.trim();
    return token
      ? {
          type: "confirm-delivery",
          token,
          apiBase,
          orderId: orderId || undefined,
        }
      : null;
  }

  if (path.includes("qr-login")) {
    const sessionId = readQrSessionId(url);
    return sessionId ? { type: "qr-login", sessionId, apiBase } : null;
  }

  return null;
}
