import type { ReactNode } from "react";
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

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Pukaar</Text>
            <Text style={styles.title}>A clearer way to begin.</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        style={styles.input}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        value={value}
      />
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;

  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1ea",
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 48,
  },
  eyebrow: {
    marginBottom: 12,
    color: "#c35c35",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    color: "#1e2925",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 46,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: "#1e2925",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d8d5cc",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    color: "#1e2925",
    fontSize: 16,
  },
  button: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1e2925",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    marginBottom: 16,
    color: "#b43e2d",
    fontSize: 14,
    lineHeight: 20,
  },
});
