import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

export const COSMATE_TOKEN_KEY = "cosmate_token";

/** UUID — không dùng làm Bearer (session QR). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** JWT compact (header.payload.signature). */
const JWT_RE =
  /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function stripQuotes(value: string): string {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

export function isJwtAccessToken(value: string): boolean {
  const token = stripQuotes(value);
  if (!token || UUID_RE.test(token)) return false;
  return JWT_RE.test(token);
}

/** Lấy access_token user app — không bao giờ trả sessionId QR. */
export async function getAppAccessToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(COSMATE_TOKEN_KEY);
  if (!raw) return null;

  const token = stripQuotes(raw);
  if (!isJwtAccessToken(token)) {
    if (__DEV__ && token) {
      console.warn(
        "[auth] cosmate_token không phải JWT hợp lệ (có thể nhầm sessionId QR). Hãy đăng nhập lại.",
      );
    }
    return null;
  }
  return token;
}

/** Sau login: ưu tiên accessToken / access_token, không lưu sessionId. */
export function extractAccessTokenFromLoginResult(
  result: Record<string, unknown> | null | undefined,
): string | null {
  if (!result) return null;

  const candidates = [
    result.accessToken,
    result.access_token,
    result.token,
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const token = stripQuotes(value);
    if (isJwtAccessToken(token)) return token;
  }

  return null;
}

export async function saveAppAccessToken(token: string): Promise<void> {
  const normalized = stripQuotes(token);
  if (!isJwtAccessToken(normalized)) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
  await AsyncStorage.setItem(COSMATE_TOKEN_KEY, normalized);
}

type JwtPayload = {
  sub?: string | number;
  roles?: string[] | string;
};

export function getAppRolesFromToken(token: string): string[] {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const raw = decoded.roles;
    if (Array.isArray(raw)) {
      return raw.map((r) => String(r).trim()).filter(Boolean);
    }
    if (typeof raw === "string" && raw.trim()) {
      return raw
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

export async function getAppRoles(): Promise<string[]> {
  const token = await getAppAccessToken();
  if (!token) return [];
  return getAppRolesFromToken(token);
}

export function isProviderRentalRole(roles: string[]): boolean {
  return roles.includes("PROVIDER_RENTAL");
}

export function maskBearerForLog(token: string): string {
  if (token.length <= 16) return "***";
  return `${token.slice(0, 12)}…${token.slice(-6)} (len=${token.length})`;
}
