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

    // Build SPIN sessions from chats (each chat = a potential lead)
    const raw: any[] = await evolutionPost(`/chat/findChats/${encodeInstance(instanceName)}`, {
      where: {},
    }).catch(() => []);

    const chats = Array.isArray(raw) ? raw : [];

    // Only individual chats (not groups) are leads
    const leads = chats.filter((c: any) => !c.remoteJid?.endsWith("@g.us"));

    const sessions = leads.map((chat: any) => {
      const ts = new Date(chat.updatedAt || 0).getTime();
      const name = chat.pushName || chat.remoteJid?.split("@")[0] || "Desconhecido";
      const unread = chat.unreadCount || 0;

      // Basic heuristic: window active = advanced, unread = situation stage
      const currentStage = chat.windowActive ? "P" : "S";
      const score = chat.windowActive ? 30 : 10;

      return {
        contactId: chat.remoteJid,
        contactName: name,
        currentStage,
        score,
        qualified: false,
        summary: "",
        lastActivity: ts,
      };
    });

    sessions.sort((a, b) => b.lastActivity - a.lastActivity);

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

    return NextResponse.json({ success: true, sessions, statistics, period: "all", fallback: false });
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
