import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";

// 1. Tự động lấy IP của máy tính đang chạy Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const machineIP = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

// 2. Tạo sẵn 2 biến URL động cho cả API và WebSocket
export const API_BASE_URL = `http://${machineIP}:8080/api`;
export const WS_BASE_URL = `ws://${machineIP}:8080/ws-mobile`;

console.log("🔥 Đang gọi API tới:", API_BASE_URL);

// 3. Khởi tạo Axios với baseURL động
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Tự động gắn Token vào mỗi khi gửi request
axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem("cosmate_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default axiosClient;