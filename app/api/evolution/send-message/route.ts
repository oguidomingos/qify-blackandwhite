import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { contactId, message } = await request.json();
    if (!contactId || !message) {
      return NextResponse.json({ success: false, error: "contactId and message are required" }, { status: 400 });
    }

    const organization = await fetchQuery(api.organizations.getViewerOrganization, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    if (!organization) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    const account = await fetchQuery(api.wa.getByViewer, {
      clerkOrgId: orgId || undefined,
      userId: userId || undefined,
    });

    const contact = await fetchQuery(api.contacts.getByExternalId, {
      externalId: contactId,
      orgId: organization._id,
    });

    if (!account || !contact) {
      return NextResponse.json({ success: false, error: "WhatsApp account or contact not found" }, { status: 404 });
    }

    const session = await fetchQuery(api.sessions.getActiveByContact, {
      contactId: contact._id,
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
    }

    const payload = {
      number: contactId,
      text: message,
    };

    const response = await fetch(`${account.baseUrl}/message/sendText/${account.instanceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: account.token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    await fetchMutation(api.messages.create, {
      sessionId: session._id,
      contactId: contact._id,
      orgId: organization._id,
      direction: "outbound",
      text: message,
      metadata: {
        whatsappId: data?.key?.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mensagem enviada com sucesso",
      data,
      endpoint: `${account.instanceId}`,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Falha ao enviar mensagem",
    }, { status: 500 });
  }
}
