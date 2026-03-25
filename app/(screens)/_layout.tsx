import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Các màn hình bên trong (order-detail, return-camera) sẽ tự động chui vào đây */}
    </Stack>
  );
}