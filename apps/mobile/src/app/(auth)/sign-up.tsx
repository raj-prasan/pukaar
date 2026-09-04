import { useSignUp } from "@clerk/expo/legacy";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthScreen,
} from "../../components/auth/auth-screen";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setIsVerifying(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerification() {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status !== "complete" || !result.createdSessionId) {
        setError("The verification is not complete yet.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "That code was not accepted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.content}>
        <Text style={styles.heading}>
          {isVerifying ? "Check your email" : "Create your account"}
        </Text>
        {isVerifying ? (
          <>
            <Text style={styles.description}>
              We sent a verification code to {email}.
            </Text>
            <AuthField label="Verification code" onChangeText={setCode} value={code} />
            <AuthError message={error} />
            <AuthButton
              disabled={!code || isSubmitting}
              label={isSubmitting ? "Verifying..." : "Verify email"}
              onPress={handleVerification}
            />
          </>
        ) : (
          <>
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
              disabled={!email || !password || isSubmitting}
              label={isSubmitting ? "Creating account..." : "Create account"}
              onPress={handleSubmit}
            />
          </>
        )}
        <Text style={styles.footer}>
          Already have an account?{" "}
          <Link style={styles.link} href="/(auth)/sign-in">
            Sign in
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
  description: {
    marginBottom: 24,
    color: "#5f625d",
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    marginTop: 24,
    color: "#5f625d",
    fontSize: 16,
    textAlign: "center",
  },
  link: {
    color: "#c35c35",
    fontWeight: "600",
  },
});
