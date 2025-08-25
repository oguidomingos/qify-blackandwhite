import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log('Debug - Auth data:', { userId, orgId });

    // Get organization
    const organization = await convex.query(api.organizations.getByClerkId, {
      clerkId: orgId || userId
    });

    console.log('Debug - Organization:', organization);

    if (!organization) {
      return NextResponse.json({
        error: "Organização não encontrada",
        authData: { userId, orgId }
      }, { status: 404 });
    }

    // Get all related data
    const [contacts, messages, sessions, aiConfig, prompts] = await Promise.all([
      convex.query(api.contacts.listByOrg, { orgId: organization._id }),
      convex.query(api.messages.listRecent, { orgId: organization._id, limit: 10 }),
      convex.query(api.sessions.listByOrg, { orgId: organization._id }),
      convex.query("aiConfigurations:getByOrg", { orgId: organization._id }),
      convex.query("aiPrompts:getFullPrompt", { orgId: organization._id })
    ]);

    console.log('Debug - Data found:', {
      contacts: contacts?.length || 0,
      messages: messages?.messages?.length || 0,
      sessions: sessions?.length || 0,
      hasAiConfig: !!aiConfig,
      hasPrompts: !!prompts
    });

    return NextResponse.json({
      success: true,
      debug: {
        authData: { userId, orgId },
        organization: {
          id: organization._id,
          name: organization.name,
          clerkOrgId: organization.clerkOrgId
        },
        data: {
          contacts: contacts?.length || 0,
          messages: messages?.messages?.length || 0,
          sessions: sessions?.length || 0,
          recentMessages: messages?.messages?.slice(0, 3) || []
        },
        config: {
          aiConfig: aiConfig ? {
            batchingDelayMs: aiConfig.batchingDelayMs,
            maxMessagesContext: aiConfig.maxMessagesContext
          } : null,
          hasCustomPrompt: !!prompts?.userPrompt && prompts.userPrompt !== prompts.systemMessage
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro interno",
      debug: true
    }, { status: 500 });
  }
}