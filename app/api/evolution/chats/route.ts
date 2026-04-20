import { NextRequest, NextResponse } from "next/server";
import { getOrgInstance } from "@/lib/get-org-instance";
import { evolutionPost, encodeInstance } from "@/lib/evolution-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { instanceName, error } = await getOrgInstance();

    if (error === "Unauthorized") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!instanceName) {
      return NextResponse.json({
        success: true,
        chats: [],
        statistics: { total: 0, active: 0, unread: 0, totalUnreadMessages: 0, groups: 0, individuals: 0 },
        message: "No instance selected",
        source: "evolution",
      });
    }

    const { searchParams } = new URL(request.url);
    const chatType = searchParams.get("chatType") || "all";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const raw: any[] = await evolutionPost(`/chat/findChats/${encodeInstance(instanceName)}`, {
      where: {},
    });

    let chats = Array.isArray(raw) ? raw : [];

    // Apply chatType filter
    if (chatType === "group") {
      chats = chats.filter((c: any) => c.remoteJid?.endsWith("@g.us"));
    } else if (chatType === "individual") {
      chats = chats.filter((c: any) => !c.remoteJid?.endsWith("@g.us"));
    }

    // Sort by most recent activity
    chats.sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    chats = chats.slice(0, limit);

    const mapped = chats.map((c: any) => {
      const isGroup = c.remoteJid?.endsWith("@g.us");
      const lastMsg = c.lastMessage;
      const msgText = lastMsg?.message?.conversation
        || lastMsg?.message?.extendedTextMessage?.text
        || lastMsg?.message?.imageMessage?.caption
        || "[mídia]";

      return {
        _id: c.id || c.remoteJid,
        contactId: c.remoteJid,
        contactName: c.pushName || c.remoteJid?.split("@")[0] || "Desconhecido",
        unreadCount: c.unreadCount || 0,
        lastMessage: {
          text: msgText,
          timestamp: new Date(c.updatedAt || 0).getTime(),
          direction: lastMsg?.key?.fromMe ? "outbound" : "inbound",
        },
        isActive: c.windowActive || false,
        lastActivityAt: new Date(c.updatedAt || 0).getTime(),
        isGroup,
      };
    });

    const statistics = {
      total: mapped.length,
      active: mapped.filter((c: any) => c.isActive).length,
      unread: mapped.filter((c: any) => c.unreadCount > 0).length,
      totalUnreadMessages: mapped.reduce((s: number, c: any) => s + c.unreadCount, 0),
      groups: mapped.filter((c: any) => c.isGroup).length,
      individuals: mapped.filter((c: any) => !c.isGroup).length,
    };

    return NextResponse.json({ success: true, chats: mapped, statistics, source: "evolution" });
  } catch (error) {
    console.error("Chats route error:", error);
    return NextResponse.json({
      success: false,
      chats: [],
      statistics: { total: 0, active: 0, unread: 0, totalUnreadMessages: 0, groups: 0, individuals: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
