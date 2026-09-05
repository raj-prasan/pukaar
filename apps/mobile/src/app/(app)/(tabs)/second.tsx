import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useNavigation } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

type Incident = {
  title: string;
  description: string;
  category:
    | "flood"
    | "fire"
    | "landslide"
    | "earthquake"
    | "medical"
    | "road_blocked"
    | "building_damage"
    | "missing_person"
    | "other";
  latitude: number;
  longitude: number;
  address?: string;
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "reported"
    | "under_review"
    | "verified"
    | "active"
    | "contained"
    | "resolved"
    | "false_alarm";
  verificationStatus: "unverified" | "verified" | "outdated";
  reportCount: number;
  updatedAt: number;
};

type MapLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const MOCK_INCIDENTS: Incident[] = [
  {
    title: "Flooding near Main Market",
    description: "Water level is rising near the market entrance.",
    category: "flood",
    latitude: 26.7012,
    longitude: 92.8366,
    address: "Main Market Road",
    priority: "critical",
    status: "active",
    verificationStatus: "verified",
    reportCount: 8,
    updatedAt: Date.now() - 2 * 60 * 1000,
  },
  {
    title: "Road blocked on Bridge Road",
    description: "Debris is blocking the road for vehicles and pedestrians.",
    category: "road_blocked",
    latitude: 26.6979,
    longitude: 92.8348,
    address: "Bridge Road",
    priority: "high",
    status: "verified",
    verificationStatus: "verified",
    reportCount: 5,
    updatedAt: Date.now() - 22 * 60 * 1000,
  },
  {
    title: "Medical assistance requested",
    description: "A first-aid team is needed near the community hall.",
    category: "medical",
    latitude: 26.7031,
    longitude: 92.839,
    address: "Community Hall B",
    priority: "medium",
    status: "under_review",
    verificationStatus: "unverified",
    reportCount: 2,
    updatedAt: Date.now() - 41 * 60 * 1000,
  },
];

const priorityColors = {
  low: "#5f8f72",
  medium: "#b27a1d",
  high: "#c35c35",
  critical: "#b7352d",
} as const;

