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
    const contactId = searchParams.get("contactId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required", message: "Por favor forneça o ID do contato" }, { status: 400 });
    }

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const conversation = await fetchQuery(api.messages.getConversationByExternalId, {
      orgId: organization._id,
      externalId: contactId,
      limit,
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, conversation, source: "convex" });
  } catch (error) {
    console.error("Conversation route error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error", message: "Erro crítico no sistema" }, { status: 500 });
  }
}
