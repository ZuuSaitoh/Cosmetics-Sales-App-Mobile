import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = "https://pry-perplexed-neatness.ngrok-free.dev/api";
export const WS_BASE_URL =
  "wss://pry-perplexed-neatness.ngrok-free.dev/ws-mobile";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // Bùa chú để vượt qua màn hình cảnh báo của Ngrok
    "ngrok-skip-browser-warning": "69420",
  },
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
