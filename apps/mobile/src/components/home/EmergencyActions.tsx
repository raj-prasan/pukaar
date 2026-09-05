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
    <>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Report an incident"
          accessibilityRole="button"
          onPress={() => router.push("/report")}
          style={[styles.actionButton, styles.reportButton]}
        >
          <Ionicons name="document-text-outline" size={21} color={theme.colors.accentForeground} />
          <Text style={styles.reportTitle}>Report incident</Text>
        </Pressable>
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
          style={[styles.actionButton, styles.volunteerButton]}
        >
          <Ionicons
            name={isVolunteer ? "shield-checkmark" : "people-outline"}
            size={21}
            color={theme.colors.primaryForeground}
          />
          <Text style={styles.volunteerTitle}>
            {isVolunteer ? "Volunteer Desk" : "Become a volunteer"}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel="Send SOS"
        accessibilityRole="button"
        onPress={() => router.push("/(app)/sos")}
        style={styles.sosButton}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={20} color={theme.colors.destructiveForeground} />
        </View>
        <View>
          <Text style={styles.title}>Send SOS</Text>
          <Text style={styles.subtitle}>Immediate danger - get help now</Text>
        </View>
      </Pressable>
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
                  accessibilityLabel="Close volunteer application"
                  accessibilityRole="button"
                  onPress={closeVolunteerModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
                </Pressable>
              </View>
              <Text style={styles.modalTitle}>Become a volunteer</Text>
              <Text style={styles.modalDescription}>
                Enter the six-digit code shared by the relief camp coordinator.
              </Text>
              {isRequestLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Checking your application status...</Text>
                </View>
              ) : hasPendingRequest ? (
                <View style={styles.successBox}>
                  <Ionicons name="time-outline" size={22} color={theme.colors.accent} />
                  <Text style={styles.successText}>
                    Your application for {campName ?? "the selected camp"} is awaiting
                    coordinator verification.
                  </Text>
                </View>
              ) : hasApprovedRequest ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.verified} />
                  <Text style={styles.successText}>
                    You are approved as a volunteer for {campName ?? "the selected camp"}.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeVolunteerModal();
                      router.push("/volunteer");
                    }}
                    style={[styles.applyButton, { marginTop: 14 }]}
                  >
                    <Text style={styles.applyButtonText}>Open Volunteer Desk</Text>
                  </Pressable>
                </View>
              ) : requestStatus === "rejected" ? (
                <View style={styles.rejectedBox}>
                  <Ionicons name="close-circle" size={22} color={theme.colors.destructive} />
                  <Text style={styles.rejectedText}>
                    Your previous application was not approved. You can apply again with a new code.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Coordinator code</Text>
                  <TextInput
                    accessibilityLabel="Coordinator code"
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => {
                      setCode(value.replace(/[^0-9]/g, ""));
                      setErrorMessage(null);
                    }}
                    placeholder="000000"
                    placeholderTextColor={theme.colors.input}
                    style={styles.codeInput}
                    value={code}
                  />
                  {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: code.length !== 6 || isSubmitting }}
                    disabled={code.length !== 6 || isSubmitting}
                    onPress={applyToVolunteer}
                    style={[
                      styles.applyButton,
                      (code.length !== 6 || isSubmitting) && styles.applyButtonDisabled,
                    ]}
                  >
                    <Text style={styles.applyButtonText}>
                      {isSubmitting ? "Applying..." : "Apply to volunteer"}
                    </Text>
                  </Pressable>
                </>
              )}
              {(hasPendingRequest || hasApprovedRequest || requestStatus === "rejected") ? (
                <Pressable onPress={closeVolunteerModal} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  actionButton: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
  },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.destructive,
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  title: {
    color: theme.colors.destructiveForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
  },
  reportButton: {
    backgroundColor: theme.colors.accent,
  },
  reportTitle: {
    color: theme.colors.accentForeground,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  volunteerButton: {
    backgroundColor: theme.colors.primary,
  },
  volunteerTitle: {
    color: theme.colors.primaryForeground,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
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
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  modalCard: {
    padding: 22,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: theme.colors.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    marginTop: 18,
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "800",
  },
  modalDescription: {
    marginTop: 6,
    color: theme.colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
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
