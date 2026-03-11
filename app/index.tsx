import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  // Giả lập trạng thái đang kiểm tra xem có JWT token trong máy không
  const [isLoading, setIsLoading] = useState(true);

  // Giả lập: false là chưa đăng nhập, true là đã đăng nhập
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Đoạn này sau này bạn sẽ viết code móc vào AsyncStorage để lấy Token
    // Tạm thời cho nó đợi 1 giây rồi quyết định
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Trong lúc đang kiểm tra thì hiện vòng tròn xoay xoay
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  // Nếu CHƯA đăng nhập -> Đá văng sang thư mục (auth) -> nó sẽ tự tìm file login.tsx
  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Nếu ĐÃ đăng nhập -> Cho đi vào thư mục (tabs) -> màn hình chính
  return <Redirect href="/(tabs)" />;
}
