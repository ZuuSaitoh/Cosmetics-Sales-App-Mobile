import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B59DFF',
        tabBarInactiveTintColor: '#999',
        
        // --- CẤU HÌNH ĐỂ ĐẨY ICON LÊN CAO ---
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F2',
          
          // Tăng chiều cao tổng thể của thanh Tab lên hẳn 100 (cho iOS) hoặc 80 (cho Android)
          height: Platform.OS === 'ios' ? 100 : 80, 
          
          // Đây là "chìa khóa": Tăng padding bottom thật lớn để đẩy icon và chữ lên trên
          paddingBottom: Platform.OS === 'ios' ? 40 : 25, 
          
          paddingTop: 12, // Khoảng cách từ đỉnh thanh Tab xuống icon
          
          // Giúp thanh Tab trông phẳng và chắc chắn
          elevation: 0,
          shadowOpacity: 0,
        },
        
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4, // Khoảng cách giữa Icon và Chữ
        },

        tabBarIconStyle: {
          marginBottom: 0, // Đảm bảo icon không bị dính sát chữ
        }
      }}
    >
     

  {/* TAB 2: QUẢN LÝ KHO ĐỒ (ITEMS) */}
  <Tabs.Screen
    name="items"
    options={{
      title: 'Kho đồ', // Trả lại tên cũ
      tabBarIcon: ({ color, focused }) => (
        <Ionicons 
          name={focused ? "shirt" : "shirt-outline"} 
          size={24} 
          color={color} 
        />
      ),
    }}
  />

   {/* TAB 1: QUẢN LÝ ĐƠN HÀNG */}
  <Tabs.Screen
    name="index"
    options={{
      title: 'Đơn hàng', // Trả lại tên cũ
      tabBarIcon: ({ color, focused }) => (
        <Ionicons 
          name={focused ? "receipt" : "receipt-outline"} 
          size={24} 
          color={color} 
        />
      ),
    }}
  />
    </Tabs>
  );
}