"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export default function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

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

  useEffect(() => {
    // TEMPORARY FIX: Skip onboarding check for demo purposes
    // Since we have real Evolution API data working, allow dashboard access
    console.log("OnboardingChecker: Bypassing onboarding - allowing dashboard access");
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