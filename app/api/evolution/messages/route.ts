import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

function getTimeFilter(period: string) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  switch (period) {
    case "today":
      return now - oneDay;
    case "week":
      return now - oneWeek;
    case "month":
      return now - oneMonth;
    default:
      return 0;
  }
}

export async function GET(request: Request) {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const contactId = searchParams.get("contactId") || undefined;

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({
        success: false,
        messages: [],
        statistics: {
          total: 0,
          inbound: 0,
          outbound: 0,
          uniqueContacts: 0,
          period,
          timeRange: { from: getTimeFilter(period), to: Date.now() },
        },
        fallback: false,
        message: "Organization not found",
      }, { status: 404 });
    }

    const messages = await fetchQuery(api.messages.listForOrg, {
      orgId: organization._id,
      limit,
      period,
      contactExternalId: contactId,
    });

    return NextResponse.json({
      success: true,
      messages,
      statistics: {
        total: messages.length,
        inbound: messages.filter((message) => message.direction === "inbound").length,
        outbound: messages.filter((message) => message.direction === "outbound").length,
        uniqueContacts: new Set(messages.map((message) => message.externalId || message.contactId)).size,
        period,
        timeRange: { from: getTimeFilter(period), to: Date.now() },
      },
      fallback: false,
    });
  } catch (error) {
    console.error("Messages route error:", error);
    return NextResponse.json({
      success: false,
      messages: [],
      statistics: {
        total: 0,
        inbound: 0,
        outbound: 0,
        uniqueContacts: 0,
        period: "all",
        timeRange: { from: 0, to: Date.now() },
      },
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Erro crítico no sistema",
    }, { status: 500 });
  }
}
