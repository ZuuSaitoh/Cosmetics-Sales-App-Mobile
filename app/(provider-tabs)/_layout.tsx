import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Thư viện icon có sẵn của Expo

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ẩn cái header chữ to mặc định đi cho thoáng
        tabBarShowLabel: true, // Hiện chữ dưới icon
        tabBarActiveTintColor: '#B59DFF', // Màu tím đậm khi tab đang được chọn
        tabBarInactiveTintColor: '#C4B9DF', // Màu tím xỉn khi tab không được chọn
        
        // --- BẮT ĐẦU MA THUẬT LÀM ĐẸP CHỖ NÀY ---
        tabBarStyle: {
          position: 'absolute', // Bắt nó nổi lên khỏi đáy màn hình
          bottom: 20,          // Cách đáy 20px
          left: 20,            // Cách trái 20px
          right: 20,           // Cách phải 20px
          backgroundColor: '#FFFFFF',
          borderRadius: 25,    // Bo tròn mạnh tay cho giống iOS
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,   // Xóa cái đường gạch ngang xấu xí
          
          // Hiệu ứng đổ bóng mờ ảo (màu tím luôn cho tone-sur-tone)
          shadowColor: '#B59DFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 8,        // Dành cho Android
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      }}
    >
      {/* NÚT SỐ 1: DANH SÁCH ĐƠN HÀNG (Trỏ vào file index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color }) => (
            // Dùng icon hóa đơn
            <Ionicons name="receipt" size={24} color={color} />
          ),
        }}
      />

      {/* NÚT SỐ 2: TÀI KHOẢN / CÁ NHÂN (Trỏ vào file profile.tsx) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => (
            // Dùng icon hình người
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}