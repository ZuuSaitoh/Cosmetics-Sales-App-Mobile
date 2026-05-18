import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

/** Bật khi dev với backend local (Swagger: http://localhost:8080/swagger-ui) */
const USE_LOCAL_BACKEND = true;

/** Ghi đè thủ công nếu auto-detect sai (vd. "192.168.1.13") */
const DEV_HOST_OVERRIDE: string | null = null;

const LOCAL_API_PORT = 8080;

const resolveDevHost = (): string => {
  if (DEV_HOST_OVERRIDE) return DEV_HOST_OVERRIDE;

  // IP Metro (Expo Go trên điện thoại thật dùng cùng IP này)
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri;

  const metroHost =
    typeof hostUri === "string" ? hostUri.split(":")[0]?.trim() : null;

  if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
    return metroHost;
  }

  // Android Emulator: localhost của máy dev
  if (Platform.OS === "android") return "10.0.2.2";

  return "localhost";
};

const devHost = resolveDevHost();

/** Gốc server (Swagger paths như /ws-image/* không có prefix /api). */
export const API_ORIGIN = USE_LOCAL_BACKEND
  ? `http://${devHost}:${LOCAL_API_PORT}`
  : "https://api.cosmate.site";

export const API_BASE_URL = `${API_ORIGIN}/api`;

export const WS_BASE_URL = USE_LOCAL_BACKEND
  ? `ws://${devHost}:${LOCAL_API_PORT}/ws-mobile`
  : "wss://api.cosmate.site/ws-mobile";

if (__DEV__ && USE_LOCAL_BACKEND) {
  console.log("[API] baseURL =", API_BASE_URL);
  console.log("[API] origin =", API_ORIGIN);
}

const attachAuthInterceptor = (
  client: ReturnType<typeof axios.create>,
) => {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await AsyncStorage.getItem("cosmate_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  );
};

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/** REST dưới /api/orders, ... */
attachAuthInterceptor(axiosClient);

/** REST gốc server: /ws-image/upload, /ws-image/view/{id} (không có /api). */
export const rootAxiosClient = axios.create({
  baseURL: API_ORIGIN,
  headers: { "Content-Type": "application/json" },
});

attachAuthInterceptor(rootAxiosClient);

export default axiosClient;
