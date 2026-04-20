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

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    if (!instanceName) {
      return NextResponse.json({ success: false, message: "No instance selected" }, { status: 404 });
    }

    // Get the chat for this contact from findChats
    const raw: any[] = await evolutionPost(`/chat/findChats/${encodeInstance(instanceName)}`, {
      where: {},
    }).catch(() => []);

    const chats = Array.isArray(raw) ? raw : [];
    const chat = chats.find((c: any) => c.remoteJid === contactId || c.remoteJid?.startsWith(contactId));

    if (!chat) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const lastMsg = chat.lastMessage;
    const msgText = lastMsg?.message?.conversation
      || lastMsg?.message?.extendedTextMessage?.text
      || lastMsg?.message?.imageMessage?.caption
      || "[mídia]";
    const ts = new Date(chat.updatedAt || 0).getTime();
    const fromMe = lastMsg?.key?.fromMe || false;

    const message = {
      _id: lastMsg?.id || `${contactId}-last`,
      contactId,
      direction: fromMe ? "outbound" : "inbound",
      text: msgText,
      messageType: "conversation",
      timestamp: ts,
      senderName: fromMe ? "Você" : (chat.pushName || contactId.split("@")[0]),
      fromMe,
    };

    const conversation = {
      contactId,
      contactName: chat.pushName || contactId.split("@")[0] || "Desconhecido",
      phoneNumber: contactId.replace("@s.whatsapp.net", "").replace("@g.us", ""),
      totalMessages: 1,
      messages: [message],
      recentMessages: [message],
      statistics: {
        total: 1,
        inbound: fromMe ? 0 : 1,
        outbound: fromMe ? 1 : 0,
        lastMessageAt: ts,
        lastMessageDirection: fromMe ? "outbound" : "inbound",
      },
      lastMessage: message,
    };

    return NextResponse.json({ success: true, conversation, source: "evolution" });
  } catch (error) {
    console.error("Conversation route error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
