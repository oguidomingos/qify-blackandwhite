"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";

// Temporary: Enable Convex for testing the onboarding flow
const ENABLE_CONVEX = true;

const convex = ENABLE_CONVEX ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!) : null;

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  // Return children directly without Convex provider for demo
  if (!ENABLE_CONVEX || !convex) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}