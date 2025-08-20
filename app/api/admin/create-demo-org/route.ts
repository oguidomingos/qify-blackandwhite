import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    console.log("Creating demo organization...");
    
    // Create demo organization using the createDemo function
    const result = await convex.mutation("organizations.createDemo" as any, {});
    
    console.log("Demo organization created:", result);

    return NextResponse.json({
      success: true,
      message: "Demo organization created successfully",
      orgId: result.orgId
    });

  } catch (error) {
    console.error("Error creating demo organization:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to create demo organization",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}