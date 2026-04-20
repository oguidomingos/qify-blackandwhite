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
    const period = searchParams.get("period") || "week";

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ success: false, sessions: [], statistics: { totalSessions: 0, qualified: 0, stageDistribution: { S: 0, P: 0, I: 0, N: 0 }, averageScore: 0 }, period, fallback: false }, { status: 404 });
    }

    const sessions = await fetchQuery(api.sessions.listSpin, { orgId: organization._id });
    const filtered = contactId
      ? sessions.filter((session) => session.externalId === contactId)
      : sessions;

    const normalizeStage = (stage?: string | null) => {
      switch (stage) {
        case "problem":
          return "P";
        case "implication":
          return "I";
        case "needPayoff":
        case "need":
          return "N";
        case "situation":
        default:
          return "S";
      }
    };

    const normalizedSessions = filtered.map((session) => ({
      contactId: session.externalId || String(session.contactId),
      contactName: session.contactName,
      currentStage: normalizeStage(session.spinStage),
      score: session.score,
      stageProgression: [],
      lastActivity: session.lastActivityAt,
      totalMessages: 0,
      qualified: session.qualified,
      summary: session.summary || "",
    }));

    if (contactId) {
      return NextResponse.json({ success: true, session: normalizedSessions[0] || null, contactId });
    }

    const statistics = {
      totalSessions: normalizedSessions.length,
      qualified: normalizedSessions.filter((session) => session.qualified).length,
      stageDistribution: {
        S: normalizedSessions.filter((session) => session.currentStage === "S").length,
        P: normalizedSessions.filter((session) => session.currentStage === "P").length,
        I: normalizedSessions.filter((session) => session.currentStage === "I").length,
        N: normalizedSessions.filter((session) => session.currentStage === "N").length,
      },
      averageScore: normalizedSessions.length > 0
        ? Math.round(normalizedSessions.reduce((sum, session) => sum + session.score, 0) / normalizedSessions.length)
        : 0,
    };

    return NextResponse.json({
      success: true,
      sessions: normalizedSessions,
      statistics,
      period,
      fallback: false,
    });
  } catch (error) {
    console.error("SPIN analysis route error:", error);
    return NextResponse.json({
      success: false,
      sessions: [],
      statistics: { totalSessions: 0, qualified: 0, stageDistribution: { S: 0, P: 0, I: 0, N: 0 }, averageScore: 0 },
      period: "week",
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Erro crítico na análise SPIN",
    }, { status: 500 });
  }
}
