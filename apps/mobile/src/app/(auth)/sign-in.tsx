import { useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AuthButton,
  AuthError,
  AuthScreen,
} from "../../components/auth/auth-screen";

export default function SignInScreen() {
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleFlowInProgress = useRef(false);

  async function handleGoogleSignIn() {
    if (googleFlowInProgress.current) return;

    googleFlowInProgress.current = true;
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      await WebBrowser.dismissBrowser();

      const {
        authSessionResult,
        createdSessionId,
        setActive: activateSession,
      } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/", { scheme: "mobile" }),
        authSessionOptions: {
          showInRecents: false,
        },
      });

      if (authSessionResult?.type === "cancel") return;

      if (!createdSessionId || !activateSession) {
        setError("Google sign-in did not complete. Close any old Google sign-in tab and try again.");
        return;
      }

      await activateSession({ session: createdSessionId });
      router.replace("/");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "";
      setError(
        message.includes("state_token_already_used")
          ? "This Google sign-in link was already used. Close the old browser tab and try again."
          : message || "Unable to sign in with Google.",
      );
    } finally {
      await WebBrowser.dismissBrowser();
      googleFlowInProgress.current = false;
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.content}>
        <Text style={styles.heading}>Welcome back</Text>
        <AuthError message={error} />
        <AuthButton
          disabled={isGoogleSubmitting}
          label={isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}
          onPress={handleGoogleSignIn}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  heading: {
    marginBottom: 28,
    color: "#1e2925",
    fontSize: 18,
    fontWeight: "600",
  },
});
