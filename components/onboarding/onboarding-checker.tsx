"use client";

import { useEffect, useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export default function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(false);

  // Routes that don't require onboarding completion
  const allowedRoutes = [
    "/dashboard/settings",
    "/dashboard/settings/ai",
    "/dashboard/settings/whatsapp", 
    "/dashboard/settings/organization",
    "/dashboard/settings/members",
    "/dashboard/settings/security"
  ];

  // Check if current route is allowed without onboarding
  const isAllowedRoute = allowedRoutes.some(route => pathname.startsWith(route));

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

  // TEMPORARY: Skip all onboarding checks for demo
  useEffect(() => {
    setIsChecking(false);
  }, []);

  // Show loading while checking (except for allowed routes)
  if (isChecking && !isAllowedRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}