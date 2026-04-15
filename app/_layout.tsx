import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Luôn hiển thị chữ đen trên thanh trạng thái (pin, wifi, đồng hồ) */}
      <StatusBar style="dark" backgroundColor="#ffffff" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
        <Stack.Screen name="(provider-tabs)" />
        <Stack.Screen name="(provider-service-tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
