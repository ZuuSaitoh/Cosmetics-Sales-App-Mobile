import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function ReturnCameraScreen() {
  // 1. Lấy ID đơn hàng từ màn hình trước truyền sang
  const { id } = useLocalSearchParams(); 

  // 2. Xin quyền sử dụng Camera
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // Màn hình chờ đang check quyền
  if (!permission) return <View style={styles.container} />;

  // Nếu người dùng chưa cho phép dùng Camera -> Hiện nút xin quyền
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.message}>CosMate cần quyền truy cập Camera để chụp ảnh trả hàng.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btnPrimary}>
          <Text style={styles.btnText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 3. Hàm chụp ảnh
  const takePicture = async () => {
    if (cameraRef.current) {
      const pic = await cameraRef.current.takePictureAsync();
      setPhoto(pic.uri); // Lưu đường dẫn ảnh vừa chụp vào biến
    }
  };

  // 4. Hàm Gửi ảnh (Tạm thời là Alert, bước sau mình sẽ gắn API POST vào đây)
  const submitReturn = () => {
    Alert.alert("Tuyệt vời", `Đã xác nhận ảnh bằng chứng cho đơn #${id}`);
    router.back(); // Quay lại trang danh sách đơn hàng
  };

  // --- GIAO DIỆN 1: KHI ĐÃ CHỤP ẢNH XONG (XEM TRƯỚC) ---
  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photo }} style={styles.previewImage} />
        
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setPhoto(null)} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Chụp lại</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={submitReturn} style={styles.btnPrimary}>
            <Text style={styles.btnText}>Gửi ảnh bằng chứng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- GIAO DIỆN 2: KHI ĐANG MỞ CAMERA ---
  return (
    <View style={styles.container}>
      {/* Ống kính Camera */}
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      
      {/* Nút bấm chụp hình nổi lên trên */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.captureOuter} onPress={takePicture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
        
        {/* Nút Hủy để quay về trang trước */}
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  message: { textAlign: 'center', marginBottom: 20, fontSize: 16, color: '#333' },
  camera: { flex: 1 },
  // Nút chụp hình tròn tròn giống iPhone
  overlay: { position: 'absolute', bottom: 0, width: '100%', height: 150, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  captureOuter: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  cancelBtn: { position: 'absolute', right: 30 },
  cancelText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  // Khung xem trước ảnh
  previewImage: { flex: 1, width: '100%', resizeMode: 'contain' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#B59DFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  btnSecondary: { backgroundColor: '#F0F0F0', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnSecondaryText: { color: '#333', fontWeight: 'bold', fontSize: 16 }
});