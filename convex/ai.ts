import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const generateAiReply = internalAction({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx: any, { orgId, sessionId }: any) => {
    try {
      // Get session data
      const session = await ctx.runQuery(internal.sessions.getById, { sessionId });
      if (!session) {
        throw new Error("Session not found");
      }

      // Get recent messages
      const messages = await ctx.runQuery(internal.messages.listBySession, { 
        sessionId,
        limit: 10,
      });

      // Get active AI prompt
      const prompt = await ctx.runQuery(internal.ai.queryActivePrompt, {
        orgId,
        kind: "spin_sdr",
      });

      if (!prompt) {
        console.log("No active prompt found, using default");
      }

      // Build conversation context for Gemini
      const conversationContext = buildSpinConversation(messages, session, prompt);

      // Call Gemini API
      const response = await callGemini(conversationContext);

      if (!response) {
        throw new Error("No response from Gemini");
      }

      // Get contact info for sending message
      const contact = await ctx.runQuery(internal.contacts.getById, {
        contactId: session.contactId,
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      // Insert outbound message
      await ctx.runMutation(internal.messages.insertOutbound, {
        orgId,
        sessionId,
        contactId: session.contactId,
        text: response,
      });

      // Send via WhatsApp
      await ctx.runAction(internal.wa.sendMessage, {
        orgId,
        to: contact.externalId,
        text: response,
      });

      // Update session with AI insights
      await updateSessionFromResponse(ctx, sessionId, response, session);

    } catch (error) {
      console.error("Error generating AI reply:", error);
      throw error;
    }
  },
});

export const queryActivePrompt = internalQuery({
  args: {
    orgId: v.id("organizations"),
    kind: v.string(),
  },
  handler: async (ctx: any, { orgId, kind }: any) => {
    return await ctx.db
      .query("ai_prompts")
      .withIndex("by_org_kind_active", (q: any) => 
        q.eq("orgId", orgId).eq("kind", kind).eq("active", true)
      )
      .first();
  },
});

function buildSpinConversation(messages: any[], session: any, prompt: any) {
  const systemPrompt = prompt?.content || getDefaultSpinPrompt();
  
  const conversationHistory = messages
    .map((msg: any) => `${msg.direction === "inbound" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n");

  const spinContext = session.variables.spin ? `
Current SPIN stage: ${session.variables.spin.stage}
Score: ${session.variables.spin.score}/100
Situation answers: ${session.variables.spin.situation.answers.join(", ")}
Problem answers: ${session.variables.spin.problem.answers.join(", ")}
Implication answers: ${session.variables.spin.implication.answers.join(", ")}
Need/Payoff answers: ${session.variables.spin.needPayoff.answers.join(", ")}
` : "";

  return {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}

${spinContext}

Conversation history:
${conversationHistory}

Generate an appropriate response following the SPIN selling methodology. Focus on the current stage and try to advance the conversation naturally.`
          }
        ]
      }
    ]
  };
}

async function callGemini(conversationContext: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(conversationContext),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response from Gemini API");
  }

  return data.candidates[0].content.parts[0].text;
}

async function updateSessionFromResponse(ctx: any, sessionId: string, response: string, session: any) {
  // Simple keyword-based analysis to update SPIN score and stage
  const keywords = {
    situation: ["current", "now", "currently", "situation", "how", "what"],
    problem: ["problem", "issue", "challenge", "difficulty", "trouble"],
    implication: ["impact", "affect", "consequence", "result", "lead to"],
    need: ["need", "want", "solution", "help", "improve"],
  };

  let updatedVariables = session.variables;
  
  // Analyze response for stage progression
  const responseWords = response.toLowerCase().split(/\s+/);
  
  // Update score based on keyword matches
  let scoreBonus = 0;
  Object.entries(keywords).forEach(([stage, words]) => {
    const matches = words.filter((word: string) => responseWords.includes(word)).length;
    if (matches > 0) {
      scoreBonus += matches * 5;
    }
  });

  if (updatedVariables.spin) {
    updatedVariables.spin.score = Math.min(100, updatedVariables.spin.score + scoreBonus);
  }

  await ctx.runMutation(internal.sessions.updateVariables, {
    sessionId,
    variables: updatedVariables,
  });
}

function getDefaultSpinPrompt(): string {
  return `You are an expert SDR (Sales Development Representative) using the SPIN selling methodology. Your goal is to qualify leads through strategic questioning.

SPIN Framework:
- Situation: Understand the prospect's current situation
- Problem: Identify problems/pain points
- Implication: Explore consequences of not solving the problem
- Need-payoff: Help prospect realize the value of a solution

Guidelines:
- Ask one question at a time
- Listen actively and build on responses
- Be conversational and natural
- Progress through SPIN stages logically
- Qualify budget, authority, need, and timeline
- Keep responses concise (2-3 sentences max)
- Use Brazilian Portuguese
- Be professional but friendly`;
}