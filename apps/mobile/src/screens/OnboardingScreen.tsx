import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@backend/convex/_generated/api";
import { theme } from "@/constants/theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.public.users.completeOnboarding);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await completeOnboarding({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      router.replace("/(app)/(tabs)");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.eyebrow}>Pukaar</Text>
            <Text style={styles.title}>Let&apos;s get you set up.</Text>
            <Text style={styles.description}>
              Add a few details so your community can support you when it matters.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
                value={name}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Optional"
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
                value={phone}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={[styles.button, isSubmitting && styles.disabledButton]}
            >
              <Text style={styles.buttonText}>{isSubmitting ? "Saving..." : "Continue"}</Text>
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  eyebrow: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    maxWidth: 330,
    marginTop: 24,
    color: theme.colors.foreground,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
  },
  description: {
    maxWidth: 340,
    marginTop: 16,
    color: theme.colors.mutedForeground,
    fontSize: 17,
    lineHeight: 25,
  },
  form: {
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    height: 56,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    color: theme.colors.foreground,
    fontSize: 16,
  },
  error: {
    color: theme.colors.destructive,
    fontSize: 14,
  },
  button: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
});
