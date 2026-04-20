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
    const chatType = searchParams.get("chatType") || "all";

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ success: false, chats: [], statistics: { total: 0, active: 0, unread: 0, totalUnreadMessages: 0, groups: 0, individuals: 0 } }, { status: 404 });
    }

    const inbox = await fetchQuery(api.sessions.getInboxChats, {
      orgId: organization._id,
      chatType,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...inbox,
      source: "convex",
    });
  } catch (error) {
    console.error("Chats route error:", error);
    return NextResponse.json({
      success: false,
      chats: [],
      statistics: { total: 0, active: 0, unread: 0, totalUnreadMessages: 0, groups: 0, individuals: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Erro crítico no inbox",
    }, { status: 500 });
  }
}
