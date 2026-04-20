import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId, userId } = auth();
    if (!clerkOrgId && !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { instanceName, phoneNumber, profileName } = await request.json();
    if (!instanceName) {
      return NextResponse.json({ error: "instanceName is required" }, { status: 400 });
    }

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: clerkOrgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    await fetchMutation(api.wa.upsertAccount, {
      orgId: organization._id,
      instanceId: instanceName,
      instanceName,
      phoneNumber: phoneNumber || "unknown",
      status: "connected",
      baseUrl: (process.env.EVOLUTION_BASE_URL || "").trim(),
      token: process.env.EVOLUTION_API_KEY || "",
      sharedToken: process.env.EVOLUTION_API_KEY || "",
    });

    return NextResponse.json({ success: true, instanceName, orgId: organization._id });
  } catch (error) {
    console.error("save-instance error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { orgId: clerkOrgId, userId } = auth();
    if (!clerkOrgId && !userId) {
      return NextResponse.json({ instanceName: null }, { status: 401 });
    }

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: clerkOrgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ instanceName: null });
    }

    const account = await fetchQuery(api.wa.getByViewer, {
      clerkOrgId: clerkOrgId || undefined,
      userId: userId || undefined,
    }).catch(() => null);

    return NextResponse.json({ instanceName: account?.instanceName || null });
  } catch {
    return NextResponse.json({ instanceName: null });
  }
}
