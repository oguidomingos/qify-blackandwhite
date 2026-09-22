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
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    // Build cutoff from period (in Unix seconds, not ms)
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const cutoffSec = period === "today" ? nowSec - 86400
      : period === "week" ? nowSec - 7 * 86400
      : period === "month" ? nowSec - 30 * 86400
      : period === "60d" ? nowSec - 60 * 86400
      : 0;

    // Use /chat/findMessages which returns real historical messages with timestamps
    const where: any = cutoffSec > 0
      ? { messageTimestamp: { gte: cutoffSec } }
      : {};

    const raw: any = await evolutionPost(
      `/chat/findMessages/${encodeInstance(instanceName)}`,
      { where, limit }
    ).catch(() => null);

    const records: any[] = raw?.messages?.records || raw?.records || [];

    const messages = records.map((r: any) => {
      const fromMe = r.key?.fromMe ?? false;
      const remoteJid = r.key?.remoteJid || "";
      const contactId = remoteJid.includes("@")
        ? remoteJid
        : `${remoteJid}@s.whatsapp.net`;
      const text = r.message?.conversation
        || r.message?.extendedTextMessage?.text
        || r.message?.imageMessage?.caption
        || r.message?.videoMessage?.caption
        || "[mídia]";
      const ts = (r.messageTimestamp || 0) * 1000; // convert to ms

      return {
        _id: r.id || r.key?.id || `${contactId}-${r.messageTimestamp}`,
        contactId,
        externalId: remoteJid,
        direction: fromMe ? "outbound" : "inbound",
        text,
        senderName: fromMe ? "Você" : (r.pushName || remoteJid.split("@")[0]),
        createdAt: ts,
      };
    });

    messages.sort((a, b) => b.createdAt - a.createdAt);

    const totalFromApi = raw?.messages?.total ?? messages.length;

    return NextResponse.json({
      success: true,
      messages,
      statistics: {
        total: totalFromApi,
        returned: messages.length,
        inbound: messages.filter(m => m.direction === "inbound").length,
        outbound: messages.filter(m => m.direction === "outbound").length,
        uniqueContacts: new Set(messages.map(m => m.contactId)).size,
        period,
        timeRange: { from: cutoffSec * 1000, to: nowMs },
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
