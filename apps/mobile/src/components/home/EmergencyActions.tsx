import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";

const EMPTY_ARGS = {};
let cachedGlobalIsVolunteer = false;

export default function EmergencyActions() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [isVolunteerModalVisible, setVolunteerModalVisible] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [lockedStatus, setLockedStatus] = useState<"pending" | "approved" | null>(null);
  const [campName, setCampName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profile = useQuery(
    api.public.users.getCurrentUserProfile,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip",
  );
  const lastProfile = useRef<NonNullable<typeof profile> | null>(null);
  if (profile !== undefined && profile !== null) {
    lastProfile.current = profile;
    if (profile.role === "volunteer" || profile.role === "admin") {
      cachedGlobalIsVolunteer = true;
    }
  }
  const displayedProfile = profile ?? lastProfile.current;
  const isVolunteer =
    displayedProfile?.role === "volunteer" ||
    displayedProfile?.role === "admin" ||
    cachedGlobalIsVolunteer;

  const request = useQuery(
    api.public.users.getCurrentVolunteerRoleRequest,
    isLoaded && isSignedIn && isVolunteerModalVisible ? EMPTY_ARGS : "skip",
  );
  const requestVolunteerRole = useMutation(api.public.users.requestVolunteerRole);

  function closeVolunteerModal() {
    setVolunteerModalVisible(false);
    setCode("");
    setErrorMessage(null);
  }

  async function applyToVolunteer() {
    if (code.length !== 6) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await requestVolunteerRole({ code: Number(code) });
      setLockedStatus((current) => (current === "approved" ? current : "pending"));
      setCode("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  const serverRequestStatus = request?.status;
  useEffect(() => {
    if (request?.campName) {
      setCampName((current) => current ?? request.campName);
    }

    if (serverRequestStatus === "approved") {
      setLockedStatus("approved");
    } else if (serverRequestStatus === "pending") {
      setLockedStatus((current) => (current === "approved" ? current : "pending"));
    }
  }, [request?.campName, serverRequestStatus]);

  const requestStatus =
    serverRequestStatus === "approved" || lockedStatus === "approved"
      ? "approved"
      : serverRequestStatus === "pending" || lockedStatus === "pending"
        ? "pending"
        : serverRequestStatus;
  const hasPendingRequest = requestStatus === "pending";
  const hasApprovedRequest = requestStatus === "approved";
  const isRequestLoading = request === undefined && lockedStatus === null;

  return (
    <View style={styles.container}>
      {/* 1. Hero Emergency SOS Banner */}
      <Pressable
        accessibilityLabel="Send SOS"
        accessibilityRole="button"
        onPress={() => router.push("/(app)/sos")}
        style={({ pressed }) => [styles.sosButton, pressed && styles.sosButtonPressed]}
      >
        <View style={styles.sosContentRow}>
          <View style={styles.sosIconCircle}>
            <Ionicons name="radio" size={24} color={theme.colors.destructiveForeground} />
          </View>
          <View style={styles.sosTextCol}>
            <View style={styles.sosBadgeRow}>
              <View style={styles.sosLiveDot} />
              <Text style={styles.sosEyebrow}>CRITICAL DISTRESS BEACON</Text>
            </View>
            <Text style={styles.sosTitle}>Send Emergency SOS</Text>
            <Text style={styles.sosSubtitle}>Broadcast GPS & survivor details to nearest base</Text>
          </View>
          <View style={styles.sosArrowWrap}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.destructiveForeground} />
          </View>
        </View>
      </Pressable>

      {/* 2. Secondary Action Cards Grid */}
      <View style={styles.actionGrid}>
        {/* Card A: Report Hazard */}
        <Pressable
          accessibilityLabel="Report an incident"
          accessibilityRole="button"
          onPress={() => router.push("/report")}
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
        >
          <View style={[styles.cardIconWrap, styles.reportIconWrap]}>
            <Ionicons name="camera" size={20} color="#ea580c" />
          </View>
          <Text style={styles.actionCardTitle}>Report Hazard</Text>
          <Text style={styles.actionCardSub}>Upload photo & GPS coordinates</Text>
          <View style={styles.reportTag}>
            <Text style={styles.reportTagText}>COMMUNITY RADAR</Text>
          </View>
        </Pressable>

        {/* Card B: Volunteer Desk */}
        <Pressable
          accessibilityLabel={isVolunteer ? "Open Volunteer Desk" : "Become a volunteer"}
          accessibilityRole="button"
          onPress={() => {
            if (isVolunteer) {
              router.push("/volunteer");
            } else {
              setVolunteerModalVisible(true);
            }
          }}
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
        >
          <View
            style={[
              styles.cardIconWrap,
              isVolunteer ? styles.volunteerActiveIconWrap : styles.volunteerIconWrap,
            ]}
          >
            <Ionicons
              name={isVolunteer ? "shield-checkmark" : "people"}
              size={20}
              color={isVolunteer ? theme.colors.verified : theme.colors.primary}
            />
          </View>
          <Text style={styles.actionCardTitle}>
            {isVolunteer ? "Volunteer Hub" : "Join Ground Relief"}
          </Text>
          <Text style={styles.actionCardSub}>
            {isVolunteer ? "Active tasks & supply transit" : "Help response coordinators"}
          </Text>
          <View
            style={[
              styles.volunteerTag,
              isVolunteer && styles.volunteerTagActive,
            ]}
          >
            <Text
              style={[
                styles.volunteerTagText,
                isVolunteer && styles.volunteerTagActiveText,
              ]}
            >
              {isVolunteer ? "VERIFIED RESPONDER" : "ENTER CAMP PIN"}
            </Text>
          </View>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeVolunteerModal}
        transparent
        visible={isVolunteerModalVisible}
      >
        <View style={styles.modalOverlay}>
          <Pressable onPress={closeVolunteerModal} style={styles.modalBackdrop} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="people" size={22} color={theme.colors.primaryForeground} />
                </View>
                <Pressable
                  accessibilityLabel="Close modal"
                  hitSlop={12}
                  onPress={closeVolunteerModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={styles.modalTitle}>Volunteer Verification</Text>
              <Text style={styles.modalDescription}>
                Enter the 6-digit relief camp verification code provided by your on-site coordinator.
              </Text>

              {isRequestLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Checking verification status...</Text>
                </View>
              ) : hasPendingRequest ? (
                <View style={styles.successBox}>
                  <Ionicons name="time-outline" size={22} color={theme.colors.accent} />
                  <Text style={styles.successText}>
                    Your application for {campName ?? "your relief camp"} is under review by the base coordinator.
                  </Text>
                </View>
              ) : hasApprovedRequest ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.verified} />
                  <Text style={styles.successText}>
                    You are verified for {campName ?? "your relief camp"}. You now have access to the field dispatch terminal.
                  </Text>
                </View>
              ) : requestStatus === "rejected" ? (
                <View style={styles.rejectedBox}>
                  <Ionicons name="close-circle" size={22} color={theme.colors.destructive} />
                  <Text style={styles.rejectedText}>
                    Your request was not approved. Please speak directly with the relief base director.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>CAMP 6-DIGIT CODE</Text>
                  <TextInput
                    autoFocus
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={theme.colors.input}
                    style={styles.codeInput}
                    value={code}
                  />

                  {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                  <Pressable
                    disabled={code.length !== 6 || isSubmitting}
                    onPress={applyToVolunteer}
                    style={[
                      styles.applyButton,
                      (code.length !== 6 || isSubmitting) && styles.applyButtonDisabled,
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={theme.colors.primaryForeground} />
                    ) : (
                      <Text style={styles.applyButtonText}>Verify & Join Base Force</Text>
                    )}
                  </Pressable>
                </>
              )}
              {hasPendingRequest || hasApprovedRequest || requestStatus === "rejected" ? (
                <Pressable onPress={closeVolunteerModal} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sosButton: {
    backgroundColor: theme.colors.destructive,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: theme.colors.destructive,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  sosButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  sosContentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  sosIconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sosTextCol: {
    flex: 1,
  },
  sosBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  sosLiveDot: {
    backgroundColor: "#ffffff",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  sosEyebrow: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  sosTitle: {
    color: theme.colors.destructiveForeground,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sosSubtitle: {
    color: "rgba(255, 255, 255, 0.86)",
    fontSize: 11,
    marginTop: 2,
  },
  sosArrowWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    padding: 15,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  actionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginBottom: 10,
    width: 38,
  },
  reportIconWrap: {
    backgroundColor: "rgba(234, 88, 12, 0.1)",
  },
  volunteerIconWrap: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  volunteerActiveIconWrap: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  actionCardTitle: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
  actionCardSub: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  reportTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234, 88, 12, 0.08)",
    borderRadius: 6,
    marginTop: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reportTagText: {
    color: "#c2410c",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  volunteerTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 6,
    marginTop: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  volunteerTagText: {
    color: "#1d4ed8",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  volunteerTagActive: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  volunteerTagActiveText: {
    color: "#047857",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalKeyboardAvoiding: {
    width: "100%",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  modalTitle: {
    color: theme.colors.foreground,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  modalDescription: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  inputLabel: {
    marginTop: 22,
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  codeInput: {
    height: 54,
    marginTop: 8,
    paddingHorizontal: 16,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  applyButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  applyButtonDisabled: {
    backgroundColor: theme.colors.muted,
  },
  applyButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 14,
    fontWeight: "800",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    padding: 14,
    borderRadius: theme.radius.card,
    backgroundColor: "#edf8ef",
  },
  loadingBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },
  loadingText: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
  },
  successText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  rejectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    padding: 14,
    borderRadius: theme.radius.card,
    backgroundColor: "#fff0ed",
  },
  rejectedText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.destructive,
    fontSize: 12,
    lineHeight: 17,
  },
  doneButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
  },
  doneButtonText: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
});
