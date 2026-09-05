import { Stack } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { useMutation } from "convex/react";

import { api } from "@backend/convex/_generated/api";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

export default function AppLayout() {
  return (
    <ProfileErrorBoundary>
      <ProfileGate />
    </ProfileErrorBoundary>
  );
}

function ProfileGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const ensureProfile = useMutation(api.public.users.ensureCurrentUserProfile);
  const provisioningRequested = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      provisioningRequested.current = false;
      return;
    }

    if (provisioningRequested.current) return;

    provisioningRequested.current = true;
    void ensureProfile({
      name:
        user.fullName ??
        ([user.firstName, user.lastName].filter(Boolean).join(" ") || undefined),
      email: user.primaryEmailAddress?.emailAddress,
      imageUrl: user.imageUrl,
    }).catch((caughtError) => {
      console.error("Unable to create the current user's profile:", caughtError);
    });
  }, [ensureProfile, isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Preparing your space...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="report" />
      <Stack.Screen name="sos" />
    </Stack>
  );
}

function ProfileErrorFallback({ message }: { message?: string }) {
  const { signOut } = useAuth();
  const fallbackMessage =
    message ??
    "Your account is signed in, but your Pukaar profile has not been created yet.";

  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Profile unavailable</Text>
      <Text style={styles.errorMessage}>
        {fallbackMessage}
      </Text>
      <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

class ProfileErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error("Profile gate failed:", error);
  }

  render() {
    if (this.state.error) {
      return <ProfileErrorFallback message={this.state.error.message} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.mutedForeground,
    fontSize: 16,
  },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 12,
    color: theme.colors.mutedForeground,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  signOutButton: {
    marginTop: 28,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  signOutButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
});
