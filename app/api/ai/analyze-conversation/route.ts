import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { messages, contactName, conversationSummary } = await request.json();

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Format messages for context
    const messageHistory = messages.map((msg: any) =>
      `[${msg.fromMe ? 'Você' : contactName}]: ${msg.text}`
    ).join('\n');

    const prompt = `Você é um assistente de vendas e relacionamento com clientes via WhatsApp.

Analise esta conversa e forneça um resumo em voz natural, como se estivesse conversando comigo:

CONTATO: ${contactName}

HISTÓRICO DA CONVERSA (últimas mensagens):
${messageHistory}

${conversationSummary ? `\nRESUMO ANTERIOR:\n${conversationSummary}` : ''}

Por favor, me diga em um parágrafo curto (máximo 3 frases):
1. Sobre o que o contato está falando
2. Qual foi a última interação
3. O que pode ser uma boa próxima resposta

Fale de forma natural e conversacional, como se estivesse me explicando rapidamente.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();

    return NextResponse.json({
      success: true,
      summary: summary,
      messageCount: messages.length,
      contactName: contactName
    });

  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
