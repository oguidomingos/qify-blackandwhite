import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function POST(request: Request) {
  try {
    const {
      conversationHistory,
      userMessage,
      contextMessages,
      contactName
    } = await request.json();

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Format WhatsApp conversation context
    const whatsappContext = contextMessages?.slice(-10).map((msg: any) =>
      `[${msg.fromMe ? 'Você' : contactName}]: ${msg.text}`
    ).join('\n') || 'Sem histórico de mensagens';

    // Format voice conversation history
    const voiceHistory = conversationHistory.map((turn: ConversationTurn) =>
      `${turn.role === 'user' ? 'Usuário' : 'Assistente'}: ${turn.content}`
    ).join('\n');

    const prompt = `Você é um assistente de voz inteligente ajudando um usuário a criar uma resposta para um contato do WhatsApp.

CONTEXTO DO WHATSAPP COM ${contactName}:
${whatsappContext}

HISTÓRICO DA CONVERSA POR VOZ:
${voiceHistory}

NOVA MENSAGEM DO USUÁRIO:
${userMessage}

INSTRUÇÕES:
1. Continue a conversa de forma natural e amigável
2. Faça perguntas de esclarecimento se necessário
3. Quando tiver informação suficiente para criar a mensagem final, indique que está pronto
4. A mensagem final deve ser adequada para enviar no WhatsApp

IMPORTANTE:
- Se o usuário deu informações claras sobre o que quer enviar, crie a mensagem final
- Se precisar de mais informações, faça perguntas específicas
- Seja conversacional e natural, como um assistente de voz real

Responda em JSON:
{
  "response": "Sua resposta falada para o usuário",
  "isComplete": true/false,
  "finalMessage": "Mensagem final para WhatsApp (apenas se isComplete for true)",
  "needsClarification": true/false,
  "reasoning": "Breve explicação do seu raciocínio"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('🤖 AI Raw Response:', text);

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let aiResponse = {
      response: "Desculpe, não consegui processar sua mensagem. Pode repetir?",
      isComplete: false,
      finalMessage: null,
      needsClarification: true,
      reasoning: "Failed to parse AI response"
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        aiResponse = {
          response: parsed.response || aiResponse.response,
          isComplete: parsed.isComplete || false,
          finalMessage: parsed.finalMessage || null,
          needsClarification: parsed.needsClarification !== undefined ? parsed.needsClarification : true,
          reasoning: parsed.reasoning || ''
        };
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    console.log('🤖 Parsed AI Response:', aiResponse);

    return NextResponse.json({
      success: true,
      ...aiResponse
    });

  } catch (error) {
    console.error("Voice conversation AI error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      response: "Desculpe, ocorreu um erro. Pode tentar novamente?"
    }, { status: 500 });
  }
}
