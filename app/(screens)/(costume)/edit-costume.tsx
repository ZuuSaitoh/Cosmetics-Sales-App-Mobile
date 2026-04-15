import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../../api/axiosClient'; // "Đầu não" IP của mình

export default function EditCostumeScreen() {
  const { id } = useLocalSearchParams(); // Lấy ID món đồ cần sửa
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State lưu thông tin món đồ
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    pricePerDay: '',
    depositAmount: '',
    numberOfItems: '',
    description: ''
  });

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  // 1. Lấy dữ liệu cũ từ server
  const fetchDetail = async () => {
    try {
      const res = await axiosClient.get(`/costumes/${id}`);
      if (res.data.code === 0) {
        const item = res.data.result;
        setFormData({
          name: item.name,
          size: item.size,
          pricePerDay: item.pricePerDay.toString(),
          depositAmount: item.depositAmount.toString(),
          numberOfItems: item.numberOfItems.toString(),
          description: item.description || ''
        });
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lấy thông tin món đồ.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Hàm xử lý khi bấm Lưu
  const handleSave = async () => {
    if (!formData.name || !formData.pricePerDay) {
      Alert.alert("Lưu ý", "Vui lòng nhập tên và giá thuê!");
      return;
    }

    setIsSaving(true);
    try {
      // Gọi API cập nhật (thường là PUT hoặc POST tùy Backend của bạn)
      const res = await axiosClient.put(`/costumes/${id}`, {
        ...formData,
        pricePerDay: Number(formData.pricePerDay),
        depositAmount: Number(formData.depositAmount),
        numberOfItems: Number(formData.numberOfItems),
      });

      if (res.data.code === 0) {
        Alert.alert("Thành công", "Đã cập nhật thông tin trang phục!", [
          { text: "OK", onPress: () => router.back() } // Lưu xong thì quay về kho đồ
        ]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Cập nhật thất bại. Thử lại sau nhé!");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#B59DFF" /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa đồ</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.label}>Tên trang phục / Wig</Text>
          <TextInput 
            style={styles.input} 
            value={formData.name} 
            onChangeText={(txt) => setFormData({...formData, name: txt})}
            placeholder="Ví dụ: Kimono Ganyu..."
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Size</Text>
              <TextInput 
                style={styles.input} 
                value={formData.size} 
                onChangeText={(txt) => setFormData({...formData, size: txt})}
                placeholder="S, M, L, XL..."
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Số lượng kho</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                value={formData.numberOfItems} 
                onChangeText={(txt) => setFormData({...formData, numberOfItems: txt})}
              />
            </View>
          </View>

          <Text style={styles.label}>Giá thuê mỗi ngày (VNĐ)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric"
            value={formData.pricePerDay} 
            onChangeText={(txt) => setFormData({...formData, pricePerDay: txt})}
          />

          <Text style={styles.label}>Tiền cọc (VNĐ)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric"
            value={formData.depositAmount} 
            onChangeText={(txt) => setFormData({...formData, depositAmount: txt})}
          />

          <Text style={styles.label}>Mô tả chi tiết</Text>
          <TextInput 
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
            multiline
            value={formData.description} 
            onChangeText={(txt) => setFormData({...formData, description: txt})}
            placeholder="Bộ đồ gồm những món gì, tình trạng ra sao..."
          />

          <TouchableOpacity 
            style={[styles.btnSave, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSaveText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  scrollContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0D7FF', borderRadius: 10, padding: 12, fontSize: 16, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btnSave: { backgroundColor: '#B59DFF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, shadowColor: '#B59DFF', shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});