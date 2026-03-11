import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    // Ẩn thanh tiêu đề mặc định đi cho form Login nhìn đẹp hơn
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}