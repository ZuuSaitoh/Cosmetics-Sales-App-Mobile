import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { InternalAxiosRequestConfig } from "axios";

// Base URL cho API Backend
export const API_BASE_URL = `http://115.77.242.120:8080/api`;
export const WS_BASE_URL = `ws://115.77.242.120:8080/ws-mobile`;

// Khởi tạo Axios client
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