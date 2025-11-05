import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ConversationRequest {
  messages: Message[]
  context?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversationRequest = await request.json()
    const { messages, context = "" } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      )
    }

    // Inicializar o modelo Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Criar o sistema de instruções para a IA
    const systemInstruction = `Você é um assistente de vendas inteligente conversando por voz com um vendedor.

SEU OBJETIVO:
Através de uma conversa natural, ajude o vendedor a criar uma mensagem para enviar a um cliente.
A conversa deve ser fluida e natural, como se fosse uma conversa entre colegas de trabalho.

REGRAS DA CONVERSA:
1. Seja BREVE e CONCISO em suas respostas (máximo 2-3 frases)
2. Faça perguntas DIRETAS e ESPECÍFICAS
3. Use linguagem NATURAL e AMIGÁVEL
4. Não repita informações que já foram ditas
5. Vá direto ao ponto

PROCESSO:
1. Cumprimente e pergunte sobre o contexto (quem é o cliente, qual o objetivo)
2. Pergunte detalhes importantes (prazo, valor, necessidades específicas)
3. Confirme se tem todas as informações necessárias
4. Gere uma mensagem profissional baseada na conversa
5. Apresente a mensagem e pergunte se está boa ou se quer ajustar

QUANDO CONCLUIR:
- Quando você tiver informações suficientes para criar a mensagem
- Quando o vendedor confirmar que a mensagem está boa
- Retorne isComplete: true e a mensagem final em finalMessage

EXEMPLO DE CONVERSA:
Vendedor: "Preciso enviar uma mensagem para o João"
IA: "Entendi! Qual é o objetivo dessa mensagem pro João? Proposta, follow-up, ou algo diferente?"

Vendedor: "É uma proposta de consultoria em vendas"
IA: "Legal! Você já conversou com ele antes sobre isso ou é o primeiro contato?"

Continue assim até ter informações suficientes.

CONTEXTO ATUAL DA CONVERSA:
${context || "Início da conversa"}

IMPORTANTE: Suas respostas devem ser CURTAS para serem faladas naturalmente.`

    // Construir histórico da conversa para o Gemini
    const conversationHistory = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }))

    // Iniciar chat com histórico
    const chat = model.startChat({
      history: conversationHistory.slice(0, -1), // Todas menos a última
      generationConfig: {
        maxOutputTokens: 200, // Respostas curtas
        temperature: 0.9,
      },
    })

    // Enviar última mensagem do usuário
    const lastUserMessage = messages[messages.length - 1].content
    const result = await chat.sendMessage(
      systemInstruction + "\n\nUsuário: " + lastUserMessage
    )

    const assistantResponse = result.response.text()

    // Verificar se a conversa está completa
    // Perguntar ao modelo se já pode gerar a mensagem final
    const checkCompletion = await model.generateContent(
      `Baseado nesta conversa, você já tem informações suficientes para gerar uma mensagem para o cliente?

Conversa até agora:
${messages.map((m) => `${m.role === "user" ? "Vendedor" : "IA"}: ${m.content}`).join("\n")}
IA: ${assistantResponse}

Responda APENAS "SIM" ou "NÃO".
Se SIM, também gere a mensagem final profissional que será enviada ao cliente do vendedor (não ao vendedor, mas ao cliente dele).`
    )

    const completionCheck = checkCompletion.response.text().trim()
    const isComplete = completionCheck.toLowerCase().startsWith("sim")

    let finalMessage = ""
    let updatedContext = context

    if (isComplete) {
      // Extrair a mensagem final
      const lines = completionCheck.split("\n")
      finalMessage = lines.slice(1).join("\n").trim()

      // Se não conseguiu extrair, gerar novamente
      if (!finalMessage || finalMessage.length < 20) {
        const generateFinal = await model.generateContent(
          `Baseado nesta conversa entre o vendedor e você:

${messages.map((m) => `${m.role === "user" ? "Vendedor" : "IA"}: ${m.content}`).join("\n")}

Gere UMA mensagem profissional e persuasiva que o VENDEDOR enviará para o CLIENTE DELE.
A mensagem deve ser em formato de WhatsApp, amigável mas profissional.
Não inclua saudações como "Prezado" - use algo mais natural.
Máximo 150 palavras.`
        )
        finalMessage = generateFinal.response.text().trim()
      }

      updatedContext = `Conversa completa. Mensagem final gerada.`
    } else {
      // Atualizar contexto
      const allMessages = [...messages, { role: "assistant" as const, content: assistantResponse }]
      updatedContext = `Conversa em andamento. ${allMessages.length} mensagens trocadas.`
    }

    return NextResponse.json({
      assistantMessage: assistantResponse,
      isComplete,
      finalMessage: isComplete ? finalMessage : undefined,
      context: updatedContext,
    })
  } catch (error) {
    console.error("Error in voice conversation:", error)
    return NextResponse.json(
      { error: "Failed to process conversation", details: String(error) },
      { status: 500 }
    )
  }
}
