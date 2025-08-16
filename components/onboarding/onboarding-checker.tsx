"use client";

import { useEffect, useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export default function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Get the organization ID (either org or user ID for personal accounts)
  const orgId = organization?.id || user?.id;

  // Query business profile from Convex
  const businessProfile = useQuery(
    api.businessProfiles.getByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  // Query agent configuration from Convex
  const agentConfig = useQuery(
    api.agentConfigurations.getByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  useEffect(() => {
    // Wait for queries to complete
    if (businessProfile === undefined || agentConfig === undefined) {
      return; // Still loading
    }

    // Check if onboarding is complete
    const hasBusinessProfile = businessProfile !== null;
    const hasAgentConfig = agentConfig !== null && agentConfig.phoneNumber;

    if (hasBusinessProfile && hasAgentConfig) {
      // Onboarding completed, user can access dashboard
      setIsChecking(false);
    } else {
      // Onboarding not completed, redirect to onboarding
      router.push("/onboarding");
      return;
    }
  }, [businessProfile, agentConfig, router]);

  // Show loading while checking
  if (isChecking || businessProfile === undefined || agentConfig === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}