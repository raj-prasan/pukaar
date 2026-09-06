import { useAuth } from "@clerk/expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL");
}

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClerkProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
