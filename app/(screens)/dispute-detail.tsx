import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";

const { width: screenWidth } = Dimensions.get("window");

type DisputeStatus = "PENDING" | "RESOLVED" | "REJECTED" | "CLOSED" | "APPEALED";

export default function DisputeDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const [dispute, setDispute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchDispute();
  }, [orderId]);

  const fetchCurrentUser = async () => {
    const token = await AsyncStorage.getItem("cosmate_token");
    if (token) {
      const decoded: any = jwtDecode(token);
      setCurrentUserId(decoded.sub);
    }
  };

  const fetchDispute = async () => {
    try {
      const res = await axiosClient.get(`/disputes/order/${orderId}`);
      if (res.data.code === 0 && res.data.result) {
        const list = res.data.result as any[];
        if (list.length > 0) {
          setDispute(list[0]);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy dispute:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: DisputeStatus | string): string => {
    const map: Record<string, string> = {
      PENDING: "Chờ xử lý",
      RESOLVED: "Đã giải quyết",
      REJECTED: "Từ chối",
      CLOSED: "Đã đóng",
      APPEALED: "Kháng cáo",
    };
    return map[status] ?? status;
  };

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      PENDING: "#FF9800",
      RESOLVED: "#28A745",
      REJECTED: "#DC3545",
      CLOSED: "#9E9E9E",
      APPEALED: "#2196F3",
    };
    return map[status] ?? "#999";
  };

  const getDisputeTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      REFUND: "Yêu cầu hoàn tiền",
      COMPENSATION: "Yêu cầu bồi thường",
      RETURN: "Yêu cầu trả hàng",
      OTHER: "Khác",
    };
    return map[type] ?? type ?? "Khác";
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getImageUri = (img: any): string => {
    if (typeof img === "string") return img;
    return img?.disputeImageUrl || img?.url || img?.imageUrl || img?.uri || "";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết khiếu nại</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B59DFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết khiếu nại</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={60} color="#DDD" />
          <Text style={styles.emptyText}>Không tìm thấy khiếu nại</Text>
        </View>
      </SafeAreaView>
    );
  }

  const images: string[] = (() => {
    const raw = dispute.images || dispute.evidenceImages || dispute.attachments || [];
    return Array.isArray(raw) ? raw.map(getImageUri).filter(Boolean) : [];
  })();

  const isOwner =
    dispute.disputerId === currentUserId ||
    dispute.userId === currentUserId;

  const disputeTypeLabel = getDisputeTypeLabel(dispute.disputeType || dispute.type);
  const amount = dispute.amount || dispute.refundAmount || dispute.compensationAmount;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A3B6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết khiếu nại</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* TRẠNG THÁI */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: getStatusColor(dispute.status) },
          ]}
        >
          <Ionicons name="warning" size={28} color="#fff" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.statusText}>
              {getStatusLabel(dispute.status)}
            </Text>
            <Text style={styles.statusSubText}>
              {isOwner ? "Bạn đã gửi khiếu nại này" : "Bạn nhận được khiếu nại"}
            </Text>
          </View>
        </View>

        {/* THÔNG TIN KHIẾU NẠI */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Thông tin khiếu nại</Text>
          </View>

          {dispute.id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã khiếu nại</Text>
              <Text style={styles.infoValue}>#{dispute.id}</Text>
            </View>
          )}

          {orderId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn hàng</Text>
              <Text style={styles.infoValue}>#{orderId}</Text>
            </View>
          )}

          {(dispute.disputeType || dispute.type) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loại khiếu nại</Text>
              <Text style={styles.infoValue}>{disputeTypeLabel}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày gửi</Text>
            <Text style={styles.infoValue}>{formatDate(dispute.createdAt)}</Text>
          </View>

          {(dispute.updatedAt || dispute.resolvedAt) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cập nhật lần cuối</Text>
              <Text style={styles.infoValue}>
                {formatDate(dispute.updatedAt || dispute.resolvedAt)}
              </Text>
            </View>
          )}

          {dispute.disputerName || dispute.disputerEmail || dispute.userName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Người gửi</Text>
              <Text style={styles.infoValue}>
                {isOwner
                  ? (dispute.disputerName || dispute.userName || "Bạn")
                  : (dispute.disputerName || dispute.userName || "Người bán")}
              </Text>
            </View>
          ) : null}

          {amount != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền yêu cầu</Text>
              <Text style={[styles.infoValue, { color: "#28A745" }]}>
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(Number(amount))}
              </Text>
            </View>
          )}
        </View>

        {/* MÔ TẢ / LÝ DO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#B59DFF" />
            <Text style={styles.cardTitle}>Mô tả chi tiết</Text>
          </View>
          <Text style={styles.reasonText}>
            {dispute.description ||
              dispute.reason ||
              dispute.content ||
              "Không có mô tả."}
          </Text>
        </View>

        {/* HÌNH ẢNH MINH CHỨNG */}
        {images.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="images-outline" size={20} color="#B59DFF" />
              <Text style={styles.cardTitle}>
                Hình ảnh minh chứng ({images.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
            >
              {images.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setInitialIndex(index);
                    setIsPreviewVisible(true);
                  }}
                >
                  <Image source={{ uri }} style={styles.thumbnail} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PHẢN HỒI TỪ QUẢN TRỊ */}
        {(dispute.adminResponse ||
          dispute.adminNote ||
          dispute.response ||
          dispute.resolution) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#28A745"
              />
              <Text style={styles.cardTitle}>Phản hồi từ quản trị viên</Text>
            </View>
            <Text style={styles.reasonText}>
              {dispute.adminResponse ||
                dispute.adminNote ||
                dispute.response ||
                dispute.resolution}
            </Text>
            {dispute.resolvedAt && (
              <Text style={styles.resolvedDate}>
                Xử lý lúc: {formatDate(dispute.resolvedAt)}
              </Text>
            )}
          </View>
        )}

        {/* NHẮC NHỞ */}
        {dispute.status === "PENDING" && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={20} color="#FF9800" />
            <Text style={styles.noticeText}>
              Khiếu nại đang được xử lý. Vui lòng chờ quản trị viên duyệt và
              phản hồi trong thời gian sớm nhất.
            </Text>
          </View>
        )}

        {dispute.status === "REJECTED" && (
          <View style={[styles.noticeCard, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="close-circle-outline" size={20} color="#DC3545" />
            <Text style={styles.noticeText}>
              Khiếu nại bị từ chối. Nếu bạn không đồng ý, có thể gửi kháng cáo
              trong vòng 7 ngày.
            </Text>
          </View>
        )}

        {dispute.status === "RESOLVED" && (
          <View style={[styles.noticeCard, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
            <Text style={styles.noticeText}>
              Khiếu nại đã được giải quyết. Cảm ơn bạn đã kiên nhẫn.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL XEM ẢNH FULL */}
      <Modal
        visible={isPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setIsPreviewVisible(false)}
          >
            <Ionicons name="close-circle" size={45} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: item }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999", marginTop: 10, fontStyle: "italic" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#4A3B6B" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  statusText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  statusSubText: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginHorizontal: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#4A3B6B", marginLeft: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#333", maxWidth: "60%", textAlign: "right" },
  reasonText: { fontSize: 15, color: "#333", lineHeight: 22 },
  imagesScroll: { flexDirection: "row" },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "#E0D7FF",
  },
  resolvedDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
    fontStyle: "italic",
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    margin: 10,
    padding: 15,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#E65100",
    lineHeight: 20,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
  },
  closePreview: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 99,
  },
  fullImage: { width: "100%", height: "80%" },
});