import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type HomeHeaderProps = {
  firstName: string;
};

export default function HomeHeader({ firstName }: HomeHeaderProps) {
  const router = useRouter();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const formattedName =
    firstName && firstName !== "THERE"
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : "Friend";

  const initial =
    formattedName !== "Friend" ? formattedName.charAt(0).toUpperCase() : null;

  return (
    <View style={styles.container}>
      {/* Top Status Bar & Profile */}
      <View style={styles.topRow}>
        <View style={styles.networkBadge}>
          <View style={styles.pulseDotWrapper}>
            <View style={styles.pulseDot} />
          </View>
          <Text style={styles.networkBadgeText}>DISASTER RADAR ACTIVE</Text>
        </View>

        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.profileButtonPressed,
          ]}
        >
          {initial ? (
            <Text style={styles.avatarInitial}>{initial}</Text>
          ) : (
            <Ionicons name="person" size={17} color={theme.colors.primary} />
          )}
          <View style={styles.onlineStatusDot} />
        </Pressable>
      </View>

      {/* Main Salutation */}
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>{greeting}</Text>
        <Text style={styles.title}>
          {formattedName} <Text style={styles.titleEmoji}>🛡️</Text>
        </Text>
        <Text style={styles.subtitle}>
          Stay alert. Verified relief hubs and field teams are on standby.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  networkBadge: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.22)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  pulseDotWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    backgroundColor: theme.colors.verified,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  networkBadgeText: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    height: 40,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    width: 40,
  },
  profileButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarInitial: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  onlineStatusDot: {
    backgroundColor: theme.colors.verified,
    borderColor: theme.colors.card,
    borderRadius: 5,
    borderWidth: 1.5,
    bottom: 0,
    height: 10,
    position: "absolute",
    right: 0,
    width: 10,
  },
  greetingBlock: {
    marginTop: 2,
  },
  eyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  titleEmoji: {
    fontSize: 20,
  },
  subtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});

