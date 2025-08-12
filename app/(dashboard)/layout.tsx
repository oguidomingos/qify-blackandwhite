import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import OnboardingChecker from "@/components/onboarding/onboarding-checker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  // Temporary: Allow access for demo purposes
  // In production, uncomment the lines below
  // if (!userId) {
  //   redirect("/sign-in");
  // }

  return (
    <OnboardingChecker>
      <MainLayout>{children}</MainLayout>
    </OnboardingChecker>
  );
}