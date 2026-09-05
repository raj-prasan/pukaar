import { useAuth } from "@clerk/expo";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
const clerkJwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE ?? "convex";

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL");
}

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClerkProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return (
    <ConvexProviderWithAuth
      client={convex}
      useAuth={() => ({
        isLoading: !isLoaded,
        isAuthenticated: Boolean(isSignedIn),
        fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
          getToken({ template: clerkJwtTemplate, skipCache: forceRefreshToken })
      })}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}
