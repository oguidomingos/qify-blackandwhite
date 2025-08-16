import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const generateAiReply = action({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx: any, { orgId, sessionId }: any) => {
    try {
      // Check and set processing lock with batching logic
      const shouldProcess = await ctx.runMutation(internal.sessions.checkAndSetProcessing, {
        sessionId
      });
      
      if (!shouldProcess) {
        console.log('Skipping AI processing - already being processed or in cooldown');
        return { skipped: true, reason: "batching_or_cooldown" };
      }

      // Wait for potential additional messages (batching delay)
      console.log('Waiting 3 seconds for message batching...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get session data
      const session = await ctx.runQuery(internal.sessions.getById, { sessionId });
      if (!session) {
        throw new Error("Session not found");
      }

      // Get ALL messages for better context (increased from 10 to 20)
      const messages = await ctx.runQuery(internal.messages.listBySession, { 
        sessionId,
        limit: 20,
      });

      console.log(`Processing AI reply for session ${sessionId} with ${messages.length} messages in context`);

      // Get full prompt (system message + user methodology)
      const promptData = await ctx.runQuery("aiPrompts:getFullPrompt", {
        orgId,
      });

      if (!promptData) {
        console.log("No prompt data found, using default");
      } else {
        console.log("Using custom prompt data from database");
      }

      // Build enhanced conversation context with better memory
      const conversationContext = buildEnhancedSpinConversation(messages, session, promptData);

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

      // Update session with AI insights and reset processing lock
      await updateSessionFromResponse(ctx, sessionId, response, session);
      
      // Reset processing lock
      await ctx.runMutation(internal.sessions.resetProcessing, {
        sessionId
      });
      
      console.log(`AI reply completed for session ${sessionId}: "${response.substring(0, 100)}..."`);

    } catch (error) {
      console.error("Error generating AI reply:", error);
      
      // Reset processing lock on error
      try {
        await ctx.runMutation(internal.sessions.resetProcessing, {
          sessionId
        });
      } catch (resetError) {
        console.error("Error resetting processing lock:", resetError);
      }
      
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

function buildEnhancedSpinConversation(messages: any[], session: any, promptData: any) {
  const systemPrompt = promptData?.fullPrompt || getDefaultSpinPrompt();
  
  // Analyze collected information from messages
  const userResponses = messages
    .filter(msg => msg.direction === "inbound")
    .map(msg => msg.text);
  
  const assistantResponses = messages
    .filter(msg => msg.direction === "outbound")
    .map(msg => msg.text);

  // Extract collected data from user responses
  const collectedInfo = analyzeCollectedData(userResponses);
  console.log('Collected info analysis:', JSON.stringify(collectedInfo));
  console.log('User responses:', JSON.stringify(userResponses));
  
  // Build conversation history with clear separation
  const conversationHistory = messages
    .map((msg: any, index: number) => {
      const timestamp = new Date(msg.createdAt).toLocaleTimeString('pt-BR');
      const role = msg.direction === "inbound" ? "👤 CLIENTE" : "🤖 ASSISTENTE";
      return `${index + 1}. [${timestamp}] ${role}: ${msg.text}`;
    })
    .join("\n");

  // Analyze conversation patterns to avoid repetition
  const recentResponses = assistantResponses.slice(-3);
  const previousQuestions = extractQuestions(recentResponses);
  const previousPhrases = extractKeyPhrases(recentResponses);
  
  // Check if this is a new conversation
  const isFirstInteraction = messages.length <= 1;
  const hasName = collectedInfo.name.length > 0;
  const hasPersonType = collectedInfo.personType.length > 0;
  const hasBusinessInfo = collectedInfo.business.length > 0;

  let contextInstructions = "";
  
  if (isFirstInteraction) {
    contextInstructions = `
🆕 PRIMEIRA INTERAÇÃO:
- Cumprimente de forma calorosa e profissional
- Inicie coleta do NOME COMPLETO
- Uma pergunta por vez
- Seja natural e empático
`;
  } else {
    contextInstructions = `
📊 DADOS JÁ COLETADOS:
${collectedInfo.name.length > 0 ? `✅ Nome: ${collectedInfo.name.join(', ')}` : '❌ Nome: NÃO COLETADO'}
${collectedInfo.personType.length > 0 ? `✅ Tipo de Pessoa: ${collectedInfo.personType.join(', ')}` : '❌ Tipo pessoa (física/jurídica): NÃO COLETADO'}
${collectedInfo.business.length > 0 ? `✅ Negócio/Empresa: ${collectedInfo.business.join(', ')}` : '❌ Empresa/Negócio: NÃO COLETADO'}
${collectedInfo.contact.length > 0 ? `✅ Contato: ${collectedInfo.contact.join(', ')}` : '❌ Contato adicional: NÃO COLETADO'}

🚨 REGRAS CRÍTICAS - LEIA COM ATENÇÃO:
- NUNCA repita perguntas sobre dados já coletados acima
- Se já informou ser "pessoa jurídica" ou "represento empresa", NÃO pergunte novamente
- Se já mencionou empresa (ex: Iceberg), passe para próxima etapa
- SEMPRE use as informações coletadas para personalizar a conversa
- OLHE OS DADOS COLETADOS ACIMA antes de fazer qualquer pergunta

📝 SUAS ÚLTIMAS PERGUNTAS/RESPOSTAS:
${recentResponses.slice(-2).map((resp, i) => `${i + 1}. ${resp}`).join('\n')}

⚠️ EVITE REPETIR:
- Perguntas: ${previousQuestions.slice(0, 3).join(' | ')}
- Frases: ${previousPhrases.slice(0, 3).join(' | ')}

🎯 PRÓXIMA AÇÃO:
${!hasPersonType ? "Coletar se é PESSOA FÍSICA ou JURÍDICA" : 
  hasPersonType && !hasBusinessInfo ? "Cliente já disse ser pessoa jurídica - PERGUNTAR SOBRE NECESSIDADE/PROBLEMA específico" : 
  "Cliente já informou empresa - INICIAR QUALIFICAÇÃO SPIN sobre a necessidade específica"}
`;
  }

  return {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}

${contextInstructions}

📞 HISTÓRICO COMPLETO DA CONVERSA:
${conversationHistory}

🎯 GERE SUA PRÓXIMA RESPOSTA:
- Use os dados já coletados
- NÃO repita perguntas respondidas
- Avance logicamente na metodologia
- Seja natural e empático
- Máximo 2-3 frases`
          }
        ]
      }
    ]
  };
}

function analyzeCollectedData(userResponses: string[]) {
  const info = {
    name: [] as string[],
    business: [] as string[],
    contact: [] as string[],
    personType: [] as string[] // física/jurídica
  };

  userResponses.forEach(response => {
    const text = response.toLowerCase();
    const originalResponse = response.trim();
    
    // Detect person type (física/jurídica)
    if (/(pessoa\s+(física|juridica|jurídica)|física|jurídica|pj|pf|represento|empresa|iceberg)/i.test(originalResponse)) {
      info.personType.push(originalResponse);
    }
    
    // Detect names (simple heuristic) - but exclude business-related responses
    if (/^[a-záêçõúíó\s]{2,30}$/i.test(originalResponse) && 
        originalResponse.split(' ').length >= 1 && 
        originalResponse.split(' ').length <= 4 &&
        !/(sim|não|ok|tudo|bem|oi|olá|empresa|negócio|pessoa|física|jurídica|represento|sou)/i.test(text)) {
      info.name.push(originalResponse);
    }
    
    // Detect business/company info - expanded patterns
    if (/(empresa|negócio|trabalho|atuo|sou|faço|vendo|presto|serviço|represento|iceberg|ltda|ltd|s\.a\.|sa|mei)/i.test(text)) {
      info.business.push(originalResponse);
    }
    
    // Detect contact info
    if (/(whatsapp|telefone|email|contato|\@|\.com)/i.test(text)) {
      info.contact.push(originalResponse);
    }
  });

  // Remove duplicates
  info.name = [...new Set(info.name)];
  info.business = [...new Set(info.business)];
  info.contact = [...new Set(info.contact)];
  info.personType = [...new Set(info.personType)];

  return info;
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
  // Enhanced session context management
  const keywords = {
    situation: ["nome", "empresa", "negócio", "trabalha", "atua", "ramo", "situação", "atual"],
    problem: ["problema", "dificuldade", "desafio", "issue", "trouble", "complicação"],
    implication: ["impacto", "afeta", "consequência", "resultado", "prejudica", "atrapalha"],
    need: ["precisa", "necessita", "solução", "ajuda", "melhorar", "resolver"],
  };

  let updatedVariables = { ...session.variables };
  
  // Initialize SPIN structure if not exists
  if (!updatedVariables.spin) {
    updatedVariables.spin = {
      situation: { answers: [], completed: false, lastAt: Date.now() },
      problem: { answers: [], completed: false, lastAt: Date.now() },
      implication: { answers: [], completed: false, lastAt: Date.now() },
      needPayoff: { answers: [], completed: false, lastAt: Date.now() },
      score: 0,
      stage: "situation",
      summary: ""
    };
  }

  // Analyze response content for stage progression
  const responseWords = response.toLowerCase().split(/\s+/);
  const now = Date.now();
  
  // Determine current stage based on keywords and context
  let detectedStage = updatedVariables.spin.stage;
  let stageProgressed = false;
  
  // Check for data collection questions
  if (response.includes("nome") || response.includes("empresa") || response.includes("negócio")) {
    detectedStage = "situation";
    updatedVariables.spin.situation.lastAt = now;
  } else if (keywords.problem.some(word => responseWords.includes(word))) {
    detectedStage = "problem";
    updatedVariables.spin.problem.lastAt = now;
    stageProgressed = true;
  } else if (keywords.implication.some(word => responseWords.includes(word))) {
    detectedStage = "implication";
    updatedVariables.spin.implication.lastAt = now;
    stageProgressed = true;
  } else if (keywords.need.some(word => responseWords.includes(word))) {
    detectedStage = "needPayoff";
    updatedVariables.spin.needPayoff.lastAt = now;
    stageProgressed = true;
  }

  // Update stage and score
  updatedVariables.spin.stage = detectedStage;
  
  if (stageProgressed) {
    updatedVariables.spin.score = Math.min(100, updatedVariables.spin.score + 15);
  } else {
    updatedVariables.spin.score = Math.min(100, updatedVariables.spin.score + 5);
  }

  // Update conversation summary
  updatedVariables.spin.summary = `Última resposta: ${response.substring(0, 100)}... (Etapa: ${detectedStage})`;

  console.log(`Session updated - Stage: ${detectedStage}, Score: ${updatedVariables.spin.score}`);

  await ctx.runMutation(internal.sessions.updateVariables, {
    sessionId,
    variables: updatedVariables,
  });
}

function getDefaultSpinPrompt(): string {
  return `Você é um SDR (Sales Development Representative) especialista usando a metodologia SPIN selling. Seu objetivo é qualificar leads através de perguntas estratégicas.

Framework SPIN:
- Situação: Entender a situação atual do prospect
- Problema: Identificar problemas/dores
- Implicação: Explorar consequências de não resolver o problema
- Necessidade: Ajudar o prospect a perceber o valor de uma solução

DIRETRIZES CRÍTICAS:
- Faça UMA pergunta por vez
- Escute ativamente e construa sobre as respostas
- Seja conversacional e natural
- Progrida através das etapas SPIN logicamente
- Qualifique orçamento, autoridade, necessidade e cronograma
- Mantenha respostas concisas (máximo 2-3 frases)
- Use português brasileiro
- Seja profissional mas amigável

REGRAS PARA EVITAR REPETIÇÃO:
- NUNCA repita a mesma pergunta
- NUNCA use frases idênticas ou similares
- SEMPRE varie a forma de perguntar
- Se o cliente não respondeu, reformule a pergunta de forma completamente diferente
- Use sinônimos e estruturas diferentes
- Adapte o tom baseado nas respostas anteriores
- Mantenha o fluxo natural da conversa sem ser robótico`;
}

function extractQuestions(responses: string[]): string[] {
  const questions: string[] = [];
  responses.forEach(response => {
    // Extract sentences ending with ? or containing question words
    const sentences = response.split(/[.!?]/);
    sentences.forEach(sentence => {
      if (sentence.includes('?') || 
          /\b(que|qual|quando|onde|como|por que|poderia|gostaria)\b/i.test(sentence)) {
        const cleaned = sentence.replace(/[^\w\s]/g, '').trim();
        if (cleaned.length > 5) {
          questions.push(cleaned.toLowerCase());
        }
      }
    });
  });
  return [...new Set(questions)]; // Remove duplicates
}

function extractKeyPhrases(responses: string[]): string[] {
  const phrases: string[] = [];
  responses.forEach(response => {
    // Extract common greeting and transition phrases
    const commonPhrases = [
      /olá[^.!?]*/gi,
      /tudo bem[^.!?]*/gi,
      /para começar[^.!?]*/gi,
      /poderia me[^.!?]*/gi,
      /gostaria de[^.!?]*/gi,
      /me conte[^.!?]*/gi,
      /me fale[^.!?]*/gi,
    ];
    
    commonPhrases.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\w\s]/g, '').trim();
          if (cleaned.length > 5) {
            phrases.push(cleaned.toLowerCase());
          }
        });
      }
    });
  });
  return [...new Set(phrases)]; // Remove duplicates
}