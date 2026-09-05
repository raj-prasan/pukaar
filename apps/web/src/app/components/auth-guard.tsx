"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
import { CampOnboardingModal } from "@/modules/dashboard/components/camp-onboarding-modal";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLayout>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading Camp Coordinator profile...</p>
        </AuthLayout>
      </AuthLoading>

      <Authenticated>
        {children}
        <CampOnboardingModal />
      </Authenticated>

      <Unauthenticated>
        <SignInView />
      </Unauthenticated>
    </>
  );
};