import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const profile = useQuery(
    api.public.users.getCurrentUserProfile,
    isLoaded && isSignedIn ? {} : "skip",
  );
  const lastProfile = useRef<typeof profile>(undefined);
  const updateProfile = useMutation(api.public.users.updateUserProfile);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile !== undefined && profile !== null) {
      lastProfile.current = profile;
    }
  }, [profile]);

  const displayedProfile = profile ?? lastProfile.current;

  async function handleSave() {
    const nextName = name.trim();
    const nextPhone = phone.trim();

    if (!nextName && !nextPhone) {
      setMessage("Enter a value before saving.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await updateProfile({
        ...(nextName && { name: nextName }),
        ...(nextPhone && { phone: nextPhone }),
      });
      setName("");
      setPhone("");
      setMessage("Profile updated.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!isLoaded || !isSignedIn || displayedProfile === undefined || displayedProfile === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayedProfile.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Personal details</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder={displayedProfile.name}
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={name}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder={displayedProfile.phone ?? "Add a phone number"}
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={phone}
            />

            <Text style={styles.label}>Email</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>
                {displayedProfile.email ?? "No email available"}
              </Text>
            </View>

            <Pressable
              disabled={isSaving}
              onPress={() => void handleSave()}
              style={[styles.saveButton, isSaving && styles.disabledButton]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </Pressable>

            {displayedProfile.role === "volunteer" || displayedProfile.role === "admin" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/volunteer")}
                style={styles.volunteerButton}
              >
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.card} />
                <Text style={styles.volunteerButtonText}>Open Volunteer Mission Desk</Text>
              </Pressable>
            ) : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "700",
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerSpacer: {
    height: 44,
    width: 44,
  },
  loading: {
    alignItems: "center",
    paddingTop: 48,
  },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    marginBottom: 28,
    width: 88,
  },
  avatarText: {
    color: theme.colors.primaryForeground,
    fontSize: 36,
    fontWeight: "700",
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
  },
  label: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    color: theme.colors.foreground,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 16,
  },
  readOnlyField: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    height: 54,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  readOnlyText: {
    color: theme.colors.mutedForeground,
    fontSize: 16,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.control,
    height: 54,
    justifyContent: "center",
    marginTop: 28,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: theme.colors.mutedForeground,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  volunteerButton: {
    alignItems: "center",
    backgroundColor: theme.colors.verified,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    flexDirection: "row",
    gap: 8,
    height: 54,
    justifyContent: "center",
    marginTop: 14,
  },
  volunteerButtonText: {
    color: theme.colors.card,
    fontSize: 15,
    fontWeight: "800",
  },
  signOutButton: {
    alignItems: "center",
    borderColor: theme.colors.destructive,
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth,
    height: 54,
    justifyContent: "center",
    marginTop: 36,
  },
  signOutText: {
    color: theme.colors.destructive,
    fontSize: 16,
    fontWeight: "700",
  },
});
