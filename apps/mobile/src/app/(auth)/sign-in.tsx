import { useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import { useSignIn } from "@clerk/expo/legacy";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthScreen,
} from "../../components/auth/auth-screen";

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit() {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
        strategy: "password",
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setError("This account needs another verification step.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      const {
        authSessionResult,
        createdSessionId,
        setActive: activateSession,
      } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/", { scheme: "mobile" }),
      });

      if (authSessionResult?.type === "cancel") return;

      if (!createdSessionId || !activateSession) {
        setError("Google sign-in needs another verification step.");
        return;
      }

      await activateSession({ session: createdSessionId });
      router.replace("/");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to sign in with Google.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.content}>
        <Text style={styles.heading}>Welcome back</Text>
        <AuthField
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          value={email}
        />
        <AuthField
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        <AuthError message={error} />
        <AuthButton
          disabled={!email || !password || isSubmitting || isGoogleSubmitting}
          label={isSubmitting ? "Signing in..." : "Sign in"}
          onPress={handleSubmit}
        />
        <Text style={styles.or}>or</Text>
        <AuthButton
          disabled={isSubmitting || isGoogleSubmitting}
          label={isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}
          onPress={handleGoogleSignIn}
        />
        <Text style={styles.footer}>
          New here?{" "}
          <Link style={styles.link} href="/(auth)/sign-up">
            Create an account
          </Link>
        </Text>
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
  footer: {
    marginTop: 24,
    color: "#5f625d",
    fontSize: 16,
    textAlign: "center",
  },
  or: {
    marginVertical: 16,
    color: "#5f625d",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#c35c35",
    fontWeight: "600",
  },
});
