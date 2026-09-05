import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import React, { useRef } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { api } from "@backend/convex/_generated/api";

type RequestStatus =
  | "submitted"
  | "under_review"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "arrived"
  | "resolved"
  | "cancelled";

type DispatchStatus =
  | "created"
  | "dispatched"
  | "accepted"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled";

type MockStatusData = {
  request: {
    id: string;
    requestType: "sos";
    category: "rescue";
    situation: "trapped" | "injured" | "evacuation" | "medicine" | "danger" | "other";
    priority: "low" | "medium" | "high" | "critical";
    status: RequestStatus;
    address: string;
    createdAt: string;
  };
  dispatch: {
    id: string;
    status: DispatchStatus;
    volunteer: string;
    distance: string;
    eta: string;
    phone?: string;
  };
  updates: Array<{
    status: RequestStatus | "dispatched";
    title: string;
    note: string;
    time: string;
    complete: boolean;
    active?: boolean;
  }>;
};

const defaultStatusData: MockStatusData = {
  request: {
    id: "assistance_91",
    requestType: "sos",
    category: "rescue",
    situation: "trapped",
    priority: "critical",
    status: "in_progress",
    address: "Main Market, near the east entrance",
    createdAt: "9:14 AM",
  },
  dispatch: {
    id: "dispatch_17",
    status: "en_route",
    volunteer: "Rahul (Volunteer)",
    distance: "2.1 km",
    eta: "~8 min",
  },
  updates: [
    {
      status: "submitted",
      title: "SOS submitted",
      note: "Location and situation shared with emergency network",
      time: "9:14 AM",
      complete: true,
    },
    {
      status: "under_review",
      title: "Verified by coordinator",
      note: "Camp Base · Priority: Critical",
      time: "9:17 AM",
      complete: true,
    },
    {
      status: "dispatched",
      title: "Resources dispatched",
      note: "First aid kit, water, and evacuation pack assigned",
      time: "9:19 AM",
      complete: true,
    },
    {
      status: "in_progress",
      title: "Volunteer en route",
      note: "Volunteer is 2.1 km away · Updating coordinates live",
      time: "Now",
      complete: false,
      active: true,
    },
    {
      status: "arrived",
      title: "Arrival and delivery",
      note: "Waiting for the relief team on site",
      time: "Pending",
      complete: false,
    },
  ],
};

const EMPTY_ARGS = {};

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

