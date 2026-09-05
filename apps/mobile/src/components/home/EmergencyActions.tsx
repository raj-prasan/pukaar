import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

export default function EmergencyActions() {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" style={styles.sosButton}>
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={20} color={theme.colors.destructiveForeground} />
        </View>
        <View>
          <Text style={styles.title}>Send SOS</Text>
          <Text style={styles.subtitle}>Immediate danger - get help now</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Report an incident"
        accessibilityRole="button"
        style={styles.reportButton}
      >
        <Ionicons name="add" size={26} color="#eaeff2" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  sosButton: {
    flex: 1,
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
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
});
