import { Alert } from "react-native";

/** Tránh Alert trùng khi camera / useEffect gọi nhiều lần. */
export function alertOnce(
  alertGuardRef: { current: boolean },
  title: string,
  message: string,
  onPress?: () => void,
): void {
  if (alertGuardRef.current) return;
  alertGuardRef.current = true;

  Alert.alert(title, message, [
    {
      text: "OK",
      onPress: () => {
        alertGuardRef.current = false;
        onPress?.();
      },
    },
  ]);
}