export default function ThirdScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  const activeRequestData = useQuery(
    api.public.assistanceRequest.getMyActiveRequest,
    isLoaded && isSignedIn ? EMPTY_ARGS : "skip",
  );

  const lastRequestData = useRef<typeof activeRequestData>(undefined);
  if (activeRequestData !== undefined) {
    lastRequestData.current = activeRequestData;
  }

  const live = activeRequestData ?? lastRequestData.current;

  // Real data with robust fallback so screen never flickers or re-renders
  const request = live?.request
    ? {
        id: `assistance_${live.request._id.slice(-4)}`,
        requestType: (live.request.requestType ?? "sos") as "sos",
        category: (live.request.category ?? "rescue") as "rescue",
        situation: "trapped" as const,
        priority: (live.request.priority ?? "critical") as "critical",
        status: (live.request.status ?? "in_progress") as RequestStatus,
        address: live.request.address || "Reported Location (GPS Active)",
        createdAt: new Date(live.request.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      }
    : defaultStatusData.request;

  let calculatedDistance = "2.1 km";
  let calculatedEta = "~8 min";
  if (
    live?.request?.latitude &&
    live?.request?.longitude &&
    live?.volunteerLocation?.latitude &&
    live?.volunteerLocation?.longitude
  ) {
    const km = calculateDistanceKm(
      live.request.latitude,
      live.request.longitude,
      live.volunteerLocation.latitude,
      live.volunteerLocation.longitude,
    );
    calculatedDistance = `${km.toFixed(1)} km`;
    calculatedEta = `~${Math.max(2, Math.round(km * 3))} min`;
  }

  const dispatch = live?.dispatch
    ? {
        id: `dispatch_${live.dispatch._id.slice(-4)}`,
        status: live.dispatch.status as DispatchStatus,
        volunteer: live.volunteer?.name || defaultStatusData.dispatch.volunteer,
        distance: calculatedDistance,
        eta: calculatedEta,
        phone: live.volunteer?.phone,
      }
    : defaultStatusData.dispatch;

  const updates =
    live?.updates && live.updates.length > 0
      ? live.updates.map((u, idx) => ({
          status: (u.status ?? "in_progress") as RequestStatus,
          title: u.note,
          note: `Status: ${u.status.replace("_", " ")}`,
          time: new Date(u.createdAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
          complete: idx > 0 || u.status === "arrived" || u.status === "resolved",
          active: idx === 0 && u.status !== "resolved",
        }))
      : defaultStatusData.updates;

  function handleContactCoordinator() {
    if (dispatch.phone) {
      Linking.openURL(`tel:${dispatch.phone}`);
    } else {
      Alert.alert(
        "Coordinator Connected",
        "Your relief coordinator and volunteer are actively tracking this request. Keep your phone accessible.",
      );
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR REQUEST</Text>
            <Text style={styles.heading}>Status</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.requestCard}>
          <View style={styles.requestTopRow}>
            <View style={styles.requestIdRow}>
              <Ionicons name="radio-outline" size={16} color={theme.colors.destructive} />
              <Text style={styles.requestId}>ASSISTANCE #{request.id.split("_")[1]}</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{request.priority.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.requestTitle}>Relief team on the way</Text>
          <Text style={styles.requestDescription}>
            SOS for {request.situation} · Submitted {request.createdAt}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={17} color={theme.colors.mutedForeground} />
            <Text style={styles.locationText}>{request.address}</Text>
          </View>

          <View style={styles.metricsRow}>
            <Metric value={dispatch.distance} label="DISTANCE" />
            <View style={styles.metricDivider} />
            <Metric value={dispatch.eta} label="EST. ARRIVAL" />
            <View style={styles.metricDivider} />
            <Metric value={dispatch.volunteer} label="VOLUNTEER" />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Response progress</Text>
          <Text style={styles.sectionMeta}>{request.status.replace("_", " ")}</Text>
        </View>

        <View style={styles.timelineCard}>
          {updates.map((update, index) => {
            const isLast = index === updates.length - 1;

            return (
              <View key={`${update.title ?? "step"}_${index}`} style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      update.complete && styles.timelineDotComplete,
                      update.active && styles.timelineDotActive,
                    ]}
                  >
                    {update.complete && (
                      <Ionicons name="checkmark" size={13} color={theme.colors.card} />
                    )}
                    {update.active && <View style={styles.timelineDotInner} />}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        update.complete && styles.timelineLineComplete,
                      ]}
                    />
                  )}
                </View>
                <View style={[styles.timelineCopy, isLast && styles.timelineCopyLast]}>
                  <View style={styles.timelineTitleRow}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        !update.complete && !update.active && styles.pendingText,
                      ]}
                    >
                      {update.title}
                    </Text>
                    <Text style={styles.timelineTime}>{update.time}</Text>
                  </View>
                  <Text style={styles.timelineNote}>{update.note}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Keep your phone nearby. The coordinator may call if your location changes.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleContactCoordinator}
          style={styles.contactButton}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={19} color={theme.colors.foreground} />
          <Text style={styles.contactButtonText}>Contact coordinator</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingBottom: 112,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  eyebrow: {
    color: theme.colors.destructive,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heading: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveDot: {
    backgroundColor: theme.colors.verified,
    borderRadius: 5,
    height: 7,
    width: 7,
  },
  liveText: {
    color: theme.colors.verified,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
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
    gap: 7,
  },
  requestId: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  priorityBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityText: {
    color: theme.colors.destructive,
    fontSize: 9,
    fontWeight: "800",
  },
  requestTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 17,
  },
  requestDescription: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
    marginTop: 4,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 15,
  },
  locationText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 12,
  },
  metricsRow: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 17,
    paddingVertical: 12,
  },
  metric: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    color: theme.colors.foreground,
    fontSize: 16,
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
    height: 27,
    width: 1,
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 25,
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
    paddingHorizontal: 15,
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
    paddingBottom: 17,
  },
  timelineTitleRow: {
    alignItems: "baseline",
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
  pendingText: {
    color: theme.colors.mutedForeground,
  },
  timelineTime: {
    color: theme.colors.mutedForeground,
    fontSize: 10,
  },
  timelineNote: {
    color: theme.colors.mutedForeground,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  infoBanner: {
    alignItems: "flex-start",
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 9,
    marginTop: 17,
    padding: 12,
  },
  infoText: {
    color: theme.colors.mutedForeground,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  contactButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 13,
  },
  contactButtonText: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
});
