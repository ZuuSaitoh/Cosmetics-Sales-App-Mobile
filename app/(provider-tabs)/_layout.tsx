import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';

function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { count } = useUnreadChatCount();

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons
        name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
        size={24}
        color={color}
      />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B59DFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F2',
          height: Platform.OS === 'ios' ? 100 : 80,
          paddingBottom: Platform.OS === 'ios' ? 40 : 25,
          paddingTop: 12,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      {/* TAB : QUẢN LÝ KHO ĐỒ (ITEMS) */}
      <Tabs.Screen
        name="items"
        options={{
          title: 'Kho đồ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "shirt" : "shirt-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* TAB : QUẢN LÝ ĐƠN HÀNG */}
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

      {/* TAB : THÔNG BÁO */}
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

      {/* TAB : TIN NHẮN */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, focused }) => (
            <ChatTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* TAB : HỒ SƠ CÁ NHÂN */}
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
