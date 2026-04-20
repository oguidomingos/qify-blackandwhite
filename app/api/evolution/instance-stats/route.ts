import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId, userId } = auth();

    if (!orgId && !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({
        totalMessages: 0,
        totalContacts: 0,
        totalChats: 0,
        instanceStatus: "disconnected",
        instanceName: "N/A",
        phoneNumber: "N/A",
        profileName: "N/A",
        lastUpdate: new Date().toISOString(),
        fallback: false,
        message: "Organization not found",
      });
    }

    const stats = await fetchQuery(api.metrics.getInstanceStats, {
      orgId: organization._id,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Instance stats error:", error);
    return NextResponse.json({
      totalMessages: 0,
      totalContacts: 0,
      totalChats: 0,
      instanceStatus: "error",
      instanceName: "N/A",
      phoneNumber: "N/A",
      profileName: "N/A",
      lastUpdate: new Date().toISOString(),
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
