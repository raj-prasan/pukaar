import { StyleSheet, Text, View } from "react-native";

type TabPlaceholderProps = {
  eyebrow: string;
  title: string;
};

export function TabPlaceholder({ eyebrow, title }: TabPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#f4f1ea",
  },
  eyebrow: {
    marginBottom: 12,
    color: "#c35c35",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { color: "#1e2925", fontSize: 40, fontWeight: "700", lineHeight: 46 },
});
