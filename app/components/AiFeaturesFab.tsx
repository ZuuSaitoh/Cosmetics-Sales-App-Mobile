import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Khoảng cách từ đáy vùng nội dung Home tới đáy nút FAB (đã nằm phía trên thanh tab).
 */
const FAB_MARGIN_BOTTOM = Platform.OS === "ios" ? 6 : 4;

type AiMenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function AiMenuRow({ icon, title, subtitle, onPress }: AiMenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={22} color="#B59DFF" />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4B9DF" />
    </TouchableOpacity>
  );
}

export function AiFeaturesFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const fabBottom = FAB_MARGIN_BOTTOM;

  const openMenu = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  const goPoseBattle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeMenu();
    router.push("/(tabs)/pose-battle" as never);
  };

  const goImageSearch = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeMenu();
    router.push("/ai/image-search" as never);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={openMenu}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Tính năng AI"
      >
        <Ionicons name="sparkles" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View style={[styles.menuCard, { bottom: fabBottom + 56 + 10, right: 16 }]} pointerEvents="box-none">
            <Text style={styles.menuHeader}>Tính năng AI</Text>
            <AiMenuRow
              icon="body-outline"
              title="Pose Battle"
              subtitle="Thử thách pose & minh họa"
              onPress={goPoseBattle}
            />
            <View style={styles.menuDivider} />
            <AiMenuRow
              icon="camera-outline"
              title="AI Image Search"
              subtitle="Tìm trang phục bằng ảnh"
              onPress={goImageSearch}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#B59DFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#4A3B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 50,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuCard: {
    position: "absolute",
    width: 300,
    maxWidth: "92%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  menuHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F4F0FF",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextWrap: { flex: 1, marginLeft: 12, marginRight: 4 },
  menuTitle: { fontSize: 16, fontWeight: "700", color: "#4A3B6B" },
  menuSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ECECEC",
    marginHorizontal: 12,
  },
});
