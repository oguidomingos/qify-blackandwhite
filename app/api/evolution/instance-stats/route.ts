import { NextResponse } from "next/server";
import { getOrgInstance } from "@/lib/get-org-instance";
import { evolutionGet, evolutionPost, encodeInstance } from "@/lib/evolution-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { instanceName, error } = await getOrgInstance();

    if (error === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!instanceName) {
      return NextResponse.json({
        totalMessages: 0,
        totalContacts: 0,
        totalChats: 0,
        instanceStatus: "not_configured",
        instanceName: "N/A",
        phoneNumber: "N/A",
        profileName: "N/A",
        lastUpdate: new Date().toISOString(),
        fallback: false,
        message: "No instance selected. Go to Settings → WhatsApp to select one.",
      });
    }

    const enc = encodeInstance(instanceName);

    // Get instance info (status + counts) from fetchInstances
    const [instances, chats] = await Promise.all([
      evolutionGet("/instance/fetchInstances").catch(() => []),
      evolutionPost(`/chat/findChats/${enc}`, { where: {} }).catch(() => []),
    ]);

    const inst = Array.isArray(instances)
      ? instances.find((i: any) => i.name === instanceName)
      : null;

    const chatCount = Array.isArray(chats) ? chats.length : 0;
    const msgCount = inst?._count?.Message || 0;
    const contactCount = inst?._count?.Contact || 0;

    return NextResponse.json({
      totalMessages: msgCount,
      totalContacts: contactCount,
      totalChats: chatCount,
      instanceStatus: inst?.connectionStatus === "open" ? "connected" : (inst?.connectionStatus || "unknown"),
      instanceName: inst?.name || instanceName,
      phoneNumber: inst?.number || inst?.ownerJid?.split("@")[0] || "N/A",
      profileName: inst?.profileName || inst?.name || "N/A",
      lastUpdate: new Date().toISOString(),
      fallback: false,
    });
  } catch (error) {
    console.error("Instance stats error:", error);
    return NextResponse.json({
      totalMessages: 0,
      totalContacts: 0,
      totalChats: 0,
      instanceStatus: "error",
      instanceName: "N/A",
      phoneNumber: "N/A",
      profileName: "N/A",
      lastUpdate: new Date().toISOString(),
      fallback: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
