import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
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

type ReportSeverity = "low" | "medium" | "high" | "critical";

type IncidentPayload = {
  category: IncidentCategory;
  title: string;
  description: string;
  address: string;
  severity?: ReportSeverity;
  latitude: number;
  longitude: number;
  photo: {
    uri: string;
    width: number;
    height: number;
    format?: string;
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

const severities: Array<{ value: ReportSeverity; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Module-level cache to eliminate flicker during Convex revalidations
let cachedGlobalSimilarCheck: Record<string, any> = {};

export default function ReportScreen() {
  const router = useRouter();
  const { isLoaded } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [severity, setSeverity] = useState<ReportSeverity | null>(null);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<IncidentPayload | null>(null);
  const createReport = useMutation(api.public.reports.createReport);
  const generateUploadUrl = useMutation(api.public.files.generateUploadUrl);

  // Stabilize coordinates to 3 decimal places (~100m) to prevent microscopic GPS sensor jitter from re-triggering queries
  const stableCoords = useMemo(() => {
    if (latitude === null || longitude === null) return null;
    return {
      lat: Math.round(latitude * 1000) / 1000,
      lon: Math.round(longitude * 1000) / 1000,
    };
  }, [latitude, longitude]);

  const similarCheckQueryArgs = useMemo(() => {
    if (!isLoaded || !category || !stableCoords) return "skip" as const;
    return {
      category,
      latitude: stableCoords.lat,
      longitude: stableCoords.lon,
    };
  }, [isLoaded, category, stableCoords]);

  const similarCheck = useQuery(
    api.public.reports.checkSimilarReportsAndIncidents,
    similarCheckQueryArgs
  );

  const cacheKey =
    category && stableCoords ? `${category}_${stableCoords.lat}_${stableCoords.lon}` : "";
  const lastSimilarCheck = useRef<any>(cacheKey ? cachedGlobalSimilarCheck[cacheKey] : null);

  if (similarCheck !== undefined && similarCheck !== null) {
    lastSimilarCheck.current = similarCheck;
    if (cacheKey) {
      cachedGlobalSimilarCheck[cacheKey] = similarCheck;
    }
  }

  const activeSimilar =
    similarCheck ??
    (cacheKey && cachedGlobalSimilarCheck[cacheKey]
      ? cachedGlobalSimilarCheck[cacheKey]
      : lastSimilarCheck.current);

  const hasUserDuplicate = Boolean(activeSimilar?.hasUserDuplicate);
  const hasSimilarIncident = Boolean(activeSimilar?.hasSimilarIncident);
  const hasSimilarReport = Boolean(activeSimilar?.hasSimilarReport);
  const hasBoth = hasUserDuplicate && hasSimilarIncident;
  const showWarning = Boolean(
    activeSimilar && (hasUserDuplicate || hasSimilarIncident || hasSimilarReport)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      setIsLocating(true);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (isMounted) {
            Alert.alert("Location permission needed", "Allow location access to attach GPS coordinates, then reopen the report.");
          }
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setLatitude(currentLocation.coords.latitude);
          setLongitude(currentLocation.coords.longitude);
        }
      } catch {
        if (isMounted) {
          Alert.alert("Unable to get location", "Check your location settings, then reopen the report.");
        }
      } finally {
        if (isMounted) {
          setIsLocating(false);
        }
      }
    }

    void loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const capturedPhoto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (capturedPhoto) {
        setPhoto(capturedPhoto);
        setIsCameraOpen(false);
      }
    } catch {
      Alert.alert("Unable to take photo", "Please try opening the camera again.");
    }
  }

  async function executeSubmit(attachedIncidentId?: Id<"incidents">) {
    if (!category || !address.trim() || latitude === null || longitude === null || !photo) {
      Alert.alert(
        "Complete the report",
        "Select an incident type, enter the location, capture GPS coordinates, and add a photo.",
      );
      return;
    }

    const selectedCategory = categories.find((item) => item.value === category);
    setIsSubmitting(true);
    setMessage(null);

    try {
      const uploadUrl = await generateUploadUrl();
      let storageId: Id<"_storage">;

      if (Platform.OS === "web") {
        const photoResponse = await fetch(photo.uri);
        const photoBlob = await photoResponse.blob();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photoBlob.type || "image/jpeg" },
          body: photoBlob,
        });

        if (!uploadResponse.ok) {
          const responseText = await uploadResponse.text();
          throw new Error(responseText || "Unable to upload the report photo");
        }

        const data = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        storageId = data.storageId;
      } else {
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, photo.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": "image/jpeg",
          },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed (${uploadResult.status}): ${uploadResult.body}`);
        }

        const data = JSON.parse(uploadResult.body) as { storageId: Id<"_storage"> };
        storageId = data.storageId;
      }

      await createReport({
        category,
        title: selectedCategory?.label ?? category,
        description: description.trim(),
        ...(severity ? { severity } : {}),
        latitude,
        longitude,
        ...(locationAccuracy ? { locationAccuracy } : {}),
        address: address.trim(),
        imageStorageId: storageId,
        ...(attachedIncidentId ? { incidentId: attachedIncidentId } : {}),
      });

      setPayload({
        category,
        title: selectedCategory?.label ?? category,
        description: description.trim(),
        address: address.trim(),
        ...(severity ? { severity } : {}),
        latitude,
        longitude,
        photo: {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          format: photo.format,
        },
        createdAt: new Date().toISOString(),
      });
      setMessage(
        attachedIncidentId
          ? "Report submitted and linked to corroborate existing incident."
          : "Report submitted for review."
      );
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to submit the report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    Alert.alert(
      "Cancel report?",
      "Are you sure you want to discard this report and return to the home screen?",
      [
        { text: "Keep Editing", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => router.back() },
      ]
    );
  }

  function handleSubmit() {
    if (!category || !address.trim() || latitude === null || longitude === null || !photo) {
      Alert.alert(
        "Complete the report",
        "Select an incident type, enter the location, capture GPS coordinates, and add a photo.",
      );
      return;
    }

    const selectedCategory = categories.find((item) => item.value === category);

    // 1. Same user duplicate check
    if (activeSimilar?.hasUserDuplicate && activeSimilar.userReports.length > 0) {
      const existing = activeSimilar.userReports[0];
      const hasInc = activeSimilar.hasSimilarIncident && activeSimilar.similarIncidents.length > 0;
      const inc = hasInc ? activeSimilar.similarIncidents[0] : null;

      Alert.alert(
        "Duplicate Report Warning",
        `You previously submitted a report for a ${selectedCategory?.label ?? category} nearby (${existing.distanceKm} km away) on ${formatTimeAgo(existing.createdAt)}.${hasInc ? ` Responders are also tracking an active incident ("${inc?.title}").` : ""}\n\nDo you want to cancel or submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          ...(hasInc && inc
            ? [
                {
                  text: "Corroborate Incident",
                  onPress: () => void executeSubmit(inc._id),
                },
              ]
            : []),
          {
            text: "Submit Anyway",
            style: "destructive",
            onPress: () => void executeSubmit(),
          },
        ]
      );
      return;
    }

    // 2. Similar active incident check
    if (activeSimilar?.hasSimilarIncident && activeSimilar.similarIncidents.length > 0) {
      const inc = activeSimilar.similarIncidents[0];
      Alert.alert(
        "Similar Incident Nearby",
        `An active incident ("${inc.title}") is already registered ${inc.distanceKm} km away.\n\nDo you want to cancel or submit this report to corroborate it?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Corroborate Incident",
            onPress: () => void executeSubmit(inc._id),
          },
          {
            text: "Submit as New",
            onPress: () => void executeSubmit(),
          },
        ]
      );
      return;
    }

    // 3. Similar community report check
    if (activeSimilar?.hasSimilarReport && activeSimilar.similarReports.length > 0) {
      const rep = activeSimilar.similarReports[0];
      Alert.alert(
        "Similar Report Found Nearby",
        `Another report for ${selectedCategory?.label ?? category} was recently filed ${rep.distanceKm} km away.\n\nDo you want to cancel or submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit Anyway",
            onPress: () => void executeSubmit(),
          },
        ]
      );
      return;
    }

    void executeSubmit();
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

        <Text style={styles.sectionLabel}>How severe does this seem?</Text>
        <View style={styles.priorityRow}>
          {severities.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => setSeverity(item.value)}
              style={[styles.priority, severity === item.value && styles.prioritySelected]}
            >
              <Text style={[styles.priorityText, severity === item.value && styles.priorityTextSelected]}>
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
        {isLocating && <Text style={styles.metaText}>Getting your current location...</Text>}
        {latitude !== null && longitude !== null && (
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

        {/* Warning when duplicate or similar incident is found */}
        {showWarning && (
          <View
            style={[
              styles.warningCard,
              hasBoth || hasUserDuplicate
                ? styles.warningCardDuplicate
                : hasSimilarIncident
                ? styles.warningCardIncident
                : styles.warningCardReport,
            ]}
          >
            <View style={styles.warningHeader}>
              <View style={styles.warningTitleRow}>
                <Ionicons
                  name={
                    hasBoth || hasUserDuplicate
                      ? "alert-circle"
                      : hasSimilarIncident
                      ? "warning"
                      : "information-circle"
                  }
                  size={22}
                  color={
                    hasBoth || hasUserDuplicate
                      ? theme.colors.destructive
                      : theme.colors.accent
                  }
                />
                <Text style={styles.warningTitle}>
                  {hasBoth
                    ? "You reported this & active incident ongoing"
                    : hasUserDuplicate
                    ? "You already reported this incident"
                    : hasSimilarIncident
                    ? "Similar incident already reported nearby"
                    : "Similar report already present nearby"}
                </Text>
              </View>
              <View
                style={[
                  styles.warningBadge,
                  hasBoth || hasUserDuplicate
                    ? styles.warningBadgeDuplicate
                    : styles.warningBadgeIncident,
                ]}
              >
                <Text
                  style={[
                    styles.warningBadgeText,
                    hasBoth || hasUserDuplicate
                      ? styles.warningBadgeTextDuplicate
                      : styles.warningBadgeTextIncident,
                  ]}
                >
                  {hasBoth
                    ? "Duplicate & Active Incident"
                    : hasUserDuplicate
                    ? "Duplicate"
                    : hasSimilarIncident
                    ? "Existing Incident"
                    : "Community Report"}
                </Text>
              </View>
            </View>

            {/* If user reported before: show their previous report */}
            {hasUserDuplicate && activeSimilar.userReports[0] && (
              <View style={styles.warningBody}>
                <Text style={styles.warningDescription}>
                  You previously submitted a report for a{" "}
                  <Text style={styles.warningHighlight}>
                    {categories.find((c) => c.value === category)?.label ?? category}
                  </Text>{" "}
                  approximately {activeSimilar.userReports[0].distanceKm} km from here (
                  {formatTimeAgo(activeSimilar.userReports[0].createdAt)}).
                </Text>
                <View style={styles.warningDetailBox}>
                  <Text style={styles.warningDetailTitle}>
                    {activeSimilar.userReports[0].title}
                  </Text>
                  {activeSimilar.userReports[0].address && (
                    <Text style={styles.warningDetailSub}>
                      📍 {activeSimilar.userReports[0].address}
                    </Text>
                  )}
                  <Text style={styles.warningDetailStatus}>
                    Status:{" "}
                    <Text style={styles.warningStatusValue}>
                      {activeSimilar.userReports[0].verificationStatus.toUpperCase()}
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {/* If there is an active incident nearby: show incident details */}
            {hasSimilarIncident && activeSimilar.similarIncidents[0] && (
              <View style={styles.warningBody}>
                <Text style={styles.warningDescription}>
                  {hasBoth
                    ? "An official incident is also actively being tracked by responders nearby:"
                    : `Responders are actively tracking an incident matching this type ${activeSimilar.similarIncidents[0].distanceKm} km from your current location:`}
                </Text>
                <View style={styles.warningDetailBox}>
                  <Text style={styles.warningDetailTitle}>
                    {activeSimilar.similarIncidents[0].title}
                  </Text>
                  {activeSimilar.similarIncidents[0].address && (
                    <Text style={styles.warningDetailSub}>
                      📍 {activeSimilar.similarIncidents[0].address}
                    </Text>
                  )}
                  <View style={styles.incidentMetaRow}>
                    <Text style={styles.warningDetailMeta}>
                      Status:{" "}
                      <Text style={styles.warningStatusValue}>
                        {activeSimilar.similarIncidents[0].status.replace("_", " ").toUpperCase()}
                      </Text>
                    </Text>
                    <Text style={styles.warningDetailMeta}>
                      Priority:{" "}
                      <Text style={styles.warningStatusValue}>
                        {activeSimilar.similarIncidents[0].priority.toUpperCase()}
                      </Text>
                    </Text>
                    {activeSimilar.similarIncidents[0].reportCount > 0 && (
                      <Text style={styles.warningDetailMeta}>
                        Reports: {activeSimilar.similarIncidents[0].reportCount}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* If only community report nearby */}
            {!hasUserDuplicate &&
              !hasSimilarIncident &&
              hasSimilarReport &&
              activeSimilar.similarReports[0] && (
                <View style={styles.warningBody}>
                  <Text style={styles.warningDescription}>
                    {activeSimilar.similarReports.length} other report(s) for{" "}
                    <Text style={styles.warningHighlight}>
                      {categories.find((c) => c.value === category)?.label ?? category}
                    </Text>{" "}
                    were recently submitted nearby (closest: {activeSimilar.similarReports[0].distanceKm} km away,{" "}
                    {formatTimeAgo(activeSimilar.similarReports[0].createdAt)}).
                  </Text>
                  <View style={styles.warningDetailBox}>
                    <Text style={styles.warningDetailTitle}>
                      {activeSimilar.similarReports[0].title}
                    </Text>
                    {activeSimilar.similarReports[0].address && (
                      <Text style={styles.warningDetailSub}>
                        📍 {activeSimilar.similarReports[0].address}
                      </Text>
                    )}
                  </View>
                </View>
              )}

            <Text style={styles.warningSubText}>
              {hasBoth
                ? "Emergency response teams already have your report, and responders are active on site. You can cancel, or corroborate with additional details."
                : hasUserDuplicate
                ? "Emergency response teams already have your report. You do not need to report again unless conditions have changed significantly."
                : hasSimilarIncident
                ? "You can cancel if it is the exact same situation, or submit to corroborate with additional photos and details."
                : "You can cancel if this covers what you observed, or submit if you have further information."}
            </Text>

            {/* Inline Action Options */}
            <View style={styles.warningActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleCancel}
                style={styles.warningCancelButton}
              >
                <Ionicons name="close-circle-outline" size={18} color={theme.colors.foreground} />
                <Text style={styles.warningCancelButtonText}>Cancel report</Text>
              </Pressable>

              {hasSimilarIncident && activeSimilar.similarIncidents[0] ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void executeSubmit(activeSimilar.similarIncidents[0]._id)}
                  style={styles.warningSubmitButton}
                >
                  <Text style={styles.warningSubmitButtonText}>
                    {isSubmitting ? "Submitting..." : "Corroborate Incident"}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primaryForeground} />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void executeSubmit()}
                  style={[styles.warningSubmitButton, styles.warningSubmitButtonDuplicate]}
                >
                  <Text style={styles.warningSubmitButtonText}>
                    {isSubmitting ? "Submitting..." : "Submit anyway"}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primaryForeground} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => handleSubmit()}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting report..." : "Submit incident report"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.primaryForeground} />
        </Pressable>

        {message && <Text style={styles.messageText}>{message}</Text>}

        {payload && (
          <View style={styles.payloadBox}>
            <Text style={styles.payloadTitle}>Payload ready</Text>
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
  warningCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    backgroundColor: theme.colors.card,
  },
  warningCardDuplicate: {
    borderColor: theme.colors.destructive,
    backgroundColor: "#fff8f8",
  },
  warningCardIncident: {
    borderColor: theme.colors.accent,
    backgroundColor: "#fffdf5",
  },
  warningCardReport: {
    borderColor: "#3b82f6",
    backgroundColor: "#f8faff",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  warningTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.muted,
  },
  warningBadgeDuplicate: {
    backgroundColor: theme.colors.destructive,
  },
  warningBadgeIncident: {
    backgroundColor: theme.colors.accent,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  warningBadgeTextDuplicate: {
    color: theme.colors.destructiveForeground,
  },
  warningBadgeTextIncident: {
    color: theme.colors.accentForeground,
  },
  warningBody: {
    marginTop: 4,
  },
  warningDescription: {
    color: theme.colors.foreground,
    fontSize: 13,
    lineHeight: 18,
  },
  warningHighlight: {
    fontWeight: "700",
  },
  warningDetailBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.card,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    borderWidth: theme.borderWidth,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  warningDetailTitle: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  warningDetailSub: {
    marginTop: 3,
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  warningDetailStatus: {
    marginTop: 4,
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "600",
  },
  warningDetailMeta: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "600",
  },
  warningStatusValue: {
    color: theme.colors.foreground,
    fontWeight: "800",
  },
  incidentMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
  },
  warningSubText: {
    marginTop: 10,
    color: theme.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  warningActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  warningCancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  warningCancelButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  warningSubmitButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  warningSubmitButtonDuplicate: {
    backgroundColor: theme.colors.foreground,
  },
  warningSubmitButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 13,
    fontWeight: "700",
  },
});
