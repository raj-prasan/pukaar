import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const stats = [
  { value: "3", label: "Active incidents nearby", color: theme.colors.destructive },
  { value: "6", label: "Open shelters", color: theme.colors.verified },
];

export default function HomeStats() {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.card}>
          <Text style={[styles.value, { color: stat.color }]}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  card: {
    flex: 1,
    padding: 14,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
  label: {
    marginTop: 2,
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
});
