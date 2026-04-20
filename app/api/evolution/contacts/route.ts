import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ success: false, contacts: [], total: 0, retrieved: 0, fallback: false }, { status: 404 });
    }

    const contacts = await fetchQuery(api.contacts.listByOrg, {
      orgId: organization._id,
      limit,
    });

    return NextResponse.json({
      success: true,
      contacts: contacts.map((contact) => ({
        _id: contact._id,
        name: contact.name || contact.externalId.split("@")[0],
        channel: contact.channel,
        externalId: contact.externalId,
        phoneNumber: contact.externalId.split("@")[0],
        profilePicUrl: null,
        lastMessageAt: contact.lastMessageAt,
        createdAt: contact.createdAt,
        isActive: true,
        metadata: {
          remoteJid: contact.externalId,
        },
      })),
      total: contacts.length,
      retrieved: contacts.length,
      fallback: false,
      source: "convex",
    });
  } catch (error) {
    console.error("Contacts route error:", error);
    return NextResponse.json({
      success: false,
      contacts: [],
      total: 0,
      retrieved: 0,
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Erro crítico no sistema",
    }, { status: 500 });
  }
}
