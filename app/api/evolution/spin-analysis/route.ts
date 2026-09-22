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
      sessions: [],
      statistics: { totalSessions: 0, qualified: 0, stageDistribution: { S: 0, P: 0, I: 0, N: 0 }, averageScore: 0 },
      period: "all",
      fallback: false,
    };

    if (!instanceName) return NextResponse.json({ ...empty, message: "No instance selected" });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";

    const nowSec = Math.floor(Date.now() / 1000);
    const cutoffSec = period === "today" ? nowSec - 86400
      : period === "week" ? nowSec - 7 * 86400
      : period === "month" ? nowSec - 30 * 86400
      : period === "60d" ? nowSec - 60 * 86400
      : 0;

    // Get chats to find individual conversations
    const rawChats: any[] = await evolutionPost(`/chat/findChats/${encodeInstance(instanceName)}`, {
      where: {},
    }).catch(() => []);

    const chats = Array.isArray(rawChats) ? rawChats : [];
    const leads = chats.filter((c: any) => !c.remoteJid?.endsWith("@g.us"));

    // Get actual messages for better SPIN scoring
    const where: any = cutoffSec > 0 ? { messageTimestamp: { gte: cutoffSec } } : {};
    const rawMsgs: any = await evolutionPost(
      `/chat/findMessages/${encodeInstance(instanceName)}`,
      { where, limit: 500 }
    ).catch(() => null);

    const allMessages: any[] = rawMsgs?.messages?.records || rawMsgs?.records || [];

    // Group messages by contact
    const msgsByContact = new Map<string, any[]>();
    for (const msg of allMessages) {
      const jid = msg.key?.remoteJid || "";
      const contactId = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
      if (!msgsByContact.has(contactId)) msgsByContact.set(contactId, []);
      msgsByContact.get(contactId)!.push(msg);
    }

    // Build SPIN sessions from chats
    const sessions = leads.map((chat: any) => {
      const ts = new Date(chat.updatedAt || 0).getTime();
      if (cutoffSec > 0 && ts < cutoffSec * 1000) return null;

      const name = chat.pushName || chat.remoteJid?.split("@")[0] || "Desconhecido";
      const contactId = chat.remoteJid?.includes("@")
        ? chat.remoteJid
        : `${chat.remoteJid}@s.whatsapp.net`;

      const contactMsgs = msgsByContact.get(contactId) || [];
      const msgCount = contactMsgs.length;
      const inboundMsgs = contactMsgs.filter((m: any) => !m.key?.fromMe);
      const hasResponse = inboundMsgs.length > 0;

      // SPIN scoring heuristic based on conversation depth
      let currentStage: "S" | "P" | "I" | "N" = "S";
      let score = 5;

      if (msgCount >= 10 && hasResponse) {
        currentStage = "N";
        score = 80;
      } else if (msgCount >= 6 && hasResponse) {
        currentStage = "I";
        score = 60;
      } else if (msgCount >= 3 && hasResponse) {
        currentStage = "P";
        score = 40;
      } else if (chat.windowActive || hasResponse) {
        currentStage = "P";
        score = 20;
      }

      const qualified = score >= 70;

      return {
        contactId,
        contactName: name,
        currentStage,
        score,
        qualified,
        messageCount: msgCount,
        inboundCount: inboundMsgs.length,
        summary: "",
        lastActivity: ts,
      };
    }).filter(Boolean);

    sessions.sort((a: any, b: any) => b.lastActivity - a.lastActivity);

    const statistics = {
      totalSessions: sessions.length,
      qualified: sessions.filter((s: any) => s.qualified).length,
      stageDistribution: {
        S: sessions.filter((s: any) => s.currentStage === "S").length,
        P: sessions.filter((s: any) => s.currentStage === "P").length,
        I: sessions.filter((s: any) => s.currentStage === "I").length,
        N: sessions.filter((s: any) => s.currentStage === "N").length,
      },
      averageScore: sessions.length > 0
        ? Math.round(sessions.reduce((s: number, sess: any) => s + sess.score, 0) / sessions.length)
        : 0,
    };

    return NextResponse.json({ success: true, sessions, statistics, period, fallback: false });
  } catch (error) {
    console.error("SPIN analysis route error:", error);
    return NextResponse.json({
      success: false,
      sessions: [],
      statistics: { totalSessions: 0, qualified: 0, stageDistribution: { S: 0, P: 0, I: 0, N: 0 }, averageScore: 0 },
      period: "all",
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
