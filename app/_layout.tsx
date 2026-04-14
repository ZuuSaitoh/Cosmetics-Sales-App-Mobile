import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      {/* Luôn hiển thị chữ đen trên thanh trạng thái (pin, wifi, đồng hồ) */}
      <StatusBar style="dark" backgroundColor="#ffffff" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
        <Stack.Screen name="(provider-tabs)" />
        <Stack.Screen name="(provider-service-tabs)" />
      </Stack>
    </>
  );
}
