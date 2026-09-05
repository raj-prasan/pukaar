import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

export default function EmergencyActions() {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Report an incident"
        accessibilityRole="button"
        onPress={() => router.push("/report")}
        style={styles.reportButton}
      >
        <Ionicons name="document-text-outline" size={22} color={theme.colors.accentForeground} />
        <Text style={styles.reportTitle}>Report incident</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Send SOS"
        accessibilityRole="button"
        onPress={() => router.push("/(app)/sos")}
        style={styles.sosButton}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={20} color={theme.colors.destructiveForeground} />
        </View>
        <View>
          <Text style={styles.title}>Send SOS</Text>
          <Text style={styles.subtitle}>Immediate danger - get help now</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.destructive,
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  title: {
    color: theme.colors.destructiveForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
  },
  reportButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.accent,
  },
  reportTitle: {
    color: theme.colors.accentForeground,
    fontSize: 15,
    fontWeight: "700",
  },
});
