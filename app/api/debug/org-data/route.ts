import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    // Check for any existing organizations
    const orgs = await convex.query("organizations.list" as any, {});
    
    // Check for business profiles
    const businessProfiles = await convex.query("businessProfiles.list" as any, {});
    
    // Check for agent configurations
    const agentConfigs = await convex.query("agentConfigurations.list" as any, {});

    return NextResponse.json({
      organizations: orgs || [],
      businessProfiles: businessProfiles || [],
      agentConfigurations: agentConfigs || [],
      message: "Data retrieved successfully"
    });

  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      error: "Failed to retrieve data",
      message: error instanceof Error ? error.message : "Unknown error",
      organizations: [],
      businessProfiles: [],
      agentConfigurations: []
    }, { status: 500 });
  }
}