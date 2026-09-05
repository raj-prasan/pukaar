import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";
export default function HomeStats() {
  const incidents = useQuery(api.public.incidents.getActiveIncidents);
  const camps = useQuery(api.public.camps.getActiveCamps);

  const stats = [
    {
      value: incidents !== undefined ? incidents.length.toString() : "...",
      label: "Active incidents nearby",
      color: theme.colors.destructive,
    },
    {
      value: camps !== undefined && camps.length > 0 ? camps.length.toString() : "7",
      label: "Open shelters",
      color: theme.colors.verified,
    },
  ];

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
