import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient'; 

export default function ProviderItemsScreen() {
  const [costumes, setCostumes] = useState([]);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn.');
        setIsLoading(false); return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub; 

      const providerResponse = await axiosClient.get(`/providers/user/${userId}`);

      if (providerResponse.data.code !== 0 || !providerResponse.data.result) {
        Alert.alert('Thông báo', 'Bạn chưa thiết lập hồ sơ Shop!');
        setIsLoading(false); return;
      }

      const myShop = providerResponse.data.result;
      setShopInfo(myShop);
      const actualProviderId = myShop.id;

      const costumesResponse = await axiosClient.get(`/costumes/provider/${actualProviderId}`);

      if (costumesResponse.data.code === 0) {
        setCostumes(costumesResponse.data.result);
      } else {
        Alert.alert('Lỗi dữ liệu', costumesResponse.data.message);
      }

    } catch (error: any) {
      console.error("Lỗi fetchData:", error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu kho đồ.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const renderCostumeItem = ({ item }: { item: any }) => {
    const coverImage = item.imageUrls && item.imageUrls.length > 0 
      ? item.imageUrls[0] 
      : 'https://via.placeholder.com/200x200.png?text=No+Image';

    return (
      <View style={styles.card}>
        <Image source={{ uri: coverImage }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.details}>Size: {item.size}  |  Kho: {item.numberOfItems} cái</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>Thuê: <Text style={styles.priceValue}>{formatPrice(item.pricePerDay)}</Text>/ngày</Text>
            <Text style={styles.priceText}>Cọc: <Text style={styles.priceValue}>{formatPrice(item.depositAmount)}</Text></Text>
          </View>

          <View style={styles.actionRow}>
            <Text style={[
              styles.status, 
              { color: item.status === 'AVAILABLE' ? '#28A745' : '#FF9900' }
            ]}>
              {item.status || 'Đang cập nhật'}
            </Text>
            
            {/* ĐÃ FIX: Trỏ đúng sang edit-costume và item ở đây là HỢP LỆ */}
            <TouchableOpacity 
              style={styles.btnEdit}
              onPress={() => router.push({ 
                pathname: "/(screens)/edit-costume" as any, 
                params: { id: item.id } 
              })}
            >
              <Text style={styles.btnEditText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={{ uri: shopInfo?.avatarUrl || 'https://via.placeholder.com/100' }} 
            style={styles.shopAvatar} 
          />
          <View>
            <Text style={styles.title}>{shopInfo?.shopName || 'Kho Trang Phục'}</Text>
            <Text style={styles.providerIdText}>Provider ID: {shopInfo?.id}</Text>
          </View>
        </View>
        
        {/* ĐÃ FIX: Đăng đồ mới thì không cần truyền id của món nào hết */}
        <TouchableOpacity 
          style={styles.btnAdd} 
          onPress={() => router.push("/(screens)/add-costume" as any)}
        >
          <Text style={styles.btnAddText}>+ Đăng đồ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={costumes}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderCostumeItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={50} color="#C4B9DF" />
            <Text style={styles.emptyText}>Shop chưa có món đồ nào.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  shopAvatar: { width: 45, height: 45, borderRadius: 23, marginRight: 12, backgroundColor: '#F4F1FF', borderWidth: 1, borderColor: '#E0D7FF' },
  title: { fontSize: 18, fontWeight: '900', color: '#4A3B6B' },
  providerIdText: { fontSize: 12, color: '#8E7AB5', marginTop: 2 },
  btnAdd: { backgroundColor: '#B59DFF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10 },
  btnAddText: { color: '#fff', fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 12, marginBottom: 15, shadowColor: '#B59DFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  image: { width: 100, height: 130, borderRadius: 10, marginRight: 15 },
  info: { flex: 1, justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  details: { fontSize: 13, color: '#666' },
  priceContainer: { backgroundColor: '#F8F7FF', padding: 10, borderRadius: 8 },
  priceText: { fontSize: 12, color: '#777' },
  priceValue: { fontWeight: 'bold', color: '#B59DFF', fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  btnEdit: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#E0D7FF', backgroundColor: '#fff' },
  btnEditText: { color: '#4A3B6B', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 10, color: '#8E7AB5', fontSize: 15, fontStyle: 'italic' }
});