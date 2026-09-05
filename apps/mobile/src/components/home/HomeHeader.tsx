import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type HomeHeaderProps = {
  firstName: string;
};

export default function HomeHeader({ firstName }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>GOOD MORNING, {firstName}</Text>
      <Text style={styles.title}>Stay safe out there</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  eyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "700",
  },
});
