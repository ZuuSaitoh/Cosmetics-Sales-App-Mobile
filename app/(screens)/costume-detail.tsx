import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Dimensions, FlatList, Platform 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../api/axiosClient';

const { width } = Dimensions.get('window');

export default function CostumeDetailScreen() {
  // Lấy ID sản phẩm truyền từ trang Home sang
  const { id } = useLocalSearchParams();
  
  const [costume, setCostume] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchCostumeDetail();
    }
  }, [id]);

  const fetchCostumeDetail = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get(`/costumes/${id}`);
      if (response.data.code === 0) {
        setCostume(response.data.result);
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết trang phục:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  // Hàm xử lý khi lướt ảnh để đổi dấu chấm tròn (pagination)
  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveImageIndex(Math.round(index));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B59DFF" />
      </SafeAreaView>
    );
  }

  if (!costume) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{color: '#888'}}>Không tìm thấy dữ liệu trang phục.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{marginTop: 15}}>
          <Text style={{color: '#B59DFF'}}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = costume.imageUrls && costume.imageUrls.length > 0 ? costume.imageUrls : ['https://via.placeholder.com/400'];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER TRONG SUỐT (NỔI TRÊN ẢNH) */}
      <View style={styles.headerFloating}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* SLIDER HÌNH ẢNH */}
        <View style={styles.imageSliderContainer}>
          <FlatList 
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => (
              <Image source={{uri: item}} style={styles.mainImage} resizeMode="cover" />
            )}
          />
          {/* CÁC CHẤM TRÒN CHỈ SỐ ẢNH */}
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_: any, index: number) => (
                <View key={index} style={[styles.dot, activeImageIndex === index ? styles.activeDot : null]} />
              ))}
            </View>
          )}
        </View>

        {/* THÔNG TIN CHÍNH CỦA SẢN PHẨM */}
        <View style={styles.section}>
          <Text style={styles.costumeName}>{costume.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatPrice(costume.pricePerDay)}<Text style={styles.perDay}>/ngày</Text></Text>
            <View style={[styles.statusBadge, { backgroundColor: costume.status === 'AVAILABLE' ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.statusText, { color: costume.status === 'AVAILABLE' ? '#28A745' : '#DC3545' }]}>
                {costume.status === 'AVAILABLE' ? 'Sẵn sàng' : 'Đang thuê'}
              </Text>
            </View>
          </View>
        </View>

        {/* THÔNG SỐ CHI TIẾT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
          <View style={styles.specRow}><Text style={styles.specLabel}>Kích cỡ (Size):</Text><Text style={styles.specValue}>{costume.size || 'Freesize'}</Text></View>
          <View style={styles.specRow}><Text style={styles.specLabel}>Mục đích:</Text><Text style={styles.specValue}>{costume.rentPurpose || 'Không rõ'}</Text></View>
          <View style={styles.specRow}><Text style={styles.specLabel}>Số lượng món:</Text><Text style={styles.specValue}>{costume.numberOfItems || 0} món</Text></View>
          <View style={styles.specRow}><Text style={styles.specLabel}>Tiền cọc:</Text><Text style={[styles.specValue, {color: '#FF9900', fontWeight: 'bold'}]}>{formatPrice(costume.depositAmount)}</Text></View>
        </View>

        {/* CÁC LỰA CHỌN THUÊ (RENTAL OPTIONS) */}
        {costume.rentalOptions && costume.rentalOptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gói thuê đồ</Text>
            {costume.rentalOptions.map((opt: any, index: number) => (
              <View key={index} style={styles.optionCard}>
                <View>
                  <Text style={styles.optionName}>{opt.name}</Text>
                  {opt.description ? <Text style={styles.optionDesc}>{opt.description}</Text> : null}
                </View>
                <Text style={styles.optionPrice}>+{formatPrice(opt.price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* PHỤ KIỆN ĐI KÈM (ACCESSORIES) */}
        {costume.accessories && costume.accessories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phụ kiện (Có thể thuê thêm)</Text>
            {costume.accessories.map((acc: any, index: number) => (
              <View key={index} style={styles.optionCard}>
                <View>
                  <Text style={styles.optionName}>{acc.name} {acc.isRequired ? <Text style={{color: 'red', fontSize: 10}}>*Bắt buộc</Text> : ''}</Text>
                  {acc.description ? <Text style={styles.optionDesc}>{acc.description}</Text> : null}
                </View>
                <Text style={styles.optionPrice}>+{formatPrice(acc.price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* PHỤ PHÍ KHÁC (SURCHARGES) */}
        {costume.surcharges && costume.surcharges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phụ phí (Bắt buộc)</Text>
            {costume.surcharges.map((sur: any, index: number) => (
              <View key={index} style={styles.optionCard}>
                <Text style={styles.optionName}>{sur.name}</Text>
                <Text style={styles.optionPrice}>+{formatPrice(sur.price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* MÔ TẢ TRANG PHỤC */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          <Text style={styles.descriptionText}>{costume.description || 'Chưa có mô tả cho trang phục này.'}</Text>
        </View>
      </ScrollView>

      {/* THANH BOTTOM ACTION (NÚT CHAT & NÚT THUÊ ĐỒ) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push({
            pathname: '/(screens)/chat-detail' as any,
            // Chỗ này truyền providerId của Shop sang màn hình Chat
            params: { 
      partnerId: costume.providerId,
    
      partnerName: costume.shopName || costume.providerName || "Cửa hàng Cosplay",
      partnerAvatar: costume.shopAvatar || (costume.imageUrls && costume.imageUrls[0])
    }
          })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#B59DFF" />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.rentButton, costume.status !== 'AVAILABLE' && {backgroundColor: '#ccc'}]}
          disabled={costume.status !== 'AVAILABLE'}
          onPress={() => {
            // Chỗ này sau này ráp màn hình Giỏ Hàng/Tạo Đơn Hàng vào nha
            alert("Chuyển sang màn hình Đặt thuê đồ!");
          }}
        >
          <Text style={styles.rentButtonText}>
            {costume.status === 'AVAILABLE' ? 'Thuê Ngay' : 'Hết hàng'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header nổi
  headerFloating: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 15, zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  
  // Slider Ảnh
  imageSliderContainer: { width: width, height: width, backgroundColor: '#E0D7FF', position: 'relative' },
  mainImage: { width: width, height: width },
  pagination: { flexDirection: 'row', position: 'absolute', bottom: 15, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#B59DFF', width: 12 },

  // Sections
  section: { backgroundColor: '#fff', padding: 15, marginBottom: 10 },
  costumeName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, lineHeight: 28 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceText: { fontSize: 24, fontWeight: 'bold', color: '#B59DFF' },
  perDay: { fontSize: 14, color: '#888', fontWeight: 'normal' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  specRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  specLabel: { fontSize: 14, color: '#666' },
  specValue: { fontSize: 14, color: '#333', fontWeight: '500' },

  optionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4F5F7', padding: 12, borderRadius: 8, marginBottom: 10 },
  optionName: { fontSize: 14, fontWeight: '600', color: '#333' },
  optionDesc: { fontSize: 12, color: '#666', marginTop: 2, maxWidth: width * 0.6 },
  optionPrice: { fontSize: 14, fontWeight: 'bold', color: '#B59DFF' },

  descriptionText: { fontSize: 14, color: '#444', lineHeight: 22 },

  // Bottom Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 10, borderTopWidth: 1, borderTopColor: '#E0E0E0', elevation: 10 },
  chatButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E0E0E0' },
  chatText: { fontSize: 12, color: '#B59DFF', marginTop: 2 },
  rentButton: { flex: 2, backgroundColor: '#B59DFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  rentButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});