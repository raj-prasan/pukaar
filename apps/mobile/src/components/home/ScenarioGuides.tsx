import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const guides = [
  {
    title: "Flood",
    subtitle: "Rising water, blocked roads",
    icon: "water" as const,
    color: theme.colors.primary,
    steps: [
      "Move to higher ground immediately, do not wait for water to rise further.",
      "Avoid walking or driving through moving water, even shallow.",
      "Report your location if you are trapped.",
    ],
  },
  {
    title: "Earth Quake",
    subtitle: "During and after shaking",
    icon: "warning" as const,
    color: theme.colors.accent,
    steps: [
      "Drop, cover under sturdy furniture, and hold on until shaking stops.",
      "Stay away from windows, mirrors, and tall furniture.",
      "Check for injuries before moving outside.",
    ],
  },
  {
    title: "Fire",
    subtitle: "Smoke, structural fire",
    icon: "flame" as const,
    color: theme.colors.destructive,
    steps: [
      "Stay low to the ground to avoid smoke inhalation.",
      "Check doors for heat before opening.",
      "Once out, stay out - do not re-enter for belongings.",
    ],
  },
  {
    title: "Severe storm",
    subtitle: "High wind, heavy rain",
    icon: "thunderstorm" as const,
    color: theme.colors.secondary,
    steps: [
      "Stay indoors and away from windows until it passes.",
      "Avoid sheltering under trees or loose structures outside.",
      "Unplug electronics if lightning is frequent nearby.",
    ],
  },
];

export default function ScenarioGuides() {
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);
  const activeGuide = selectedGuide === null ? null : guides[selectedGuide];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>If this happens</Text>
      <View style={styles.list}>
        {guides.map((guide, index) => {
          return (
            <Pressable
              key={guide.title}
              accessibilityRole="button"
              onPress={() => setSelectedGuide(index)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: `${guide.color}24` }]}>
                  <Ionicons name={guide.icon} size={19} color={guide.color} />
                </View>
                <View style={styles.heading}>
                  <Text style={styles.title}>{guide.title}</Text>
                  <Text style={styles.subtitle}>{guide.subtitle}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#8b99a3"
                />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Modal
        transparent
        visible={activeGuide !== null}
        animationType="fade"
        onRequestClose={() => setSelectedGuide(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedGuide(null)}>
          {activeGuide ? (
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${activeGuide.color}24` }]}>
                  <Ionicons name={activeGuide.icon} size={22} color={activeGuide.color} />
                </View>
                <View style={styles.heading}>
                  <Text style={styles.modalTitle}>{activeGuide.title}</Text>
                  <Text style={styles.subtitle}>{activeGuide.subtitle}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close guide"
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setSelectedGuide(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={theme.colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.steps}>
                {activeGuide.steps.map((step) => (
                  <View key={step} style={styles.step}>
                    <View style={[styles.bullet, { backgroundColor: activeGuide.color }]} />
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 10,
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
  },
  card: {
    width: "48%",
    overflow: "hidden",
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  cardPressed: {
    opacity: 0.78,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  heading: {
    flex: 1,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 13.5,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 1,
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: 18,
    backgroundColor: theme.colors.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  modalTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
  },
  steps: {
    gap: 8,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 61,
  },
  step: {
    flexDirection: "row",
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.mutedForeground,
  },
  stepText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 12,
    lineHeight: 18,
  },
});
