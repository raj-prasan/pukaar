  import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

type IncidentCategory =
  | "flood"
  | "fire"
  | "landslide"
  | "earthquake"
  | "medical"
  | "road_blocked"
  | "building_damage"
  | "missing_person"
  | "other";

type IncidentPriority = "low" | "medium" | "high" | "critical";

type IncidentPayload = {
  category: IncidentCategory;
  title: string;
  description: string;
  address: string;
  priority: IncidentPriority;
  latitude: number;
  longitude: number;
  photo: {
    uri: string;
    width: number;
    height: number;
    format: string;
  };
  createdAt: string;
};

const categories: Array<{ value: IncidentCategory; label: string }> = [
  { value: "flood", label: "Flood" },
  { value: "fire", label: "Fire" },
  { value: "landslide", label: "Landslide" },
  { value: "earthquake", label: "Earthquake" },
  { value: "medical", label: "Medical" },
  { value: "road_blocked", label: "Road blocked" },
  { value: "building_damage", label: "Building damage" },
  { value: "missing_person", label: "Missing person" },
  { value: "other", label: "Other" },
];

const priorities: Array<{ value: IncidentPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function ReportScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [priority, setPriority] = useState<IncidentPriority | null>(null);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [payload, setPayload] = useState<IncidentPayload | null>(null);

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
      Alert.alert("Unable to get location", "Try again or enter the location manually.");
    } finally {
      setIsLocating(false);
    }
  }

  async function handleOpenCamera() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert("Camera permission needed", "Allow camera access to attach a photo.");
        return;
      }
    }

    setIsCameraOpen(true);
  }

  async function handleTakePhoto() {
    if (!cameraRef.current) {
      return;
    }

    try {
      const capturedPhoto = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (capturedPhoto) {
        setPhoto(capturedPhoto);
        setIsCameraOpen(false);
      }
    } catch {
      Alert.alert("Unable to take photo", "Please try opening the camera again.");
    }
  }

  function handleSubmit() {
    if (!category || !priority || !address.trim() || !latitude || !longitude || !photo) {
      Alert.alert(
        "Complete the report",
        "Select an incident type and urgency, enter the location, capture GPS coordinates, and add a photo.",
      );
      return;
    }

    const selectedCategory = categories.find((item) => item.value === category);
    const nextPayload: IncidentPayload = {
      category,
      title: selectedCategory?.label ?? category,
      description: description.trim(),
      address: address.trim(),
      priority,
      latitude,
      longitude,
      photo: {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        format: photo.format,
      },
      createdAt: new Date().toISOString(),
    };

    setPayload(nextPayload);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>INCIDENT REPORT</Text>
            <Text style={styles.heading}>Tell us what happened</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Incident type</Text>
        <View style={styles.optionGrid}>
          {categories.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => setCategory(item.value)}
              style={[styles.option, category === item.value && styles.optionSelected]}
            >
              <Text style={[styles.optionText, category === item.value && styles.optionTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Urgency</Text>
        <View style={styles.priorityRow}>
          {priorities.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => setPriority(item.value)}
              style={[styles.priority, priority === item.value && styles.prioritySelected]}
            >
              <Text style={[styles.priorityText, priority === item.value && styles.priorityTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Location</Text>
        <TextInput
          multiline
          onChangeText={setAddress}
          placeholder="Enter a landmark, address, or camp name"
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, styles.addressInput]}
          value={address}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isLocating}
          onPress={handleUseCurrentLocation}
          style={styles.secondaryButton}
        >
          <Ionicons name="locate-outline" size={20} color={theme.colors.foreground} />
          <Text style={styles.secondaryButtonText}>
            {isLocating
              ? "Getting GPS location..."
              : latitude !== null && longitude !== null
                ? "GPS location captured"
                : "Use current GPS location"}
          </Text>
        </Pressable>
        {latitude && longitude && (
          <Text style={styles.metaText}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        )}

        <Text style={styles.sectionLabel}>What happened?</Text>
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Add useful details for responders"
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, styles.descriptionInput]}
          textAlignVertical="top"
          value={description}
        />

        <Text style={styles.sectionLabel}>Photo evidence</Text>
        {isCameraOpen ? (
          <View style={styles.cameraFrame}>
            <CameraView ref={cameraRef} facing="back" style={styles.camera} />
            <Pressable accessibilityRole="button" onPress={handleTakePhoto} style={styles.captureButton}>
              <Ionicons name="camera" size={24} color={theme.colors.foreground} />
              <Text style={styles.captureButtonText}>Capture photo</Text>
            </Pressable>
          </View>
        ) : photo ? (
          <View style={styles.photoFrame}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <Pressable accessibilityRole="button" onPress={handleOpenCamera} style={styles.retakeButton}>
              <Text style={styles.retakeButtonText}>Retake photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={handleOpenCamera} style={styles.photoButton}>
            <Ionicons name="camera-outline" size={24} color={theme.colors.foreground} />
            <Text style={styles.photoButtonText}>Add a photo</Text>
          </Pressable>
        )}

        <Pressable accessibilityRole="button" onPress={handleSubmit} style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Prepare incident payload</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.primaryForeground} />
        </Pressable>

        {payload && (
          <View style={styles.payloadBox}>
            <Text style={styles.payloadTitle}>Payload ready</Text>
            <Text selectable style={styles.payloadText}>
              {JSON.stringify(payload, null, 2)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: theme.colors.primaryForeground,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priority: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  prioritySelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  priorityText: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  priorityTextSelected: {
    fontWeight: "800",
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
  addressInput: {
    minHeight: 52,
  },
  descriptionInput: {
    minHeight: 100,
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  metaText: {
    marginTop: 8,
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 120,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  photoButtonText: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  cameraFrame: {
    height: 280,
    overflow: "hidden",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.foreground,
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  captureButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  photoFrame: {
    overflow: "hidden",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  photo: {
    width: "100%",
    height: 220,
  },
  retakeButton: {
    alignItems: "center",
    padding: 12,
  },
  retakeButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    marginTop: 28,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 14,
    fontWeight: "800",
  },
  payloadBox: {
    marginTop: 16,
    padding: 14,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.verified,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  payloadTitle: {
    marginBottom: 8,
    color: theme.colors.verified,
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
