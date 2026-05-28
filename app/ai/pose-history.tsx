import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axiosClient from "@/src/api/axiosClient";
import { getAppAccessToken } from "@/src/utils/appAccessToken";

type PoseScore = {
  id: number;
  imageUrl: string;
  score: number;
  createdAt: string;
  comment: string;
  characterName: string;
};

export default function PoseHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<PoseScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = await getAppAccessToken();
      if (!token) {
        Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để xem lịch sử.", [
          { text: "Đăng nhập", onPress: () => router.push("/(auth)/login" as any) }
        ]);
        return;
      }

      const response = await axiosClient.get<{ result: PoseScore[] }>("/search/pose-history");
      setHistory(response.data?.result ?? []);
    } catch (error) {
      console.error("Lỗi lấy lịch sử Pose:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#d946ef"; // pink/purple
    if (score >= 60) return "#f59e0b"; // orange/red
    return "#9ca3af"; // gray
  };

  const renderItem = ({ item }: { item: PoseScore }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/ai/pose-detail/${item.id}` as any)}
    >
      <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.image} />
      
      <View style={[styles.badge, { backgroundColor: getScoreColor(item.score) }]}>
        <Text style={styles.badgeText}>✨ {item.score}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.characterName} numberOfLines={1}>{item.characterName || "Unknown"}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Lịch sử Pose Battle</Text>
      
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Chưa có lịch sử chấm điểm nào.</Text>
          <TouchableOpacity onPress={() => router.push("/ai/pose-battle" as any)}>
            <Text style={styles.emptySubText}>Thử Pose Battle ngay!</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF4FF" },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#831843",
    textAlign: "center",
    marginVertical: 16,
  },
  listContent: { paddingHorizontal: 12, paddingBottom: 30 },
  row: { justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#D946EF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  info: {
    padding: 12,
    backgroundColor: "#FDF2F8",
  },
  characterName: {
    color: "#831843",
    fontWeight: "800",
    fontSize: 15,
  },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { color: "#9D174D", fontSize: 16, fontWeight: "700" },
  emptySubText: { color: "#D946EF", fontSize: 16, fontWeight: "800", marginTop: 12, textDecorationLine: "underline" },
});
