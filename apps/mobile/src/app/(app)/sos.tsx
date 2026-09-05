import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@backend/convex/_generated/api";
import { theme } from "@/constants/theme";

type SOSSituation = "trapped" | "injured" | "evacuation" | "medicine" | "danger" | "other";

type SOSPayload = {
  situation: SOSSituation;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  peopleCount?: number;
};

const situations: Array<{ value: SOSSituation; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "trapped", label: "Trapped", icon: "lock-closed-outline" },
  { value: "injured", label: "Injured", icon: "medkit-outline" },
  { value: "evacuation", label: "Evacuation", icon: "exit-outline" },
  { value: "medicine", label: "Medicine", icon: "bandage-outline" },
  { value: "danger", label: "Danger", icon: "warning-outline" },
  { value: "other", label: "Other", icon: "help-circle-outline" },
];

export default function SOSScreen() {
  const router = useRouter();
  const [situation, setSituation] = useState<SOSSituation | null>(null);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<SOSPayload | null>(null);
  const createSOS = useMutation(api.public.sos.createSOS);

  async function handleUseCurrentLocation() {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Location permission needed", "Allow location access to attach GPS coordinates.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(currentLocation.coords.latitude);
      setLongitude(currentLocation.coords.longitude);
    } catch {
      Alert.alert("Unable to get location", "Try again and capture your GPS location.");
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSubmit() {
    const parsedPeopleCount = peopleCount.trim() ? Number(peopleCount) : undefined;
    const hasValidPeopleCount = parsedPeopleCount === undefined || Number.isInteger(parsedPeopleCount) && parsedPeopleCount > 0;

    if (!situation || !description.trim() || latitude === null || longitude === null || !hasValidPeopleCount) {
      Alert.alert(
        "Complete the SOS",
        "Choose a situation, describe what is happening, capture GPS coordinates, and enter a valid people count if needed.",
      );
      return;
    }

    const nextPayload: SOSPayload = {
      situation,
      description: description.trim(),
      latitude,
      longitude,
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(parsedPeopleCount !== undefined ? { peopleCount: parsedPeopleCount } : {}),
    };

    setIsSubmitting(true);
    setMessage(null);

    try {
      await createSOS(nextPayload);
      setPayload(nextPayload);
      setMessage("SOS submitted. Help is being coordinated.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to submit the SOS.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>EMERGENCY SOS</Text>
            <Text style={styles.heading}>Tell us what you need</Text>
          </View>
          </View>

        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color={theme.colors.destructiveForeground} />
          <Text style={styles.warningText}>For immediate danger, submit this SOS now.</Text>
        </View>

        <Text style={styles.sectionLabel}>What is happening?</Text>
        <View style={styles.optionGrid}>
          {situations.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => setSituation(item.value)}
              style={[styles.option, situation === item.value && styles.optionSelected]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={situation === item.value ? theme.colors.destructiveForeground : theme.colors.foreground}
              />
              <Text style={[styles.optionText, situation === item.value && styles.optionTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Describe the situation</Text>
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="What should responders know?"
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, styles.descriptionInput]}
          textAlignVertical="top"
          value={description}
        />

        <Text style={styles.sectionLabel}>Location</Text>
        <TextInput
          multiline
          onChangeText={setAddress}
          placeholder="Optional landmark, address, or camp name"
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, styles.addressInput]}
          value={address}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isLocating}
          onPress={handleUseCurrentLocation}
          style={styles.locationButton}
        >
          <Ionicons name="locate-outline" size={20} color={theme.colors.foreground} />
          <Text style={styles.locationButtonText}>
            {isLocating
              ? "Getting GPS location..."
              : latitude !== null && longitude !== null
                ? "GPS location captured"
                : "Capture current GPS location"}
          </Text>
        </Pressable>
        {latitude !== null && longitude !== null && (
          <Text style={styles.metaText}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        )}

        <Text style={styles.sectionLabel}>How many people need help?</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setPeopleCount}
          placeholder="Optional"
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.input}
          value={peopleCount}
        />

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => void handleSubmit()}
          style={styles.submitButton}
        >
          <Ionicons name="radio-outline" size={21} color={theme.colors.destructiveForeground} />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting SOS..." : "Submit SOS"}
          </Text>
        </Pressable>

        {message && <Text style={styles.messageText}>{message}</Text>}

        {payload && (
          <View style={styles.payloadBox}>
            <Text style={styles.payloadTitle}>SOS payload ready</Text>
            <Text selectable style={styles.payloadText}>
              {JSON.stringify(payload, null, 2)}
            </Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: theme.colors.destructive,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heading: {
    marginTop: 4,
    color: theme.colors.foreground,
    fontSize: 26,
    fontWeight: "800",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.destructive,
  },
  warningText: {
    flex: 1,
    color: theme.colors.destructiveForeground,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    width: "31.5%",
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  optionSelected: {
    borderColor: theme.colors.destructive,
    backgroundColor: theme.colors.destructive,
  },
  optionText: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  optionTextSelected: {
    color: theme.colors.destructiveForeground,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
    color: theme.colors.foreground,
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 112,
  },
  addressInput: {
    minHeight: 52,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    marginTop: 10,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.muted,
  },
  locationButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  metaText: {
    marginTop: 8,
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 56,
    marginTop: 28,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.destructive,
  },
  submitButtonText: {
    color: theme.colors.destructiveForeground,
    fontSize: 14,
    fontWeight: "800",
  },
  messageText: {
    marginTop: 12,
    color: theme.colors.verified,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  payloadBox: {
    marginTop: 16,
    padding: 14,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.destructive,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  payloadTitle: {
    marginBottom: 8,
    color: theme.colors.destructive,
    fontSize: 14,
    fontWeight: "800",
  },
  payloadText: {
    color: theme.colors.mutedForeground,
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
});
