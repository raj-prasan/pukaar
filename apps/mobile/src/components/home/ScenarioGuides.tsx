import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const guides = [
  {
    title: "Flood Alert",
    subtitle: "Rising water & flash floods",
    icon: "water" as const,
    color: "#0284c7",
    bg: "rgba(2, 132, 199, 0.1)",
    steps: [
      "Move to higher ground immediately; do not wait for water to rise further.",
      "Avoid walking or driving through moving water, even if it looks shallow.",
      "Turn off main electricity breakers if you can safely reach them without wading.",
      "Report your location via Pukaar SOS if you are stranded or trapped.",
    ],
  },
  {
    title: "Earthquake",
    subtitle: "Drop, cover & hold on",
    icon: "pulse" as const,
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.1)",
    steps: [
      "Drop to hands and knees, cover under sturdy furniture, and hold on until shaking stops.",
      "Stay away from glass windows, exterior walls, and heavy overhead lighting.",
      "Do not use elevators; use stairwells only once shaking ceases completely.",
      "Check yourself and nearby survivors for injuries before moving outside.",
    ],
  },
  {
    title: "Fire Hazard",
    subtitle: "Smoke escape & containment",
    icon: "flame" as const,
    color: "#e11d48",
    bg: "rgba(225, 29, 72, 0.1)",
    steps: [
      "Stay low to the floor beneath smoke where air is clearer and cooler.",
      "Feel door surfaces and handles with the back of your hand before opening.",
      "Once you are out, stay out — never re-enter a burning structure for belongings.",
      "Call emergency helpline 112 and signal from a window if escape routes are blocked.",
    ],
  },
  {
    title: "Severe Storm",
    subtitle: "High winds & lightning",
    icon: "thunderstorm" as const,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.1)",
    steps: [
      "Stay indoors away from windows, skylights, and glass exterior doors.",
      "Avoid sheltering under isolated tall trees or temporary tin/metal sheds.",
      "Unplug high-voltage electronics if lightning is frequent in your vicinity.",
      "Keep power banks and phones ready for emergency broadcasts.",
    ],
  },
];

export default function ScenarioGuides() {
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);
  const activeGuide = selectedGuide === null ? null : guides[selectedGuide];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>SAFETY PROTOCOLS</Text>
        <Text style={styles.sectionTitle}>Disaster Survival Guides</Text>
        <Text style={styles.sectionSubtitle}>
          Tap any hazard for quick, field-verified survival steps.
        </Text>
      </View>

      <View style={styles.grid}>
        {guides.map((guide, index) => (
          <Pressable
            key={guide.title}
            accessibilityRole="button"
            onPress={() => setSelectedGuide(index)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={[styles.iconBox, { backgroundColor: guide.bg }]}>
              <Ionicons name={guide.icon} size={20} color={guide.color} />
            </View>
            <Text style={styles.cardTitle}>{guide.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {guide.subtitle}
            </Text>
            <View style={styles.cardBottomRow}>
              <Text style={[styles.stepsCount, { color: guide.color }]}>
                {guide.steps.length} Steps
              </Text>
              <Ionicons name="chevron-forward" size={14} color={guide.color} />
            </View>
          </Pressable>
        ))}
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
                <View style={[styles.modalIconBox, { backgroundColor: activeGuide.bg }]}>
                  <Ionicons name={activeGuide.icon} size={22} color={activeGuide.color} />
                </View>
                <View style={styles.modalHeading}>
                  <Text style={styles.modalTitle}>{activeGuide.title}</Text>
                  <Text style={styles.modalSubtitle}>{activeGuide.subtitle}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close guide"
                  accessibilityRole="button"
                  hitSlop={12}
                  onPress={() => setSelectedGuide(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.stepsList}>
                {activeGuide.steps.map((step, idx) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: activeGuide.bg }]}>
                      <Text style={[styles.stepNumberText, { color: activeGuide.color }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedGuide(null)}
                style={[styles.dismissButton, { backgroundColor: activeGuide.color }]}
              >
                <Text style={styles.dismissButtonText}>Understood</Text>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  sectionSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
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
    width: "48%",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginBottom: 10,
    width: 38,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  cardBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginTop: 10,
  },
  stepsCount: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    maxWidth: 440,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  modalIconBox: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalHeading: {
    flex: 1,
  },
  modalTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    marginTop: 1,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stepsList: {
    gap: 12,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  stepNumberBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stepText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  dismissButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    paddingVertical: 13,
  },
  dismissButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

