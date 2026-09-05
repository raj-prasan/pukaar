import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type HomeHeaderProps = {
  firstName: string;
};

export default function HomeHeader({ firstName }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>GOOD MORNING, {firstName}</Text>
        <Pressable
          accessibilityLabel="Open profile"
          onPress={() => router.push("/profile")}
          style={styles.profileButton}
        >
          <Ionicons name="person-outline" size={20} color={theme.colors.foreground} />
        </Pressable>
      </View>
      <Text style={styles.title}>Stay safe out there</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
    topRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
  eyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: theme.borderWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "700",
  },
});
