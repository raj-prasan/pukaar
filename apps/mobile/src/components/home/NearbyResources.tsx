import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";

const fallbackResources = [
  {
    name: "Central Relief Camp A",
    address: "Community Sports Center",
    meta: "1.2 km · Beds & Medical Ready",
    phone: "112",
  },
  {
    name: "Riverbank Sector Base",
    address: "Govt High School Grounds",
    meta: "2.4 km · Food & Potable Water",
    phone: "112",
  },
  {
    name: "North Emergency Shelter",
    address: "Town Civic Pavilion",
    meta: "3.1 km · First Aid & Triage",
    phone: "112",
  },
];

export default function NearbyResources() {
  const router = useRouter();
  const camps = useQuery(api.public.camps.getActiveCamps);

  const displayCamps =
    camps && camps.length > 0
      ? camps.map((c) => ({
          name: c.name,
          address: c.address,
          meta: c.city ? `${c.city} · Open 24/7` : "Active Relief Base",
          phone: c.contactPhone,
        }))
      : fallbackResources;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.sectionEyebrow}>SAFE HAVENS</Text>
          <Text style={styles.title}>Relief Shelters & Hubs</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push("/second")}
          style={styles.seeAllButton}
        >
          <Text style={styles.link}>View Map</Text>
          <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {displayCamps.map((resource, idx) => (
          <Pressable
            key={`${resource.name}_${idx}`}
            accessibilityRole="button"
            onPress={() => router.push("/second")}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.cardTop}>
              <View style={styles.tag}>
                <Ionicons name="shield-checkmark" size={11} color={theme.colors.verified} />
                <Text style={styles.tagText}>VERIFIED</Text>
              </View>
              <Ionicons name="location-sharp" size={14} color={theme.colors.primary} />
            </View>

            <Text style={styles.name} numberOfLines={1}>
              {resource.name}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              {resource.address}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.meta} numberOfLines={1}>
                {resource.meta}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.viewShelterText}>Directions</Text>
              <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  titleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  sectionEyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  seeAllButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 2,
  },
  link: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  scrollRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    padding: 15,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    width: 190,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tag: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    color: "#047857",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  name: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  address: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    lineHeight: 15,
  },
  metaRow: {
    marginTop: 8,
  },
  meta: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
  },
  viewShelterText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
});

