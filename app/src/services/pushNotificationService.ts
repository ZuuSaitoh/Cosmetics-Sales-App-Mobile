import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const PUSH_TOKEN_KEY = "cosmate_expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return { token: null, error: "Push notification requires a physical device." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#B59DFF",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { token: null, error: "Notification permission not granted." };
  }

  const projectId = getExpoProjectId();
  const pushTokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = pushTokenResponse.data;

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return { token, error: null };
}

export async function getStoredPushToken() {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
