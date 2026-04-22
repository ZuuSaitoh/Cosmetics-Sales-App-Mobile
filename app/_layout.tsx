import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerForPushNotificationsAsync } from "@/src/services/pushNotificationService";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const registerPush = async () => {
      const { error } = await registerForPushNotificationsAsync();
      if (error) {
        console.warn(error);
      }
    };

    registerPush();

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      () => {
        // Foreground notifications are handled by NotificationHandler.
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          route?: string;
        };
        const route = typeof data?.route === "string" ? data.route : null;
        if (route) {
          router.push(route as never);
        }
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

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
