import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { messages, contactName, userInstruction } = await request.json();

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Format messages for context
    const messageHistory = messages.slice(-10).map((msg: any) =>
      `[${msg.fromMe ? 'Você' : contactName}]: ${msg.text}`
    ).join('\n');

    const prompt = `Você é um assistente de vendas e relacionamento com clientes via WhatsApp.

CONTATO: ${contactName}

ÚLTIMAS MENSAGENS:
${messageHistory}

INSTRUÇÃO DO USUÁRIO:
"${userInstruction}"

Gere 2 opções de resposta profissionais e amigáveis baseadas na instrução do usuário.
As respostas devem ser:
- Naturais e conversacionais
- Adequadas ao contexto da conversa
- Profissionais mas amigáveis
- Diretas ao ponto

Retorne no formato JSON:
{
  "suggestions": [
    "Primeira sugestão de resposta",
    "Segunda sugestão de resposta"
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let suggestions = ["Resposta padrão 1", "Resposta padrão 2"];

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || suggestions;
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
      userInstruction: userInstruction
    });

  } catch (error) {
    console.error("AI suggestion error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
