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

    const clerkOrgId = orgId || userId || undefined;
    const agentConfig = await fetchQuery(api.agentConfigurations.getByOrg, {
      clerkOrgId,
    });

    return NextResponse.json({
      phoneNumber: agentConfig?.phoneNumber || null,
    });
  } catch (error) {
    return NextResponse.json({ phoneNumber: null, error: String(error) }, { status: 500 });
  }
}
