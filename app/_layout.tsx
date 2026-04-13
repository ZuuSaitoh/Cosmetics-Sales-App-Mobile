import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      {/* Ép thanh % pin, giờ, wifi thành chữ MÀU ĐEN (dark) */}
      <StatusBar style="dark" />

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
