import { ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const resources = [
  { name: "Camp A Shelter", meta: "1.4 km - 120 beds" },
  { name: "Medical Post 2", meta: "2.0 km - Open now" },
  { name: "Food Distribution", meta: "0.9 km - Until 6 PM" },
];

export default function NearbyResources() {
  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Nearby resources</Text>
        <Text style={styles.link}>See all</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {resources.map((resource) => (
          <View key={resource.name} style={styles.card}>
            <Text style={styles.tag}>VERIFIED</Text>
            <Text style={styles.name}>{resource.name}</Text>
            <Text style={styles.meta}>{resource.meta}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  link: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  scrollRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    width: 132,
    padding: 14,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(34,197,94,0.14)",
    color: theme.colors.verified,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  name: {
    marginTop: 8,
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    marginTop: 2,
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
});
