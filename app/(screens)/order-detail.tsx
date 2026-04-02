import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// 1. Import axiosClient thay vì axios mặc định
import axiosClient from '../api/axiosClient'; 

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      // 2. GỌI API QUA axiosClient: Gọn tưng, không cần headers, không cần IP
      const response = await axiosClient.get(`/orders/${id}`);
      
      if (response.data.code === 0) {
        setOrder(response.data.result);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết đơn:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const date = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    return `${time}  |  ${date}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={{ color: '#8E7AB5' }}>Không tìm thấy thông tin đơn hàng.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đơn hàng</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* BANNER TRẠNG THÁI TỔNG */}
        <View style={styles.statusBanner}>
          <View>
            <Text style={styles.statusText}>{order.status}</Text>
            <Text style={styles.statusSubText}>Mã đơn: #{order.id}</Text>
          </View>
          <Ionicons name="cube-outline" size={40} color="#fff" />
        </View>

        {/* 1. TIMELINE TRACKING */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate-circle-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Lịch sử đơn hàng</Text>
          </View>
          
          <View style={styles.trackingContainer}>
            {order.trackings && order.trackings.length > 0 ? (
              order.trackings.map((track: any, index: number) => {
                const isFirst = index === 0;
                return (
                  <View key={track.id} style={styles.trackingRow}>
                    <View style={styles.timelineColumn}>
                      <View style={[styles.dot, isFirst ? styles.dotActive : styles.dotInactive]} />
                      {index !== order.trackings.length - 1 && <View style={styles.line} />} 
                    </View>
                    <View style={styles.trackingContent}>
                      <Text style={[styles.trackStage, isFirst && styles.textActive]}>{track.stage || track.trackingStatus}</Text>
                      <Text style={styles.trackTime}>{formatDate(track.createdAt)}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Chưa có thông tin tracking</Text>
            )}
          </View>
        </View>

        {/* 2. ĐỊA CHỈ NHẬN HÀNG */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
          </View>
          {order.addresses && order.addresses.length > 0 ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressName}>{order.addresses[0].name} | {order.addresses[0].phone}</Text>
              <Text style={styles.addressText}>{order.addresses[0].address}</Text>
              <Text style={styles.addressText}>{order.addresses[0].district}, {order.addresses[0].city}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Chưa cập nhật địa chỉ</Text>
          )}
        </View>

        {/* 3. CHI TIẾT SẢN PHẨM */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shirt-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Sản phẩm đã thuê</Text>
          </View>
          {order.details && order.details.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Trang phục ID: {item.costumeId}</Text>
                <Text style={styles.itemSub}>Size: {item.size}  |  Số lượng: x{item.numberOfItems}</Text>
                <Text style={styles.itemSub}>Thời gian: {item.rentDay} ngày</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.rentAmount)}</Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tiền cọc (Hoàn trả sau):</Text>
            <Text style={styles.depositPrice}>{formatPrice(order.totalDepositAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Tổng thanh toán:</Text>
            <Text style={styles.totalPriceBold}>{formatPrice(order.totalAmount)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnAction}>
          <Text style={styles.btnActionText}>Liên hệ cửa hàng</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  statusBanner: { backgroundColor: '#B59DFF', padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  statusSubText: { color: '#E0D7FF', fontSize: 14 },
  card: { backgroundColor: '#fff', marginTop: 10, padding: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B6B', marginLeft: 10 },
  trackingContainer: { paddingLeft: 10 },
  trackingRow: { flexDirection: 'row' },
  timelineColumn: { alignItems: 'center', width: 20, marginRight: 15 },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 2 },
  dotActive: { backgroundColor: '#28A745', borderWidth: 2, borderColor: '#D4EDDA' }, 
  dotInactive: { backgroundColor: '#D1D1D1' }, 
  line: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginTop: -2, marginBottom: -2, zIndex: 1 },
  trackingContent: { flex: 1, paddingBottom: 25, marginTop: -3 },
  trackStage: { fontSize: 15, fontWeight: '600', color: '#666', marginBottom: 4 },
  textActive: { color: '#28A745' },
  trackTime: { fontSize: 12, color: '#999' },
  addressBox: { paddingLeft: 10 },
  addressName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  addressText: { fontSize: 14, color: '#666', marginBottom: 3 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  itemSub: { fontSize: 13, color: '#888', marginBottom: 2 },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#4A3B6B' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: '#666' },
  depositPrice: { fontSize: 14, color: '#FF9900' },
  totalLabelBold: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  totalPriceBold: { fontSize: 18, fontWeight: 'bold', color: '#B59DFF' },
  btnAction: { backgroundColor: '#4A3B6B', margin: 20, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 50 },
  btnActionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#999', fontStyle: 'italic', paddingLeft: 10 }
});