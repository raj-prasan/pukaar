import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";

type SOSSituation = "trapped" | "injured" | "evacuation" | "medicine" | "danger" | "other";

const situationConfig: Record<
  SOSSituation,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  trapped: { label: "Trapped", icon: "lock-closed-outline", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  injured: { label: "Injured", icon: "medkit-outline", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  evacuation: { label: "Evacuation Needed", icon: "exit-outline", color: "#f97316", bg: "rgba(249, 115, 22, 0.12)" },
  medicine: { label: "Urgent Medicine", icon: "bandage-outline", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  danger: { label: "Immediate Danger", icon: "warning-outline", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  other: { label: "Emergency Assist", icon: "help-circle-outline", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
};

const reportCategoryConfig: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  flood: { label: "Flood", icon: "water-outline", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  fire: { label: "Fire", icon: "flame-outline", color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
  landslide: { label: "Landslide", icon: "alert-circle-outline", color: "#b45309", bg: "rgba(180, 83, 9, 0.12)" },
  earthquake: { label: "Earthquake", icon: "pulse-outline", color: "#b91c1c", bg: "rgba(185, 28, 28, 0.12)" },
  medical: { label: "Medical", icon: "medkit-outline", color: "#db2777", bg: "rgba(219, 39, 119, 0.12)" },
  road_blocked: { label: "Road Blocked", icon: "close-circle-outline", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" },
  building_damage: { label: "Building Damage", icon: "business-outline", color: "#475569", bg: "rgba(71, 85, 105, 0.12)" },
  missing_person: { label: "Missing Person", icon: "person-outline", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
  other: { label: "Other Hazard", icon: "warning-outline", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
};

const EMPTY_ARGS = {};

// Global module-level cache: prevents any flickering or flashing between renders/revalidation
let cachedGlobalActiveRequest: any = null;
let cachedGlobalMyReports: any[] | null = null;

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThirdScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [selectedTab, setSelectedTab] = useState<"sos" | "reports">("sos");
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "verified">("all");
  const [refreshing, setRefreshing] = useState(false);

  const activeRequestData = useQuery(
    api.public.assistanceRequest.getMyActiveRequest,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip"
  );

  const myReports = useQuery(
    api.public.reports.getMyReports,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip"
  );

  // Persistent reference cache to eliminate flickering during background Convex syncs
  const lastRequestData = useRef<NonNullable<typeof activeRequestData> | null>(
    cachedGlobalActiveRequest
  );
  const lastReportsData = useRef<NonNullable<typeof myReports> | null>(
    cachedGlobalMyReports
  );

  if (activeRequestData !== undefined && activeRequestData !== null) {
    lastRequestData.current = activeRequestData;
    cachedGlobalActiveRequest = activeRequestData;
  }

  if (myReports !== undefined && myReports !== null) {
    lastReportsData.current = myReports;
    cachedGlobalMyReports = myReports;
  }

  const live = activeRequestData ?? lastRequestData.current ?? cachedGlobalActiveRequest;
  const reportsList = myReports ?? lastReportsData.current ?? cachedGlobalMyReports ?? [];

  const isSosInitialLoading =
    !isLoaded || (isSignedIn && activeRequestData === undefined && !cachedGlobalActiveRequest);
  const isReportsInitialLoading =
    !isLoaded ||
    (isSignedIn &&
      myReports === undefined &&
      !lastReportsData.current &&
      !cachedGlobalMyReports);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const hasActiveSOS = live?.isActive === true;
  const sosRequest = live?.request;
  const isSOS = sosRequest?.requestType === "sos";
  const sosEvent = live?.sosEvent;
  const dispatch = live?.dispatch;
  const volunteer = live?.volunteer;
  const updates = live?.updates ?? [];
  const camp = live?.camp;

  // Real Situation info
  const situationKey: SOSSituation = (sosEvent?.situation ?? "other") as SOSSituation;
  const currentSituation = situationConfig[situationKey] ?? situationConfig.other;

  // Real Calculated Distance & ETA
  let distanceText = "Assigning...";
  let etaText = "Pending";
  if (volunteer) {
    if (
      sosRequest?.latitude &&
      sosRequest?.longitude &&
      live?.volunteerLocation?.latitude &&
      live?.volunteerLocation?.longitude
    ) {
      const km = calculateDistanceKm(
        sosRequest.latitude,
        sosRequest.longitude,
        live.volunteerLocation.latitude,
        live.volunteerLocation.longitude
      );
      distanceText = `${km.toFixed(1)} km`;
      etaText = `~${Math.max(2, Math.round(km * 3))} min`;
    } else {
      distanceText = "En route";
      etaText = "~10-15 min";
    }
  }

  // Real Response Progress Steps based on actual status
  const currentStatus = sosRequest?.status ?? "submitted";
  const dispatchStatus = dispatch?.status;

  const progressStages = useMemo(() => {
    const isSubmitted = Boolean(sosRequest);
    const isUnderReview =
      currentStatus === "under_review" ||
      currentStatus === "assigned" ||
      currentStatus === "accepted" ||
      currentStatus === "in_progress" ||
      currentStatus === "arrived" ||
      currentStatus === "resolved";

    const isDispatched =
      currentStatus === "assigned" ||
      currentStatus === "accepted" ||
      currentStatus === "in_progress" ||
      currentStatus === "arrived" ||
      currentStatus === "resolved" ||
      dispatchStatus === "dispatched" ||
      dispatchStatus === "accepted" ||
      dispatchStatus === "en_route" ||
      dispatchStatus === "arrived" ||
      dispatchStatus === "completed";

    const isEnRoute =
      currentStatus === "in_progress" ||
      currentStatus === "arrived" ||
      currentStatus === "resolved" ||
      dispatchStatus === "en_route" ||
      dispatchStatus === "arrived" ||
      dispatchStatus === "completed";

    const isResolved = currentStatus === "resolved" || dispatchStatus === "completed";
    const isArrived = currentStatus === "arrived" || dispatchStatus === "arrived" || isResolved;

    return [
      {
        id: "stage_submitted",
        title: "SOS Transmitted",
        subtitle: "Emergency broadcast received by network",
        complete: isSubmitted && currentStatus !== "submitted",
        active: currentStatus === "submitted",
      },
      {
        id: "stage_review",
        title: "Coordinator Review",
        subtitle: camp?.name ? `Verified by ${camp.name}` : "Assessing priority and required resources",
        complete: isUnderReview && currentStatus !== "under_review",
        active: currentStatus === "under_review",
      },
      {
        id: "stage_dispatched",
        title: "Response Unit Assigned",
        subtitle: volunteer?.name
          ? `Dispatched to responder: ${volunteer.name}`
          : "Assigning closest equipped relief team",
        complete: isDispatched && currentStatus !== "assigned",
        active: currentStatus === "assigned",
      },
      {
        id: "stage_enroute",
        title: "Responders En Route",
        subtitle: volunteer
          ? `${volunteer.name} is moving towards your location`
          : "Rescue personnel en route to site",
        complete: isArrived,
        active: (currentStatus === "in_progress" || dispatchStatus === "en_route") && !isArrived,
      },
      {
        id: "stage_arrived",
        title: isResolved ? "Emergency Resolved" : "On-Site Assistance",
        subtitle: isResolved
          ? "Assistance successfully delivered and completed"
          : "Relief team arriving at your location",
        complete: isResolved,
        active: isArrived && !isResolved,
      },
    ];
  }, [sosRequest, currentStatus, dispatchStatus, volunteer, camp]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (!reportsList) return [];
    if (reportFilter === "pending") {
      return reportsList.filter((r) => r.verificationStatus === "pending");
    }
    if (reportFilter === "verified") {
      return reportsList.filter((r) => r.verificationStatus === "verified");
    }
    return reportsList;
  }, [reportsList, reportFilter]);

  const pendingReportsCount = useMemo(
    () => reportsList.filter((r) => r.verificationStatus === "pending").length,
    [reportsList]
  );
  const verifiedReportsCount = useMemo(
    () => reportsList.filter((r) => r.verificationStatus === "verified").length,
    [reportsList]
  );

  function handleContactResponder() {
    if (volunteer?.phone) {
      void Linking.openURL(`tel:${volunteer.phone}`);
    } else if (camp?.contactPhone) {
      void Linking.openURL(`tel:${camp.contactPhone}`);
    } else {
      Alert.alert(
        "Emergency Network Connected",
        "Your emergency alert has been received. Camp coordinators and field teams are actively coordinating response. Keep your phone nearby."
      );
    }
  }

  function handleCallEmergencyHelpline() {
    void Linking.openURL("tel:112");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CITIZEN RESPONSE TRACKER</Text>
            <Text style={styles.heading}>Status</Text>
          </View>

          {hasActiveSOS ? (
            <View style={styles.liveSosBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveSosText}>SOS ACTIVE</Text>
            </View>
          ) : (
            <View style={styles.standbyBadge}>
              <Ionicons name="shield-checkmark" size={13} color={theme.colors.verified} />
              <Text style={styles.standbyText}>STANDBY</Text>
            </View>
          )}
        </View>

        {/* Dual Mode Switcher */}
        <View style={styles.segmentContainer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedTab("sos")}
            style={[styles.segmentButton, selectedTab === "sos" && styles.segmentButtonActive]}
          >
            <View style={styles.segmentContent}>
              <Ionicons
                name="radio-outline"
                size={16}
                color={selectedTab === "sos" ? theme.colors.destructive : theme.colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentText,
                  selectedTab === "sos" && styles.segmentTextActive,
                ]}
              >
                SOS Emergency
              </Text>
              {hasActiveSOS && <View style={styles.tabBadgeDot} />}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedTab("reports")}
            style={[styles.segmentButton, selectedTab === "reports" && styles.segmentButtonActive]}
          >
            <View style={styles.segmentContent}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={selectedTab === "reports" ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentText,
                  selectedTab === "reports" && styles.segmentTextActive,
                ]}
              >
                Raised Reports
              </Text>
              {reportsList.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{reportsList.length}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* TAB 1: SOS EMERGENCY STATUS */}
        {selectedTab === "sos" && (
          <View>
            {isSosInitialLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Syncing emergency response status...</Text>
              </View>
            ) : sosRequest ? (
              <>
                {/* Active SOS Card with Real Data */}
                <View style={styles.requestCard}>
                  <View style={styles.requestTopRow}>
                    <View style={styles.requestIdRow}>
                      <Ionicons
                        name={hasActiveSOS ? "alert-circle" : "checkmark-circle"}
                        size={17}
                        color={hasActiveSOS ? theme.colors.destructive : theme.colors.verified}
                      />
                      <Text style={styles.requestId}>
                        {isSOS ? "SOS EMERGENCY" : "ASSISTANCE"} #{sosRequest._id.slice(-5).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.statusBadgesRow}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              sosRequest.priority === "critical"
                                ? "rgba(239, 68, 68, 0.12)"
                                : "rgba(245, 158, 11, 0.12)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            {
                              color:
                                sosRequest.priority === "critical"
                                  ? theme.colors.destructive
                                  : theme.colors.accent,
                            },
                          ]}
                        >
                          {sosRequest.priority.toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.lifecycleBadge,
                          hasActiveSOS ? styles.lifecycleActive : styles.lifecycleResolved,
                        ]}
                      >
                        <Text
                          style={[
                            styles.lifecycleText,
                            hasActiveSOS ? styles.lifecycleActiveText : styles.lifecycleResolvedText,
                          ]}
                        >
                          {sosRequest.status.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Situation & Details */}
                  <View style={styles.situationRow}>
                    <View style={[styles.situationPill, { backgroundColor: currentSituation.bg }]}>
                      <Ionicons name={currentSituation.icon} size={15} color={currentSituation.color} />
                      <Text style={[styles.situationPillText, { color: currentSituation.color }]}>
                        {currentSituation.label}
                      </Text>
                    </View>

                    {sosRequest.peopleCount ? (
                      <View style={styles.peoplePill}>
                        <Ionicons name="people-outline" size={14} color={theme.colors.foreground} />
                        <Text style={styles.peoplePillText}>
                          {sosRequest.peopleCount} {sosRequest.peopleCount === 1 ? "Person" : "People"}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.requestDescription}>{sosRequest.description}</Text>

                  {/* Location Row */}
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={17} color={theme.colors.destructive} />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {sosRequest.address ||
                        (sosRequest.latitude && sosRequest.longitude
                          ? `GPS: ${sosRequest.latitude.toFixed(5)}, ${sosRequest.longitude.toFixed(5)}`
                          : "Location captured with emergency alert")}
                    </Text>
                  </View>

                  {/* Timestamp */}
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.mutedForeground} />
                    <Text style={styles.timeText}>
                      Submitted {formatDate(sosRequest.createdAt)}
                      {camp?.name ? ` · Assigned to ${camp.name}` : ""}
                    </Text>
                  </View>

                  {/* Real Responder Metrics */}
                  <View style={styles.metricsRow}>
                    {volunteer ? (
                      <>
                        <Metric value={distanceText} label="DISTANCE" />
                        <View style={styles.metricDivider} />
                        <Metric value={etaText} label="EST. ARRIVAL" />
                        <View style={styles.metricDivider} />
                        <Metric value={volunteer.name} label="RESPONDER" />
                      </>
                    ) : (
                      <View style={styles.awaitingDispatchBox}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <View style={styles.awaitingDispatchCopy}>
                          <Text style={styles.awaitingDispatchTitle}>Awaiting Dispatch</Text>
                          <Text style={styles.awaitingDispatchSub}>
                            Coordinators are dispatching the nearest response team
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Progress Stages */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Response Progress</Text>
                  <Text style={styles.sectionMeta}>{currentStatus.replace("_", " ")}</Text>
                </View>

                <View style={styles.timelineCard}>
                  {progressStages.map((stage, index) => {
                    const isLast = index === progressStages.length - 1;

                    return (
                      <View key={stage.id} style={styles.timelineItem}>
                        <View style={styles.timelineRail}>
                          <View
                            style={[
                              styles.timelineDot,
                              stage.complete && styles.timelineDotComplete,
                              stage.active && styles.timelineDotActive,
                            ]}
                          >
                            {stage.complete && (
                              <Ionicons name="checkmark" size={13} color={theme.colors.card} />
                            )}
                            {stage.active && <View style={styles.timelineDotInner} />}
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                styles.timelineLine,
                                stage.complete && styles.timelineLineComplete,
                              ]}
                            />
                          )}
                        </View>

                        <View style={[styles.timelineCopy, isLast && styles.timelineCopyLast]}>
                          <View style={styles.timelineTitleRow}>
                            <Text
                              style={[
                                styles.timelineTitle,
                                !stage.complete && !stage.active && styles.pendingText,
                                stage.active && styles.activeStageTitle,
                              ]}
                            >
                              {stage.title}
                            </Text>
                            {stage.active && (
                              <View style={styles.activeTag}>
                                <Text style={styles.activeTagText}>CURRENT</Text>
                              </View>
                            )}
                            {stage.complete && (
                              <Ionicons name="checkmark-done" size={15} color={theme.colors.verified} />
                            )}
                          </View>
                          <Text style={styles.timelineNote}>{stage.subtitle}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Activity Updates History */}
                {updates.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Activity Log</Text>
                      <Text style={styles.sectionMeta}>{updates.length} updates</Text>
                    </View>

                    <View style={styles.logCard}>
                      {updates.map((update: any, idx: number) => (
                        <View
                          key={`update_${idx}_${update.createdAt}`}
                          style={[styles.logRow, idx > 0 && styles.logRowBorder]}
                        >
                          <View style={styles.logDot} />
                          <View style={styles.logCopy}>
                            <Text style={styles.logNote}>{update.note}</Text>
                            <Text style={styles.logTime}>
                              {new Date(update.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              · Status: {update.status.replace("_", " ")}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Info Advisory */}
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.infoText}>
                    Keep your device connected and phone line open. In critical danger, seek high or safe ground.
                  </Text>
                </View>

                {/* Emergency Actions */}
                <View style={styles.actionButtonsCol}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleContactResponder}
                    style={styles.contactButton}
                  >
                    <Ionicons
                      name={volunteer?.phone ? "call-outline" : "chatbubble-ellipses-outline"}
                      size={18}
                      color={theme.colors.foreground}
                    />
                    <Text style={styles.contactButtonText}>
                      {volunteer?.phone
                        ? `Call Responder (${volunteer.name})`
                        : camp?.contactPhone
                        ? `Call Camp Base`
                        : "Coordinator Assistance"}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleCallEmergencyHelpline}
                    style={styles.helplineButton}
                  >
                    <Ionicons name="call" size={17} color={theme.colors.destructiveForeground} />
                    <Text style={styles.helplineButtonText}>Dial 112 National Emergency Helpline</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              /* No Active SOS State */
              <View style={styles.emptySosCard}>
                <View style={styles.emptySosIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={38} color={theme.colors.verified} />
                </View>
                <Text style={styles.emptySosTitle}>No Active SOS Emergency</Text>
                <Text style={styles.emptySosDescription}>
                  You have not broadcasted an emergency signal. Relief personnel and emergency teams are on
                  standby 24/7.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/sos")}
                  style={styles.triggerSosButton}
                >
                  <Ionicons name="radio" size={20} color={theme.colors.destructiveForeground} />
                  <Text style={styles.triggerSosButtonText}>Trigger Emergency SOS</Text>
                </Pressable>

                {reportsList.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedTab("reports")}
                    style={styles.viewReportsLink}
                  >
                    <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.viewReportsLinkText}>
                      View your {reportsList.length} raised incident {reportsList.length === 1 ? "report" : "reports"} →
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: RAISED INCIDENT REPORTS STATUS */}
        {selectedTab === "reports" && (
          <View>
            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReportFilter("all")}
                style={[styles.filterPill, reportFilter === "all" && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    reportFilter === "all" && styles.filterPillTextActive,
                  ]}
                >
                  All ({reportsList.length})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setReportFilter("pending")}
                style={[styles.filterPill, reportFilter === "pending" && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    reportFilter === "pending" && styles.filterPillTextActive,
                  ]}
                >
                  Under Review ({pendingReportsCount})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setReportFilter("verified")}
                style={[styles.filterPill, reportFilter === "verified" && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    reportFilter === "verified" && styles.filterPillTextActive,
                  ]}
                >
                  Verified ({verifiedReportsCount})
                </Text>
              </Pressable>
            </View>

            {isReportsInitialLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Fetching raised incident reports...</Text>
              </View>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <ReportItemCard key={report._id} report={report} />
              ))
            ) : (
              /* Empty Reports State */
              <View style={styles.emptyReportsCard}>
                <View style={styles.emptyReportsIconWrap}>
                  <Ionicons name="document-text-outline" size={36} color={theme.colors.mutedForeground} />
                </View>
                <Text style={styles.emptyReportsTitle}>No Reports Found</Text>
                <Text style={styles.emptyReportsDesc}>
                  {reportFilter === "all"
                    ? "You have not submitted any incident or hazard reports yet."
                    : `You have no reports matching '${reportFilter}'.`}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/report")}
                  style={styles.submitReportButton}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.card} />
                  <Text style={styles.submitReportButtonText}>Report an Incident</Text>
                </Pressable>
              </View>
            )}

            {/* Quick action to submit new report */}
            {filteredReports.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/report")}
                style={styles.newReportButton}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.foreground} />
                <Text style={styles.newReportButtonText}>File Another Incident Report</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ReportItemCard = React.memo(function ReportItemCard({ report }: { report: any }) {
  const categoryConf =
    reportCategoryConfig[report.category] ?? reportCategoryConfig.other;
  const isVerified = report.verificationStatus === "verified";
  const isPending = report.verificationStatus === "pending";
  const isRejected = report.verificationStatus === "rejected";

  return (
    <View style={styles.reportCard}>
      {/* Top Row: Category + Verification Status */}
      <View style={styles.reportCardTop}>
        <View style={[styles.categoryTag, { backgroundColor: categoryConf.bg }]}>
          <Ionicons name={categoryConf.icon} size={14} color={categoryConf.color} />
          <Text style={[styles.categoryTagText, { color: categoryConf.color }]}>
            {categoryConf.label}
          </Text>
        </View>

        <View
          style={[
            styles.reportStatusBadge,
            isVerified && styles.reportStatusVerified,
            isPending && styles.reportStatusPending,
            isRejected && styles.reportStatusRejected,
          ]}
        >
          <Ionicons
            name={
              isVerified
                ? "checkmark-circle"
                : isPending
                ? "time-outline"
                : "close-circle-outline"
            }
            size={12}
            color={
              isVerified
                ? theme.colors.verified
                : isPending
                ? theme.colors.accent
                : theme.colors.destructive
            }
          />
          <Text
            style={[
              styles.reportStatusText,
              isVerified && styles.reportStatusVerifiedText,
              isPending && styles.reportStatusPendingText,
              isRejected && styles.reportStatusRejectedText,
            ]}
          >
            {isVerified ? "VERIFIED" : isPending ? "UNDER REVIEW" : "REJECTED"}
          </Text>
        </View>
      </View>

      {/* Report Content */}
      <Text style={styles.reportTitle}>{report.title}</Text>
      {report.description ? (
        <Text style={styles.reportDesc}>{report.description}</Text>
      ) : null}

      {/* Optional Photo Preview with ExpoImage to prevent image flashing */}
      {report.imageUrl ? (
        <View style={styles.reportImageWrap}>
          <ExpoImage
            source={{ uri: report.imageUrl }}
            style={styles.reportImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        </View>
      ) : null}

      {/* Location */}
      <View style={styles.reportMetaRow}>
        <Ionicons name="location-outline" size={15} color={theme.colors.mutedForeground} />
        <Text style={styles.reportLocationText} numberOfLines={1}>
          {report.address || `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
        </Text>
      </View>

      {/* Submission Time */}
      <View style={styles.reportMetaRow}>
        <Ionicons name="time-outline" size={15} color={theme.colors.mutedForeground} />
        <Text style={styles.reportTimeText}>Submitted {formatDate(report.createdAt)}</Text>
        {report.severity && (
          <View style={styles.severityTag}>
            <Text style={styles.severityTagText}>
              Severity: {report.severity.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Linked Incident Box if Verified */}
      {report.incident ? (
        <View style={styles.linkedIncidentBox}>
          <View style={styles.linkedIncidentHeader}>
            <Ionicons name="link-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.linkedIncidentTitle}>Added to Active Incident</Text>
          </View>
          <Text style={styles.linkedIncidentName}>{report.incident.title}</Text>
          <View style={styles.incidentTagsRow}>
            <View style={styles.incidentStatusTag}>
              <Text style={styles.incidentStatusTagText}>
                Status: {report.incident.status.replace("_", " ")}
              </Text>
            </View>
            <View style={styles.incidentPriorityTag}>
              <Text style={styles.incidentPriorityTagText}>
                Priority: {report.incident.priority}
              </Text>
            </View>
          </View>
        </View>
      ) : isPending ? (
        <View style={styles.pendingAdvisoryBox}>
          <Ionicons name="hourglass-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.pendingAdvisoryText}>
            Relief coordinators are reviewing location data to correlate with nearby teams.
          </Text>
        </View>
      ) : null}
    </View>
  );
});

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: theme.borderWidth,
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 36,
  },
  loadingText: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heading: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 3,
  },
  liveSosBadge: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.28)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  livePulseDot: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 5,
    height: 7,
    width: 7,
  },
  liveSosText: {
    color: theme.colors.destructive,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  standbyBadge: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  standbyText: {
    color: theme.colors.verified,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  segmentContainer: {
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 20,
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  segmentContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  segmentText: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: theme.colors.foreground,
    fontWeight: "800",
  },
  tabBadgeDot: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  countBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: theme.colors.card,
    fontSize: 9,
    fontWeight: "800",
  },
  requestCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: theme.borderWidth,
    padding: 17,
  },
  requestTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  requestIdRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  requestId: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  statusBadgesRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  priorityBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: "800",
  },
  lifecycleBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lifecycleActive: {
    backgroundColor: "rgba(79, 70, 229, 0.12)",
  },
  lifecycleResolved: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  lifecycleText: {
    fontSize: 9,
    fontWeight: "800",
  },
  lifecycleActiveText: {
    color: theme.colors.primary,
  },
  lifecycleResolvedText: {
    color: theme.colors.verified,
  },
  situationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  situationPill: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  situationPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  peoplePill: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  peoplePillText: {
    color: theme.colors.foreground,
    fontSize: 11,
    fontWeight: "700",
  },
  requestDescription: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 12,
  },
  locationRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  locationText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  timeText: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
  metricsRow: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 12,
  },
  metric: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  metricLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  metricDivider: {
    backgroundColor: theme.colors.border,
    height: 25,
    width: 1,
  },
  awaitingDispatchBox: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  awaitingDispatchCopy: {
    flex: 1,
  },
  awaitingDispatchTitle: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  awaitingDispatchSub: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 22,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionMeta: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timelineCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: theme.borderWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  timelineItem: {
    flexDirection: "row",
  },
  timelineRail: {
    alignItems: "center",
    marginRight: 13,
    width: 22,
  },
  timelineDot: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  timelineDotComplete: {
    backgroundColor: theme.colors.verified,
    borderColor: theme.colors.verified,
  },
  timelineDotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timelineDotInner: {
    backgroundColor: theme.colors.card,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  timelineLine: {
    backgroundColor: theme.colors.border,
    flex: 1,
    marginVertical: 3,
    width: 2,
  },
  timelineLineComplete: {
    backgroundColor: theme.colors.verified,
  },
  timelineCopy: {
    flex: 1,
    paddingBottom: 22,
  },
  timelineCopyLast: {
    paddingBottom: 16,
  },
  timelineTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  timelineTitle: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  activeStageTitle: {
    color: theme.colors.primary,
  },
  pendingText: {
    color: theme.colors.mutedForeground,
  },
  activeTag: {
    backgroundColor: "rgba(79, 70, 229, 0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeTagText: {
    color: theme.colors.primary,
    fontSize: 8,
    fontWeight: "800",
  },
  timelineNote: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  logCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: theme.borderWidth,
    padding: 14,
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 7,
  },
  logRowBorder: {
    borderTopColor: theme.colors.muted,
    borderTopWidth: 1,
  },
  logDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    height: 7,
    marginTop: 5,
    width: 7,
  },
  logCopy: {
    flex: 1,
  },
  logNote: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  logTime: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    marginTop: 2,
  },
  infoBanner: {
    alignItems: "flex-start",
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
    padding: 13,
  },
  infoText: {
    color: theme.colors.mutedForeground,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 14,
  },
  contactButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  contactButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  helplineButton: {
    alignItems: "center",
    backgroundColor: theme.colors.destructive,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  helplineButtonText: {
    color: theme.colors.destructiveForeground,
    fontSize: 13,
    fontWeight: "800",
  },
  emptySosCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: theme.borderWidth,
    marginTop: 8,
    padding: 24,
  },
  emptySosIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  emptySosTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySosDescription: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  triggerSosButton: {
    alignItems: "center",
    backgroundColor: theme.colors.destructive,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: "100%",
  },
  triggerSosButtonText: {
    color: theme.colors.destructiveForeground,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  viewReportsLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    paddingVertical: 4,
  },
  viewReportsLinkText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  filterPillText: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: theme.colors.card,
  },
  reportCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: theme.borderWidth,
    marginBottom: 14,
    padding: 16,
  },
  reportCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryTag: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  reportStatusBadge: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportStatusVerified: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  reportStatusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  reportStatusRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  reportStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  reportStatusVerifiedText: {
    color: theme.colors.verified,
  },
  reportStatusPendingText: {
    color: theme.colors.accent,
  },
  reportStatusRejectedText: {
    color: theme.colors.destructive,
  },
  reportTitle: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  reportDesc: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  reportImageWrap: {
    borderRadius: 8,
    marginTop: 10,
    overflow: "hidden",
  },
  reportImage: {
    backgroundColor: theme.colors.muted,
    borderRadius: 8,
    height: 140,
    width: "100%",
  },
  reportMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 9,
  },
  reportLocationText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 11,
  },
  reportTimeText: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
  severityTag: {
    backgroundColor: theme.colors.muted,
    borderRadius: 4,
    marginLeft: "auto",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  severityTagText: {
    color: theme.colors.foreground,
    fontSize: 8,
    fontWeight: "800",
  },
  linkedIncidentBox: {
    backgroundColor: "rgba(79, 70, 229, 0.07)",
    borderColor: "rgba(79, 70, 229, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 11,
  },
  linkedIncidentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  linkedIncidentTitle: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  linkedIncidentName: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  incidentTagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  incidentStatusTag: {
    backgroundColor: theme.colors.card,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  incidentStatusTagText: {
    color: theme.colors.foreground,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  incidentPriorityTag: {
    backgroundColor: theme.colors.card,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  incidentPriorityTagText: {
    color: theme.colors.destructive,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  pendingAdvisoryBox: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
    padding: 9,
  },
  pendingAdvisoryText: {
    color: theme.colors.mutedForeground,
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  emptyReportsCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: theme.borderWidth,
    padding: 24,
  },
  emptyReportsIconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  emptyReportsTitle: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
  },
  emptyReportsDesc: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    textAlign: "center",
  },
  submitReportButton: {
    alignItems: "center",
    backgroundColor: theme.colors.foreground,
    borderRadius: 10,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  submitReportButtonText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: "800",
  },
  newReportButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 12,
  },
  newReportButtonText: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "800",
  },
});
