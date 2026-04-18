import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { orderService } from "@/src/services/orderService";

export default function ReturnCameraScreen() {
  const { id } = useLocalSearchParams(); // Nhận id đơn hàng
  const [returnImage, setReturnImage] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mở Camera bắt buộc (chống gian lận)
  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Cấp quyền", "Vui lòng cho phép ứng dụng dùng Camera để chụp ảnh nhé!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) { 
      setReturnImage(result.assets[0]); 
    }
  };

  const submitReturn = async () => {
    if (!returnImage) {
      Alert.alert("Thiếu thông tin", "Bạn phải chụp ảnh tình trạng đồ trước khi gửi trả để bảo vệ tiền cọc nhé!");
      return;
    }
    if (!trackingCode.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập mã vận đơn để Chủ shop dễ dàng theo dõi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const localUri = returnImage.uri;
      const filename = localUri.split('/').pop() || 'return-image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('images', { uri: localUri, name: filename, type } as any);

      const res = await orderService.returnItem(Number(id), {
        returnCondition: "GOOD",
        trackingCode: trackingCode,
      });

      if (res.data.code === 0) {
        Alert.alert("Hoàn tất", "Đã gửi thông tin trả hàng. Vui lòng chờ Shop xác nhận để nhận lại cọc nha!", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Lỗi", res.data.message);
      }
    } catch (error) {
      console.error("Lỗi trả hàng:", error);
      Alert.alert("Lỗi", "Không thể gửi yêu cầu trả hàng lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận Trả đồ</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.warningBox}>
            <Ionicons name="shield-checkmark" size={24} color="#FF9900" />
            <Text style={styles.warningText}>
              Chụp ảnh tình trạng bộ đồ lúc đóng gói giúp bạn lấy lại 100% tiền cọc nếu đồ không bị hư hại.
            </Text>
          </View>

          <Text style={styles.label}>Ảnh minh chứng (Bắt buộc)</Text>
          <TouchableOpacity style={styles.imageBox} onPress={takePicture}>
            {returnImage ? (
              <Image source={{ uri: returnImage.uri }} style={styles.imagePreview} />
            ) : (
              <>
                <Ionicons name="camera" size={40} color="#B59DFF" />
                <Text style={styles.imageBoxText}>Bấm để mở Camera</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Mã vận đơn hoàn trả (Bắt buộc)</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ví dụ: GHTK123456789..."
            value={trackingCode}
            onChangeText={setTrackingCode}
            autoCapitalize="characters"
          />

          <TouchableOpacity 
            style={[styles.btnSubmit, isSubmitting && { opacity: 0.7 }]} 
            onPress={submitReturn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSubmitText}>Gửi yêu cầu trả hàng</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B6B' },
  content: { padding: 20 },
  warningBox: { flexDirection: 'row', backgroundColor: '#FFF9F0', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 25 },
  warningText: { flex: 1, marginLeft: 10, color: '#D97706', fontSize: 13, lineHeight: 20 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  imageBox: { height: 180, backgroundColor: '#F4F1FF', borderRadius: 12, borderWidth: 1, borderColor: '#D1C4E9', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageBoxText: { marginTop: 10, color: '#8E7AB5', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#E0D7FF', borderRadius: 10, padding: 15, fontSize: 16, backgroundColor: '#F8F9FA', marginBottom: 30, color: '#333' },
  btnSubmit: { backgroundColor: '#FF9900', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#FF9900', shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  btnSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});