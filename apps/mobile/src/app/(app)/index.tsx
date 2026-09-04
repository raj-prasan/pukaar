import { useAuth, useUser } from "@clerk/expo";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          Pukaar
        </Text>
        <Text style={styles.title}>
          You are in.
        </Text>
        <Text style={styles.subtitle}>
          Signed in as {user?.primaryEmailAddress?.emailAddress ?? "your account"}.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => signOut()}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1ea",
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  content: {
    flex: 1,
    justifyContent: "center",
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
    maxWidth: 320,
    color: "#1e2925",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 46,
  },
  subtitle: {
    marginTop: 20,
    color: "#5f625d",
    fontSize: 18,
    lineHeight: 28,
  },
  button: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1e2925",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
