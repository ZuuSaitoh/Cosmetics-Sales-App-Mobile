import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import { Platform } from 'react-native'; // Import thêm để check máy

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#B59DFF',
        tabBarInactiveTintColor: '#C4B9DF',
        
        // --- ĐÃ CẬP NHẬT: STYLE CHÂN DÀI BÁM ĐÁY ---
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F2',
          
          // Chiều cao cực đại để đẩy icon lên
          height: Platform.OS === 'ios' ? 100 : 80, 
          
          // Lực đẩy từ dưới lên
          paddingBottom: Platform.OS === 'ios' ? 40 : 25, 
          paddingTop: 12,
          
          // Xóa bỏ các thuộc tính float cũ
          position: 'relative',
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginTop: 4,
        }
      }}
    >

      {/* NÚT : TRANG CHỦ */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* NÚT : THEO DÕI ĐƠN HÀNG */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "receipt" : "receipt-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
        {/* NÚT : THÔNG BÁO */}
        <Tabs.Screen
  name="notifications"
  options={{
    title: 'Thông báo',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons 
        name={focused ? "notifications" : "notifications-outline"} 
        size={24} 
        color={color} 
      />
    ),
  }}
/>

{/* NÚT : TIN NHẮN */}
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Tin nhắn',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />

      {/* NÚT : TRANG CÁ NHÂN */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}