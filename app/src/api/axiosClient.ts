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

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? `http://${devHost}:${LOCAL_API_PORT}/api`
  : "https://api.cosmate.site/api";

export const WS_BASE_URL = USE_LOCAL_BACKEND
  ? `ws://${devHost}:${LOCAL_API_PORT}/ws-mobile`
  : "wss://api.cosmate.site/ws-mobile";

if (__DEV__ && USE_LOCAL_BACKEND) {
  console.log("[API] baseURL =", API_BASE_URL);
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem("cosmate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

export default axiosClient;
