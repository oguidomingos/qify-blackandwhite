import { NextResponse } from "next/server";
import { getOrgInstance } from "@/lib/get-org-instance";
import { evolutionPost, encodeInstance } from "@/lib/evolution-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { instanceName, error } = await getOrgInstance();

    if (error === "Unauthorized") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const empty = {
      success: true,
      messages: [],
      statistics: { total: 0, inbound: 0, outbound: 0, uniqueContacts: 0, period: "today", timeRange: { from: 0, to: Date.now() } },
      fallback: false,
    };

    if (!instanceName) return NextResponse.json({ ...empty, message: "No instance selected" });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Get chats and extract last messages as "recent messages"
    const raw: any[] = await evolutionPost(`/chat/findChats/${encodeInstance(instanceName)}`, {
      where: {},
    }).catch(() => []);

    const chats = Array.isArray(raw) ? raw : [];

    // Build cutoff from period
    const now = Date.now();
    const cutoff = period === "today" ? now - 86400000
      : period === "week" ? now - 7 * 86400000
      : period === "month" ? now - 30 * 86400000
      : 0;

    const messages: any[] = [];

    for (const chat of chats) {
      const lastMsg = chat.lastMessage;
      if (!lastMsg) continue;

      const ts = new Date(chat.updatedAt || 0).getTime();
      if (ts < cutoff) continue;

      const text = lastMsg.message?.conversation
        || lastMsg.message?.extendedTextMessage?.text
        || lastMsg.message?.imageMessage?.caption
        || "[mídia]";

      messages.push({
        _id: lastMsg.id || `${chat.remoteJid}-last`,
        contactId: chat.remoteJid,
        externalId: chat.remoteJid,
        direction: lastMsg.key?.fromMe ? "outbound" : "inbound",
        text,
        createdAt: ts,
      });
    }

    messages.sort((a, b) => b.createdAt - a.createdAt);
    const sliced = messages.slice(0, limit);

    return NextResponse.json({
      success: true,
      messages: sliced,
      statistics: {
        total: sliced.length,
        inbound: sliced.filter(m => m.direction === "inbound").length,
        outbound: sliced.filter(m => m.direction === "outbound").length,
        uniqueContacts: new Set(sliced.map(m => m.contactId)).size,
        period,
        timeRange: { from: cutoff, to: now },
      },
      fallback: false,
    });
  } catch (error) {
    console.error("Messages route error:", error);
    return NextResponse.json({
      success: false,
      messages: [],
      statistics: { total: 0, inbound: 0, outbound: 0, uniqueContacts: 0, period: "all", timeRange: { from: 0, to: Date.now() } },
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
