import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";

const STATUS_STEPS = ["dispatched", "accepted", "en_route", "arrived", "completed"] as const;

const priorityColors: Record<string, string> = {
  low: theme.colors.verified,
  medium: theme.colors.accent,
  high: "#c35c35",
  critical: theme.colors.destructive,
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  medical: "medkit",
  rescue: "help-buoy",
  evacuation: "walk",
  food: "fast-food",
  water: "water",
  shelter: "home",
  medicine: "bandage",
  other: "alert-circle",
};

const EMPTY_ARGS = {};
let cachedGlobalCampName: string | null = null;
let cachedGlobalDispatches: any[] | null = null;
let cachedGlobalHubData: any = null;

export default function VolunteerScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const hubData = useQuery(
    api.private.dispatches.getVolunteerHubData,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip",
  );
  const myDispatches = useQuery(
    api.private.dispatches.getMyDispatches,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip",
  );

  const lastHubData = useRef<NonNullable<typeof hubData> | null>(cachedGlobalHubData);
  const lastDispatches = useRef<NonNullable<typeof myDispatches> | null>(cachedGlobalDispatches);
  const lastCampName = useRef<string | null>(cachedGlobalCampName);

  if (hubData !== undefined && hubData !== null) {
    lastHubData.current = hubData;
    cachedGlobalHubData = hubData;
    if (hubData.camp?.name) {
      lastCampName.current = hubData.camp.name;
      cachedGlobalCampName = hubData.camp.name;
    }
  }

  if (myDispatches !== undefined && myDispatches !== null) {
    if (myDispatches.length > 0 || !lastDispatches.current?.length) {
      lastDispatches.current = myDispatches;
      cachedGlobalDispatches = myDispatches;
    }
  }

  const activeHubData = hubData ?? lastHubData.current ?? cachedGlobalHubData;
  const activeDispatchesList =
    myDispatches && (myDispatches.length > 0 || !lastDispatches.current?.length)
      ? myDispatches
      : lastDispatches.current ?? cachedGlobalDispatches ?? myDispatches ?? [];

  const activeDispatch = activeHubData?.activeDispatch;
  const volunteer = activeHubData?.volunteer;
  const camp = activeHubData?.camp;
  const stats = activeHubData?.stats;

  const displayedCampName =
    camp?.name || lastCampName.current || cachedGlobalCampName || "Field Volunteer";

  const lastStatus = useRef<string>("available");
  if (stats?.status) {
    lastStatus.current = stats.status;
  }
  const currentStatus = stats?.status || lastStatus.current;

  const lastStats = useRef({
    totalDispatches: 0,
    completedMissions: 0,
    activeMissions: 0,
  });
  if (stats) {
    lastStats.current = {
      totalDispatches: stats.totalDispatches,
      completedMissions: stats.completedMissions,
      activeMissions: stats.activeMissions,
    };
  }
  const displayedStats = stats || lastStats.current;

  const acceptDispatch = useMutation(api.private.dispatches.acceptDispatch);
  const startDispatch = useMutation(api.private.dispatches.startDispatch);
  const markArrived = useMutation(api.private.dispatches.markArrived);
  const completeDispatch = useMutation(api.private.dispatches.completeDispatch);
  const declineDispatch = useMutation(api.private.dispatches.declineDispatch);
  const updateLocation = useMutation(api.private.volumteerLocations.updateLocation);
  const updateStatus = useMutation(api.private.dispatches.updateVolunteerStatus);

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [isBusy, setIsBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [locationSent, setLocationSent] = useState(false);

  // Auto-report location when en-route
  useEffect(() => {
    const dispatchId = activeDispatch?._id;
    const isEnRoute = activeDispatch?.status === "en_route";
    if (!isEnRoute || !dispatchId) return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    async function sendGps() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !isMounted) return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        await updateLocation({
          dispatchId: dispatchId!,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        });
        if (isMounted) {
          setLocationSent(true);
        }
      } catch (err) {
        console.warn("Could not send volunteer GPS location:", err);
      }
    }

    sendGps();
    intervalId = setInterval(sendGps, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeDispatch?._id, activeDispatch?.status, updateLocation]);

  async function handleAccept(dispatchId: Id<"dispatches">) {
    setIsBusy(true);
    setActionNotice(null);
    try {
      await acceptDispatch({ dispatchId });
      setActionNotice("Mission accepted! Prepare for deployment.");
    } catch (err) {
      Alert.alert("Action Failed", err instanceof Error ? err.message : "Could not accept dispatch");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartRoute(dispatchId: Id<"dispatches">) {
    setIsBusy(true);
    setActionNotice(null);
    try {
      await startDispatch({ dispatchId });
      setActionNotice("Status: En route. Location tracking active.");
      // Transmit first GPS point immediately
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await updateLocation({
            dispatchId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
          });
          setLocationSent(true);
        }
      } catch {}
    } catch (err) {
      Alert.alert("Action Failed", err instanceof Error ? err.message : "Could not start travel");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMarkArrived(dispatchId: Id<"dispatches">) {
    setIsBusy(true);
    setActionNotice(null);
    try {
      await markArrived({ dispatchId });
      setActionNotice("Arrival confirmed. Provide assistance on site.");
    } catch (err) {
      Alert.alert("Action Failed", err instanceof Error ? err.message : "Could not mark arrival");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleComplete(dispatchId: Id<"dispatches">) {
    Alert.alert(
      "Complete Mission",
      "Are you sure the assistance request has been fully resolved on site?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Resolved",
          style: "default",
          onPress: async () => {
            setIsBusy(true);
            setActionNotice(null);
            try {
              await completeDispatch({ dispatchId });
              setActionNotice("Mission accomplished! Request marked resolved.");
            } catch (err) {
              Alert.alert(
                "Action Failed",
                err instanceof Error ? err.message : "Could not complete mission",
              );
            } finally {
              setIsBusy(false);
            }
          },
        },
      ],
    );
  }

  async function handleDecline(dispatchId: Id<"dispatches">) {
    Alert.alert(
      "Decline Assignment",
      "Are you sure you cannot attend to this mission? It will be returned to the camp coordinator.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setIsBusy(true);
            setActionNotice(null);
            try {
              await declineDispatch({ dispatchId, reason: "Volunteer declined from mobile" });
              setActionNotice("Assignment declined.");
            } catch (err) {
              Alert.alert(
                "Action Failed",
                err instanceof Error ? err.message : "Could not decline dispatch",
              );
            } finally {
              setIsBusy(false);
            }
          },
        },
      ],
    );
  }

  async function handleTransmitLocation(dispatchId: Id<"dispatches">) {
    setIsUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow location access to share coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await updateLocation({
        dispatchId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      });
      setLocationSent(true);
      Alert.alert("Location Updated", "Current coordinates successfully reported to coordinator.");
    } catch (err) {
      Alert.alert(
        "Update Failed",
        err instanceof Error ? err.message : "Could not send location update.",
      );
    } finally {
      setIsUpdatingLocation(false);
    }
  }

  function handleOpenMaps(lat: number, lng: number, label?: string) {
    const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label ? encodeURIComponent(label) + "@" : ""}${latLng}`,
      android: `${scheme}${latLng}(${encodeURIComponent(label || "Rescue Location")})`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      });
    } else {
      Linking.openURL(webUrl);
    }
  }

  function handleCall(phone?: string) {
    if (!phone) {
      Alert.alert("No Phone Number", "No phone number is on file for this contact.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  async function handleToggleStatus() {
    const current = currentStatus ?? "available";
    const next = current === "available" ? "offline" : "available";
    try {
      await updateStatus({ status: next });
    } catch (err) {
      Alert.alert("Update Failed", "Could not change status.");
    }
  }

  const currentStatusIndex = activeDispatch
    ? STATUS_STEPS.indexOf(activeDispatch.status as (typeof STATUS_STEPS)[number])
    : -1;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.foreground} />
          </Pressable>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.campBadgeText}>{displayedCampName}</Text>
            </View>
            <Text style={styles.headerTitle}>Volunteer Desk</Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Toggle duty status"
          onPress={handleToggleStatus}
          style={[
            styles.statusPill,
            currentStatus === "on_duty"
              ? styles.statusPillOnDuty
              : currentStatus === "offline"
                ? styles.statusPillOffline
                : styles.statusPillAvailable,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              currentStatus === "on_duty"
                ? styles.statusDotOnDuty
                : currentStatus === "offline"
                  ? styles.statusDotOffline
                  : styles.statusDotAvailable,
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              currentStatus === "on_duty"
                ? styles.statusPillTextOnDuty
                : currentStatus === "offline"
                  ? styles.statusPillTextOffline
                  : styles.statusPillTextAvailable,
            ]}
          >
            {currentStatus === "on_duty"
              ? "ON DUTY"
              : currentStatus === "offline"
                ? "OFFLINE"
                : "AVAILABLE"}
          </Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab("active")}
          style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]}
        >
          <View style={styles.tabRow}>
            <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
              Active Mission
            </Text>
            {activeDispatch ? <View style={styles.tabNoticeDot} /> : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("history")}
          style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
            Mission History ({activeDispatchesList.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {actionNotice ? (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.noticeText}>{actionNotice}</Text>
          </View>
        ) : null}

        {/* Stats Strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{displayedStats.activeMissions}</Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{displayedStats.completedMissions}</Text>
            <Text style={styles.statLabel}>RESOLVED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{displayedStats.totalDispatches}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
        </View>

        {activeTab === "active" ? (
          hubData === undefined && !lastHubData.current ? (
            <View style={styles.centeredLoading}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading volunteer assignments...</Text>
            </View>
          ) : activeDispatch ? (
            <View style={styles.missionContainer}>
              {/* Mission Card */}
              <View style={styles.missionCard}>
                {/* Mission Header */}
                <View style={styles.missionCardHeader}>
                  <View style={styles.categoryBadge}>
                    <Ionicons
                      name={
                        activeDispatch.request?.requestType === "sos"
                          ? "alert-circle"
                          : categoryIcons[activeDispatch.request?.category ?? "other"] ?? "alert-circle"
                      }
                      size={16}
                      color={theme.colors.card}
                    />
                    <Text style={styles.categoryBadgeText}>
                      {activeDispatch.request?.requestType === "sos"
                        ? "EMERGENCY SOS"
                        : (activeDispatch.request?.category ?? "assistance").toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.priorityTag,
                      {
                        borderColor:
                          priorityColors[activeDispatch.request?.priority ?? "medium"] ??
                          theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityTagText,
                        {
                          color:
                            priorityColors[activeDispatch.request?.priority ?? "medium"] ??
                            theme.colors.foreground,
                        },
                      ]}
                    >
                      {(activeDispatch.request?.priority ?? "NORMAL").toUpperCase()}
                    </Text>
                  </View>
                </View>

                {activeDispatch.request?.requestType === "sos" ? (
                  <View style={[styles.assignedAlertBanner, { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "#ef4444" }]}>
                    <View style={[styles.assignedAlertDot, { backgroundColor: "#ef4444" }]} />
                    <Text style={[styles.assignedAlertText, { color: "#ef4444" }]}>
                      🚨 EMERGENCY SOS DISTRESS · RAPID RESPONSE REQUIRED
                    </Text>
                  </View>
                ) : activeDispatch.status === "dispatched" ? (
                  <View style={styles.assignedAlertBanner}>
                    <View style={styles.assignedAlertDot} />
                    <Text style={styles.assignedAlertText}>
                      NEW TASK ASSIGNED · Awaiting Response
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.missionTitle}>
                  {activeDispatch.request?.requestType === "sos"
                    ? `🚨 EMERGENCY SOS RESCUE${activeDispatch.sosEvent?.situation ? `: ${activeDispatch.sosEvent.situation.toUpperCase()}` : ""}`
                    : activeDispatch.incident?.title ??
                      `${(activeDispatch.request?.category ?? "Assistance").toUpperCase()} ASSIGNMENT`}
                </Text>

                <Text style={styles.missionDescription}>
                  {activeDispatch.request?.description || "Immediate field support requested."}
                </Text>

                {activeDispatch.request?.peopleCount ? (
                  <View style={styles.peopleChip}>
                    <Ionicons name="people" size={14} color={theme.colors.mutedForeground} />
                    <Text style={styles.peopleChipText}>
                      {activeDispatch.request.peopleCount} people requiring aid
                    </Text>
                  </View>
                ) : null}

                {/* Coordinator Special Instructions */}
                {activeDispatch.instructions ? (
                  <View style={styles.instructionsBox}>
                    <View style={styles.instructionsHeader}>
                      <Ionicons name="chatbox-ellipses" size={15} color={theme.colors.accent} />
                      <Text style={styles.instructionsTitle}>COORDINATOR INSTRUCTIONS</Text>
                    </View>
                    <Text style={styles.instructionsBody}>{activeDispatch.instructions}</Text>
                  </View>
                ) : null}

                {/* Location Box */}
                <View style={styles.locationBox}>
                  <View style={styles.locationLeft}>
                    <Ionicons name="location" size={20} color={theme.colors.destructive} />
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.locationLabel}>TARGET LOCATION</Text>
                      <Text style={styles.locationAddress}>
                        {activeDispatch.request?.address ||
                          `${activeDispatch.request?.latitude.toFixed(4)}, ${activeDispatch.request?.longitude.toFixed(4)}`}
                      </Text>
                    </View>
                  </View>

                  {activeDispatch.request?.latitude && activeDispatch.request?.longitude ? (
                    <Pressable
                      accessibilityLabel="Open maps directions"
                      onPress={() =>
                        handleOpenMaps(
                          activeDispatch.request!.latitude,
                          activeDispatch.request!.longitude,
                          activeDispatch.request?.address,
                        )
                      }
                      style={styles.mapButton}
                    >
                      <Ionicons name="navigate" size={16} color={theme.colors.card} />
                      <Text style={styles.mapButtonText}>Maps</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Coordinator Contact */}
                {activeDispatch.coordinator ? (
                  <View style={styles.coordinatorRow}>
                    <View style={styles.coordinatorInfo}>
                      <Text style={styles.coordinatorLabel}>DISPATCHED BY</Text>
                      <Text style={styles.coordinatorName}>
                        {activeDispatch.coordinator.name || "Camp Coordinator"}
                      </Text>
                    </View>
                    {activeDispatch.coordinator.phone ? (
                      <Pressable
                        onPress={() => handleCall(activeDispatch.coordinator?.phone)}
                        style={styles.callButton}
                      >
                        <Ionicons name="call" size={15} color={theme.colors.card} />
                        <Text style={styles.callButtonText}>Call</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {/* Lifecycle Progress Stepper */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperHeaderLabel}>MISSION LIFECYCLE</Text>
                  <View style={styles.stepperRow}>
                    {STATUS_STEPS.map((stepKey, idx) => {
                      const isComplete = currentStatusIndex >= idx;
                      const isCurrent = currentStatusIndex === idx;

                      const labels: Record<string, string> = {
                        dispatched: "Assigned",
                        accepted: "Accepted",
                        en_route: "En Route",
                        arrived: "On Site",
                        completed: "Resolved",
                      };

                      return (
                        <React.Fragment key={stepKey}>
                          <View style={styles.stepItem}>
                            <View
                              style={[
                                styles.stepCircle,
                                isComplete && styles.stepCircleComplete,
                                isCurrent && styles.stepCircleCurrent,
                              ]}
                            >
                              {isComplete && !isCurrent ? (
                                <Ionicons name="checkmark" size={12} color={theme.colors.card} />
                              ) : (
                                <Text
                                  style={[
                                    styles.stepNumber,
                                    (isComplete || isCurrent) && styles.stepNumberActive,
                                  ]}
                                >
                                  {idx + 1}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.stepLabel,
                                isCurrent && styles.stepLabelCurrent,
                                isComplete && styles.stepLabelComplete,
                              ]}
                            >
                              {labels[stepKey]}
                            </Text>
                          </View>
                          {idx < STATUS_STEPS.length - 1 && (
                            <View
                              style={[
                                styles.stepConnector,
                                currentStatusIndex > idx && styles.stepConnectorComplete,
                              ]}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>

                {/* Action Control Button Area */}
                <View style={styles.actionArea}>
                  {activeDispatch.status === "dispatched" && (
                    <View style={styles.dualActionRow}>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleDecline(activeDispatch._id)}
                        style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
                      >
                        <Text style={styles.secondaryButtonText}>Decline</Text>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleAccept(activeDispatch._id)}
                        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                      >
                        {isBusy ? (
                          <ActivityIndicator color={theme.colors.card} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color={theme.colors.card} />
                            <Text style={styles.primaryButtonText}>Accept Mission</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {activeDispatch.status === "accepted" && (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => handleStartRoute(activeDispatch._id)}
                      style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={theme.colors.card} />
                      ) : (
                        <>
                          <Ionicons name="car" size={18} color={theme.colors.card} />
                          <Text style={styles.primaryButtonText}>Start Journey (En Route)</Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  {activeDispatch.status === "en_route" && (
                    <View style={styles.enRouteActions}>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleMarkArrived(activeDispatch._id)}
                        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                      >
                        {isBusy ? (
                          <ActivityIndicator color={theme.colors.card} />
                        ) : (
                          <>
                            <Ionicons name="pin" size={18} color={theme.colors.card} />
                            <Text style={styles.primaryButtonText}>Mark Arrived at Site</Text>
                          </>
                        )}
                      </Pressable>

                      <Pressable
                        disabled={isUpdatingLocation}
                        onPress={() => handleTransmitLocation(activeDispatch._id)}
                        style={styles.gpsSyncButton}
                      >
                        {isUpdatingLocation ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <>
                            <Ionicons
                              name={locationSent ? "checkmark-circle" : "locate"}
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.gpsSyncText}>
                              {locationSent ? "Live GPS Active · Update Now" : "Send GPS Location"}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {activeDispatch.status === "arrived" && (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => handleComplete(activeDispatch._id)}
                      style={[styles.completeButton, isBusy && styles.buttonDisabled]}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={theme.colors.card} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={20} color={theme.colors.card} />
                          <Text style={styles.completeButtonText}>Complete Mission & Resolve</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                {/* Updates History */}
                {activeDispatch.updates && activeDispatch.updates.length > 0 ? (
                  <View style={styles.updatesTimeline}>
                    <Text style={styles.updatesHeader}>STATUS AUDIT LOG</Text>
                    {activeDispatch.updates.slice(0, 4).map((upd: any, idx: number) => (
                      <View key={upd._id ?? idx} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineNote}>{upd.note}</Text>
                          <Text style={styles.timelineTime}>
                            {new Date(upd.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            /* Standby State */
            <View style={styles.standbyCard}>
              <View style={styles.standbyIconBox}>
                <Ionicons name="shield-checkmark" size={36} color={theme.colors.verified} />
              </View>
              <Text style={styles.standbyTitle}>Ready for Deployment</Text>
              <Text style={styles.standbySubtitle}>
                You have no pending dispatches. Stay prepared; when new requests are assigned by your
                relief camp coordinator, they will notify you instantly.
              </Text>

              <View style={styles.campInfoBox}>
                <View style={styles.campInfoRow}>
                  <Text style={styles.campInfoLabel}>CAMP BASE</Text>
                  <Text style={styles.campInfoValue}>{displayedCampName}</Text>
                </View>
                {camp?.uniqueCode ? (
                  <View style={styles.campInfoRow}>
                    <Text style={styles.campInfoLabel}>CAMP CODE</Text>
                    <Text style={styles.campInfoCode}>{camp.uniqueCode}</Text>
                  </View>
                ) : null}
                {camp?.address ? (
                  <View style={styles.campInfoRow}>
                    <Text style={styles.campInfoLabel}>LOCATION</Text>
                    <Text style={styles.campInfoValue}>{camp.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )
        ) : (
          /* Mission History Tab */
          <View style={styles.historyContainer}>
            {activeDispatch && (
              <Pressable
                accessibilityLabel="View active mission"
                accessibilityRole="button"
                onPress={() => setActiveTab("active")}
                style={styles.historyActiveBanner}
              >
                <View style={styles.historyActiveBannerLeft}>
                  <View style={styles.historyActiveDot} />
                  <View style={styles.historyActiveBannerTextContainer}>
                    <Text style={styles.historyActiveBannerTitle}>
                      {activeDispatch.status === "dispatched"
                        ? "Task Assigned · Action Required"
                        : `Active Mission: ${activeDispatch.status.replace("_", " ").toUpperCase()}`}
                    </Text>
                    <Text style={styles.historyActiveBannerSub} numberOfLines={1}>
                      {activeDispatch.request?.description || "Immediate field response"}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyActiveBannerCta}>
                  <Text style={styles.historyActiveBannerCtaText}>View</Text>
                  <Ionicons name="arrow-forward" size={13} color={theme.colors.card} />
                </View>
              </Pressable>
            )}

            {myDispatches === undefined && !lastDispatches.current && !cachedGlobalDispatches ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : activeDispatchesList.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Ionicons name="time-outline" size={32} color={theme.colors.mutedForeground} />
                <Text style={styles.emptyHistoryTitle}>No past missions yet</Text>
                <Text style={styles.emptyHistorySubtitle}>
                  Completed or dispatched tasks assigned to you will be archived here.
                </Text>
              </View>
            ) : (
              activeDispatchesList.map((disp) => (
                <View key={disp._id} style={styles.historyItemCard}>
                  <View style={styles.historyTopRow}>
                    <View style={styles.historyCategoryChip}>
                      <Ionicons
                        name={categoryIcons[disp.request?.category ?? "other"] ?? "alert-circle"}
                        size={14}
                        color={theme.colors.foreground}
                      />
                      <Text style={styles.historyCategoryText}>
                        {(disp.request?.category ?? "request").toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.historyStatusChip,
                        disp.status === "completed"
                          ? styles.historyStatusComplete
                          : disp.status === "cancelled"
                            ? styles.historyStatusCancelled
                            : styles.historyStatusActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          disp.status === "completed" && styles.historyStatusTextComplete,
                        ]}
                      >
                        {disp.status.replace("_", " ").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyDescription} numberOfLines={2}>
                    {disp.request?.description || "Field response mission"}
                  </Text>

                  <View style={styles.historyMetaRow}>
                    <Text style={styles.historyDate}>
                      {new Date(disp.dispatchedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {disp.request?.address ? (
                      <Text style={styles.historyAddress} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} /> {disp.request.address}
                      </Text>
                    ) : null}
                  </View>

                  {disp.status !== "completed" && disp.status !== "cancelled" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setActiveTab("active")}
                      style={styles.historyActiveCta}
                    >
                      <Text style={styles.historyActiveCtaText}>
                        {disp.status === "dispatched"
                          ? "Action Required · Review & Accept Task →"
                          : "Mission in Progress · View Live Status →"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: theme.borderWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  livePulseDot: {
    backgroundColor: theme.colors.verified,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  campBadgeText: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: theme.colors.foreground,
    fontSize: 19,
    fontWeight: "800",
  },
  statusPill: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillAvailable: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: theme.colors.verified,
  },
  statusPillOnDuty: {
    backgroundColor: "rgba(79, 70, 229, 0.12)",
    borderColor: theme.colors.primary,
  },
  statusPillOffline: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusDotAvailable: {
    backgroundColor: theme.colors.verified,
  },
  statusDotOnDuty: {
    backgroundColor: theme.colors.primary,
  },
  statusDotOffline: {
    backgroundColor: theme.colors.mutedForeground,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusPillTextAvailable: {
    color: theme.colors.verified,
  },
  statusPillTextOnDuty: {
    color: theme.colors.primary,
  },
  statusPillTextOffline: {
    color: theme.colors.mutedForeground,
  },
  tabContainer: {
    backgroundColor: theme.colors.card,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: theme.borderWidth,
    flexDirection: "row",
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 13,
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.foreground,
    borderBottomWidth: 2,
  },
  tabRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  tabText: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: theme.colors.foreground,
    fontWeight: "800",
  },
  tabNoticeDot: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noticeBox: {
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  noticeText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    marginBottom: 16,
    paddingVertical: 12,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    backgroundColor: theme.colors.border,
    height: "60%",
    marginVertical: "auto",
    width: 1,
  },
  missionContainer: {
    gap: 16,
  },
  missionCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    padding: 18,
  },
  missionCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.foreground,
    borderRadius: theme.radius.control,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryBadgeText: {
    color: theme.colors.card,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  priorityTag: {
    borderRadius: theme.radius.control,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityTagText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  missionTitle: {
    color: theme.colors.foreground,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  missionDescription: {
    color: theme.colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  peopleChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  peopleChipText: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  instructionsBox: {
    backgroundColor: "#fffbeb",
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    marginBottom: 14,
    padding: 12,
  },
  instructionsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  instructionsTitle: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  instructionsBody: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  locationBox: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    padding: 12,
  },
  locationLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    marginRight: 8,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  locationAddress: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: theme.colors.foreground,
    borderRadius: theme.radius.control,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapButtonText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: "700",
  },
  coordinatorRow: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderTopWidth: theme.borderWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 12,
  },
  coordinatorInfo: {
    flex: 1,
  },
  coordinatorLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  coordinatorName: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  callButton: {
    alignItems: "center",
    backgroundColor: theme.colors.verified,
    borderRadius: theme.radius.control,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  callButtonText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: "700",
  },
  stepperContainer: {
    borderColor: theme.colors.border,
    borderTopWidth: theme.borderWidth,
    paddingTop: 16,
  },
  stepperHeaderLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  stepCircleComplete: {
    backgroundColor: theme.colors.verified,
    borderColor: theme.colors.verified,
  },
  stepCircleCurrent: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepNumber: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
  },
  stepNumberActive: {
    color: theme.colors.card,
  },
  stepLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "600",
  },
  stepLabelCurrent: {
    color: theme.colors.foreground,
    fontWeight: "800",
  },
  stepLabelComplete: {
    color: theme.colors.verified,
    fontWeight: "700",
  },
  stepConnector: {
    backgroundColor: theme.colors.border,
    flex: 1,
    height: 2,
    marginBottom: 16,
  },
  stepConnectorComplete: {
    backgroundColor: theme.colors.verified,
  },
  actionArea: {
    gap: 10,
  },
  dualActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flex: 2,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.destructive,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flex: 1,
    height: 52,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: theme.colors.destructive,
    fontSize: 14,
    fontWeight: "800",
  },
  enRouteActions: {
    gap: 10,
  },
  gpsSyncButton: {
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 6,
    height: 44,
    justifyContent: "center",
  },
  gpsSyncText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.verified,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 8,
    height: 54,
    justifyContent: "center",
  },
  completeButtonText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  updatesTimeline: {
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.borderWidth,
    marginTop: 18,
    paddingTop: 14,
  },
  updatesHeader: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  timelineDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
    height: 6,
    marginTop: 6,
    width: 6,
  },
  timelineContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineNote: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  timelineTime: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    marginLeft: 8,
  },
  standbyCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    padding: 24,
  },
  standbyIconBox: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 16,
    width: 64,
  },
  standbyTitle: {
    color: theme.colors.foreground,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  standbySubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  campInfoBox: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    marginTop: 20,
    padding: 14,
    width: "100%",
  },
  campInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  campInfoLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  campInfoValue: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  campInfoCode: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  historyContainer: {
    gap: 10,
  },
  emptyHistoryCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    padding: 32,
  },
  emptyHistoryTitle: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  emptyHistorySubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  historyItemCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    padding: 14,
  },
  historyTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyCategoryChip: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyCategoryText: {
    color: theme.colors.foreground,
    fontSize: 11,
    fontWeight: "700",
  },
  historyStatusChip: {
    borderRadius: theme.radius.control,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyStatusComplete: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  historyStatusCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  historyStatusActive: {
    backgroundColor: "rgba(79, 70, 229, 0.12)",
  },
  historyStatusText: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
  },
  historyStatusTextComplete: {
    color: theme.colors.verified,
  },
  historyDescription: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  historyMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyDate: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
  historyAddress: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    maxWidth: "60%",
  },
  historyActiveCta: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.control,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  historyActiveCtaText: {
    color: theme.colors.primaryForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  historyActiveBanner: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    padding: 12,
  },
  historyActiveBannerLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    marginRight: 8,
  },
  historyActiveDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  historyActiveBannerTextContainer: {
    flex: 1,
  },
  historyActiveBannerTitle: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  historyActiveBannerSub: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    marginTop: 2,
  },
  historyActiveBannerCta: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  historyActiveBannerCtaText: {
    color: theme.colors.primaryForeground,
    fontSize: 11,
    fontWeight: "700",
  },
  assignedAlertBanner: {
    alignItems: "center",
    backgroundColor: "rgba(234, 88, 12, 0.12)",
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignedAlertDot: {
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  assignedAlertText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  centeredLoading: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    marginTop: 10,
  },
  bottomSpace: {
    height: 30,
  },
});
