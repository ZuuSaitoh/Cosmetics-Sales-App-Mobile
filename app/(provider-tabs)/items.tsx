import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";

export default function ProviderItemsScreen() {
  const [costumes, setCostumes] = useState([]);
  const [shopInfo, setShopInfo] = useState<any>(null); // Lưu thông tin Shop (ID, Tên, Avatar)
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API ngay khi vào màn hình
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Lấy token & giải mã lấy userId
      const token = await AsyncStorage.getItem('cosmate_token');
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn.');
        setIsLoading(false); return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub; 

      // ---------------------------------------------------------
      // NHỊP 1: LẤY THÔNG TIN SHOP BẰNG USER_ID
      // ---------------------------------------------------------
      const PROVIDER_API_URL = `http://192.168.101.107:8080/api/providers/user/${userId}`;
      const providerResponse = await axios.get(PROVIDER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (providerResponse.data.code !== 0 || !providerResponse.data.result) {
        Alert.alert('Thông báo', 'Bạn chưa thiết lập hồ sơ Shop!');
        setIsLoading(false); return;
      }

      const myShop = providerResponse.data.result;
      setShopInfo(myShop); // Lưu vào State để in lên màn hình
      const actualProviderId = myShop.id; // ĐÂY MỚI LÀ CHÌA KHÓA CHUẨN NÈ!

      console.log("=== ĐÃ TÌM THẤY SHOP ===", myShop.shopName, "- Provider ID:", actualProviderId);

      // ---------------------------------------------------------
      // NHỊP 2: DÙNG PROVIDER_ID LẤY DANH SÁCH TRANG PHỤC
      // ---------------------------------------------------------
      const COSTUMES_API_URL = `http://192.168.101.107:8080/api/costumes/provider/${actualProviderId}`;
      const costumesResponse = await axios.get(COSTUMES_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (costumesResponse.data.code === 0) {
        setCostumes(costumesResponse.data.result);
      } else {
        Alert.alert('Lỗi dữ liệu', costumesResponse.data.message);
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ để tải dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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
            <TouchableOpacity style={styles.btnEdit}>
              <Text style={styles.btnEditText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER XỊN XÒ CÓ TÊN SHOP VÀ ID */}
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
        
        <TouchableOpacity style={styles.btnAdd} onPress={() => Alert.alert('Tính năng', 'Sắp tới mình code trang tạo đồ nè!')}>
          <Text style={styles.btnAddText}>+ Đăng đồ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={costumes}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderCostumeItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#8E7AB5' }}>Shop chưa đăng trang phục nào lên hệ thống.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  // Cập nhật Header để chứa Avatar
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0D7FF' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  shopAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#eee' },
  title: { fontSize: 18, fontWeight: '900', color: '#4A3B6B' },
  providerIdText: { fontSize: 12, color: '#8E7AB5', marginTop: 2 },
  
  btnAdd: { backgroundColor: '#B59DFF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  btnAddText: { color: '#fff', fontWeight: 'bold' },
  
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  image: { width: 100, height: 120, borderRadius: 8, marginRight: 15, backgroundColor: '#eee' },
  info: { flex: 1, justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  details: { fontSize: 13, color: '#666', marginBottom: 8 },
  priceContainer: { backgroundColor: '#F8F9FA', padding: 8, borderRadius: 6, marginBottom: 10 },
  priceText: { fontSize: 12, color: '#555' },
  priceValue: { fontWeight: 'bold', color: '#B59DFF', fontSize: 13 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  btnEdit: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#E0D7FF' },
  btnEditText: { color: '#4A3B6B', fontSize: 12, fontWeight: '600' }
});