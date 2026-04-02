import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosClient = axios.create({
  baseURL: 'http://192.168.101.107:8080/api', // CHỈ SỬA IP Ở ĐÂY
  headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn Token vào mỗi khi gửi request
axiosClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('cosmate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;