function createMapHtml(incidents: Incident[]) {
  const incidentData = JSON.stringify(
    incidents.map(({ title, description, category, latitude, longitude, priority, status }) => ({
      title,
      description,
      category,
      latitude,
      longitude,
      priority,
      status,
    })),
  );

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html, body, #map { height: 100%; margin: 0; }
      body { overflow: hidden; }
      .leaflet-control-attribution { font-size: 9px; }
      .user-marker { background: #208AEF; border: 3px solid white; border-radius: 50%; box-shadow: 0 1px 5px rgba(0,0,0,.35); }
      .incident-marker { border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,.35); }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const incidents = ${incidentData};
      const priorityColors = ${JSON.stringify(priorityColors)};
      const defaultCenter = [26.700637, 92.836052];
      const map = L.map('map', { zoomControl: true, attributionControl: true }).setView(defaultCenter, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      incidents.forEach((incident) => {
        const color = priorityColors[incident.priority] || priorityColors.medium;
        const areaRadius = incident.priority === 'critical' ? 180 : incident.priority === 'high' ? 120 : 80;
        L.circle([incident.latitude, incident.longitude], {
          radius: areaRadius,
          color,
          fillColor: color,
          fillOpacity: 0.1,
          weight: 1
        }).addTo(map);
        const marker = L.circleMarker([incident.latitude, incident.longitude], {
          radius: incident.priority === 'critical' ? 11 : 9,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
          className: 'incident-marker'
        }).addTo(map);
        marker.bindPopup('<strong>' + incident.title + '</strong><br>' + incident.description + '<br><small>' + incident.status.replace('_', ' ') + '</small>');
      });

      let userMarker;
      let accuracyCircle;
      let hasCenteredOnUser = false;

      window.setUserLocation = function(latitude, longitude, accuracy) {
        const position = [latitude, longitude];
        if (!userMarker) {
          userMarker = L.marker(position, {
            icon: L.divIcon({ className: 'user-marker', iconSize: [18, 18], iconAnchor: [9, 9] })
          }).addTo(map).bindPopup('Your current location');
        } else {
          userMarker.setLatLng(position);
        }
        if (accuracyCircle) map.removeLayer(accuracyCircle);
        accuracyCircle = L.circle(position, {
          radius: Math.max(accuracy || 0, 20),
          color: '#208AEF',
          fillColor: '#208AEF',
          fillOpacity: 0.12,
          weight: 1
        }).addTo(map);
        if (!hasCenteredOnUser) {
          map.setView(position, 15);
          hasCenteredOnUser = true;
        }
      };

      window.centerOnUser = function() {
        if (userMarker) map.setView(userMarker.getLatLng(), 16);
      };

      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('map-ready');
    </script>
  </body>
</html>`;
}

const MAP_HTML = createMapHtml(MOCK_INCIDENTS);

function formatCategory(category: Incident["category"]) {
  return category.replace("_", " ");
}

function formatUpdatedAt(updatedAt: number) {
  const minutes = Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
  return `${minutes}m ago`;
}

export default function IncidentsScreen() {
  const navigation = useNavigation();
  const webViewRef = React.useRef<WebView>(null);
  const [view, setView] = React.useState<"incidents" | "map">("incidents");
  const [mapReady, setMapReady] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState<MapLocation | null>(null);
  const [locationMessage, setLocationMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    navigation.setOptions({ swipeEnabled: view !== "map" });
  }, [navigation, view]);

  React.useEffect(() => {
    if (view !== "map") return;

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active) return;

      if (permission.status !== "granted") {
        setLocationMessage("Location access is needed to show you on the map.");
        return;
      }

      setLocationMessage(null);
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!active) return;
      setCurrentLocation({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        accuracy: initialLocation.coords.accuracy,
      });

      const nextSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          if (!active) return;
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          });
        },
      );
      if (!active) {
        nextSubscription.remove();
        return;
      }
      subscription = nextSubscription;
    }

    startLocationTracking().catch(() => {
      if (active) setLocationMessage("Unable to read your current location.");
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [view]);

  React.useEffect(() => {
    if (!mapReady || !currentLocation) return;

    const { latitude, longitude, accuracy } = currentLocation;
    webViewRef.current?.injectJavaScript(
      `window.setUserLocation(${latitude}, ${longitude}, ${accuracy ?? 0}); true;`,
    );
  }, [currentLocation, mapReady]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LIVE UPDATES</Text>
        <Text style={styles.title}>Incidents</Text>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "incidents" }}
          onPress={() => setView("incidents")}
          style={[styles.segment, view === "incidents" && styles.activeSegment]}
        >
          <Ionicons
            name="list"
            size={16}
            color={view === "incidents" ? theme.colors.foreground : theme.colors.mutedForeground}
          />
          <Text style={[styles.segmentText, view === "incidents" && styles.activeSegmentText]}>
            Incidents
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "map" }}
          onPress={() => setView("map")}
          style={[styles.segment, view === "map" && styles.activeSegment]}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={view === "map" ? theme.colors.foreground : theme.colors.mutedForeground}
          />
          <Text style={[styles.segmentText, view === "map" && styles.activeSegmentText]}>Map</Text>
        </Pressable>
      </View>

      {view === "incidents" ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summary}>3 nearby incidents</Text>
            <Text style={styles.summaryMuted}>Mock data</Text>
          </View>
          {MOCK_INCIDENTS.map((incident) => (
            <View key={incident.title} style={styles.incidentCard}>
              <View style={[styles.priorityBar, { backgroundColor: priorityColors[incident.priority] }]} />
              <View style={styles.incidentBody}>
                <View style={styles.incidentHeading}>
                  <Text style={styles.incidentTitle}>{incident.title}</Text>
                  <Text style={styles.time}>{formatUpdatedAt(incident.updatedAt)}</Text>
                </View>
                <Text style={styles.description}>{incident.description}</Text>
                <View style={styles.tags}>
                  <Text style={[styles.tag, { color: priorityColors[incident.priority] }]}>
                    {incident.priority.toUpperCase()}
                  </Text>
                  <Text style={styles.tagMuted}>{formatCategory(incident.category)}</Text>
                  <Text style={styles.tagMuted}>{incident.reportCount} reports</Text>
                </View>
                <Text style={styles.location}>
                  {incident.address ?? "Location pending"} · {incident.status.replace("_", " ")}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: MAP_HTML }}
            style={styles.map}
            nestedScrollEnabled
            javaScriptEnabled
            startInLoadingState
            onLoadEnd={() => setMapReady(true)}
            onMessage={(event) => {
              if (event.nativeEvent.data === "map-ready") setMapReady(true);
            }}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading map</Text>
              </View>
            )}
            originWhitelist={["*"]}
          />
          {currentLocation ? (
            <Pressable
              accessibilityLabel="Center map on my location"
              onPress={() => webViewRef.current?.injectJavaScript("window.centerOnUser(); true;")}
              style={styles.locateButton}
            >
              <Ionicons name="locate" size={20} color={theme.colors.primary} />
            </Pressable>
          ) : null}
          {locationMessage ? (
            <View style={styles.locationMessage}>
              <Text style={styles.locationMessageText}>{locationMessage}</Text>
            </View>
          ) : null}
          <View style={styles.mapAttribution}>
            <Text style={styles.mapAttributionText}>© OpenStreetMap contributors</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f9f3" },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { color: "#c35c35", fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: "#1e2925", fontSize: 32, fontWeight: "800", lineHeight: 38, marginTop: 5 },
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 10,
    backgroundColor: "#eceee8",
  },
  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 7,
  },
  activeSegment: { backgroundColor: "#ffffff" },
  segmentText: { color: "#5f625d", fontSize: 13, fontWeight: "600" },
  activeSegmentText: { color: "#000000" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summary: { color: "#1e2925", fontSize: 14, fontWeight: "700" },
  summaryMuted: { color: "#7b8179", fontSize: 12 },
  incidentCard: {
    flexDirection: "row",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d9ddd5",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  priorityBar: { width: 4 },
  incidentBody: { flex: 1, padding: 14 },
  incidentHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  incidentTitle: { flex: 1, color: "#1e2925", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  time: { color: "#7b8179", fontSize: 11 },
  description: { color: "#5f625d", fontSize: 13, lineHeight: 19, marginTop: 5 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { backgroundColor: "#f8ede8", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: "800" },
  tagMuted: { color: "#687168", backgroundColor: "#eef0eb", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: "600" },
  location: { color: "#7b8179", fontSize: 11, marginTop: 10, textTransform: "capitalize" },
  mapContainer: { flex: 1, marginHorizontal: 20, marginBottom: 20, overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: "#d9ddd5", backgroundColor: "#e7ebe4" },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#e7ebe4" },
  loadingText: { color: "#5f625d", fontSize: 13 },
  locateButton: {
    position: "absolute",
    left: 12,
    bottom: 34,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  locationMessage: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  locationMessageText: { color: "#5f625d", fontSize: 12, textAlign: "center" },
  mapAttribution: { position: "absolute", right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.9)" },
  mapAttributionText: { color: "#4b554d", fontSize: 9 },
});
