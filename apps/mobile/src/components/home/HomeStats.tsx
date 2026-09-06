import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";

export default function HomeStats() {
  const incidents = useQuery(api.public.incidents.getActiveIncidents);
  const camps = useQuery(api.public.camps.getActiveCamps);

  const incidentCount = incidents !== undefined ? incidents.length.toString() : "--";
  const campCount =
    camps !== undefined && camps.length > 0 ? camps.length.toString() : "0";

  return (
    <View style={styles.container}>
      {/* Stat Card 1: Incidents */}
      <View style={styles.statCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, styles.incidentIconWrap]}>
            <Ionicons name="warning-outline" size={17} color={theme.colors.destructive} />
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.incidentDot} />
            <Text style={styles.incidentLiveText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.statValue}>{incidentCount}</Text>
        <Text style={styles.statLabel}>Active Hazards</Text>
        <Text style={styles.statMeta}>Nearby verified incidents</Text>
      </View>

      {/* Stat Card 2: Relief Camps */}
      <View style={styles.statCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, styles.campIconWrap]}>
            <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.verified} />
          </View>
          <View style={[styles.liveIndicator, styles.campLiveIndicator]}>
            <View style={styles.campDot} />
            <Text style={styles.campLiveText}>OPEN</Text>
          </View>
        </View>

        <Text style={styles.statValue}>{campCount}</Text>
        <Text style={styles.statLabel}>Relief Shelters</Text>
        <Text style={styles.statMeta}>Beds & supply hubs active</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  incidentIconWrap: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  campIconWrap: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  liveIndicator: {
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  incidentDot: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  incidentLiveText: {
    color: theme.colors.destructive,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  campLiveIndicator: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  campDot: {
    backgroundColor: theme.colors.verified,
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  campLiveText: {
    color: theme.colors.verified,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statValue: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  statMeta: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
});

