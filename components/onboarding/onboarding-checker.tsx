"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getOrganizationByClerkId } from "@/lib/mock-api";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export default function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const { organization } = useOrganization();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!organization || hasChecked) return;

      try {
        // For now, use mock API until Convex is properly configured
        const orgData = await getOrganizationByClerkId(organization.id);
        
        if (orgData && orgData.onboardingCompleted) {
          // Onboarding completed, user can access dashboard
          setIsChecking(false);
        } else {
          // New organization or onboarding not completed
          // Stay in onboarding flow
          setIsChecking(false);
        }
      } catch (error) {
        console.log("Using fallback onboarding logic");
        // Fallback: allow access to onboarding
        setIsChecking(false);
      }
      
      setHasChecked(true);
    };

    checkOnboardingStatus();
  }, [organization, hasChecked]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}