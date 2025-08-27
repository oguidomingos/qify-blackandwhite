import { v } from "convex/values";
import { action, internalAction, internalQuery, mutation } from "./_generated/server";
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

      // Get AI configurations for dynamic batching settings
      const aiConfig = await ctx.runQuery("aiConfigurations:getByOrg", {
        orgId
      });
      
      console.log(`AI Config for orgId ${orgId}:`, aiConfig);
      
      // Use configurable batching delay (default 120 seconds as specified)
      const batchingDelay = aiConfig?.batchingDelayMs || 120000;
      
      // Schedule AI processing with proper batching delay
      console.log(`Scheduling AI processing in ${batchingDelay/1000} seconds for session ${sessionId}`);
      
      // Use Convex scheduler for serverless-compatible batching
      await ctx.scheduler.runAfter(batchingDelay, internal.ai.processScheduledReply, {
        orgId,
        sessionId,
        scheduledAt: Date.now()
      });
      
      return { 
        success: true, 
        scheduled: true, 
        scheduledIn: batchingDelay,
        message: `AI processing scheduled for ${batchingDelay/1000}s from now`
      };

    } catch (error) {
      console.error("Error scheduling AI reply:", error);
      
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

// New scheduler-compatible function for Redis batching integration
export const scheduleReply = mutation({
  args: {
    sessionId: v.id("sessions"),
    orgId: v.id("organizations"), 
    scheduledFor: v.number(),
    correlationId: v.string()
  },
  handler: async (ctx, { sessionId, orgId, scheduledFor, correlationId }) => {
    console.log(`[${correlationId}] Scheduling AI reply for session ${sessionId} at ${new Date(scheduledFor).toISOString()}`);
    
    // Use Convex scheduler to call our processing function at the specified time
    await ctx.scheduler.runAt(scheduledFor, internal.ai.processScheduledReplyWithRedis, {
      sessionId,
      orgId,
      scheduledFor,
      correlationId
    });
    
    return {
      success: true,
      scheduledFor,
      scheduledAt: new Date(scheduledFor).toISOString()
    };
  }
});

// Enhanced scheduled function that works with Redis batching
export const processScheduledReplyWithRedis = internalAction({
  args: {
    sessionId: v.id("sessions"),
    orgId: v.id("organizations"),
    scheduledFor: v.number(),
    correlationId: v.string()
  },
  handler: async (ctx, { sessionId, orgId, scheduledFor, correlationId }) => {
    console.log(`[${correlationId}] Processing scheduled Redis-batched AI reply for session ${sessionId}`);
    
    try {
      // Import Redis helper dynamically to avoid Convex issues
      const { SessionStateManager } = await import("../lib/sessionState");
      const sessionManager = new SessionStateManager(sessionId);
      
      // Try to acquire processing lock
      const lockAcquired = await sessionManager.acquireLock(300000); // 5 min lock
      if (!lockAcquired) {
        console.log(`[${correlationId}] Could not acquire processing lock for session ${sessionId}`);
        return { skipped: true, reason: "lock_not_acquired" };
      }
      
      try {
        // Check if batch window has ended 
        const batchUntil = await sessionManager.getBatchUntil();
        if (batchUntil && Date.now() < batchUntil) {
          console.log(`[${correlationId}] Batch window still active until ${new Date(batchUntil).toISOString()}, skipping`);
          return { skipped: true, reason: "batch_window_active" };
        }
        
        // Drain all pending messages for this batch
        const pendingMessages = await sessionManager.drainPendingMessages();
        console.log(`[${correlationId}] Drained ${pendingMessages.length} pending messages for batch processing`);
        
        if (pendingMessages.length === 0) {
          console.log(`[${correlationId}] No pending messages to process`);
          return { skipped: true, reason: "no_pending_messages" };
        }
        
        // Clear the batch window
        await sessionManager.clearBatchUntil();
        
        // Get session and validate
        const session = await ctx.runQuery(internal.sessions.getById, { sessionId });
        if (!session) {
          console.log(`[${correlationId}] Session ${sessionId} not found`);
          return { skipped: true, reason: "session_not_found" };
        }
        
        // Get AI configurations
        const aiConfig = await ctx.runQuery("aiConfigurations:getByOrg", { orgId });
        const maxMessages = aiConfig?.maxMessagesContext || 20;
        
        // Get all messages for context (not just pending ones)
        const allMessagesDesc = await ctx.runQuery(internal.messages.listBySession, { 
          sessionId,
          limit: maxMessages,
        });
        
        const allMessages = allMessagesDesc.reverse(); // chronological order
        
        console.log(`[${correlationId}] Processing ${pendingMessages.length} batched messages with ${allMessages.length} context messages`);
        
        // Get full prompt with Redis state integration and template substitution
        const sessionState = await sessionManager.getState();
        const promptData = await ctx.runQuery("aiPrompts:getFullPromptWithSubstitution", { 
          orgId,
          sessionState: {
            stage: sessionState.stage,
            asked: Array.from(sessionState.asked),
            answered: Array.from(sessionState.answered),
            facts: sessionState.facts,
            lastUserTs: sessionState.lastUserTs
          },
          currentStage: sessionState.stage,
          facts: sessionState.facts,
          askedQuestions: Array.from(sessionState.asked),
          answeredTopics: Array.from(sessionState.answered)
        });
        
        // Build enhanced context with Redis state and batch info
        const conversationContext = buildEnhancedSpinConversationWithRedis(
          allMessages, 
          session, 
          promptData,
          sessionState,
          pendingMessages
        );
        
        // Call Gemini API
        const response = await callGemini(conversationContext);
        
        if (!response) {
          throw new Error("No response from Gemini");
        }
        
        console.log(`[${correlationId}] Generated AI response: "${response.substring(0, 100)}..."`);
        
        // Get contact info
        const contact = await ctx.runQuery(internal.contacts.getById, {
          contactId: session.contactId,
        });
        
        if (!contact) {
          throw new Error("Contact not found");
        }
        
        // Insert outbound message
        const messageId = await ctx.runMutation(internal.messages.insertOutbound, {
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
        
        // Process NLP and update Redis state
        await processNLPAndUpdateRedisState(sessionManager, response, allMessages);
        
        // Update session variables in Convex
        const collectedInfo = analyzeCollectedData(allMessages.filter(m => m.direction === "inbound").map(m => m.text));
        await saveCollectedDataToSession(ctx, sessionId, collectedInfo);
        await updateSessionFromResponse(ctx, sessionId, response, session);
        
        console.log(`[${correlationId}] Batch processing completed successfully`);
        
        return {
          success: true,
          response: response.substring(0, 100) + "...",
          batchedMessages: pendingMessages.length,
          totalContext: allMessages.length,
          messageId
        };
        
      } finally {
        // Always release the Redis lock
        await sessionManager.releaseLock();
      }
      
    } catch (error) {
      console.error(`[${correlationId}] Error in Redis batch processing:`, error);
      throw error;
    }
  }
});

// Scheduled function that executes the actual AI processing after batching delay
export const processScheduledReply = internalAction({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("sessions"),
    scheduledAt: v.number(),
  },
  handler: async (ctx: any, { orgId, sessionId, scheduledAt }: any) => {
    try {
      console.log(`Processing scheduled AI reply for session ${sessionId} (scheduled at ${new Date(scheduledAt)})`);

      // Check if session is still valid and not already processed
      const session = await ctx.runQuery(internal.sessions.getById, { sessionId });
      if (!session) {
        console.log(`Session ${sessionId} no longer exists, skipping AI processing`);
        return { skipped: true, reason: "session_not_found" };
      }

      // Check if there have been newer messages since scheduling
      const newerMessages = await ctx.runQuery(internal.messages.listBySession, { 
        sessionId,
        limit: 1,
      });

      if (newerMessages.length > 0 && newerMessages[0].createdAt > scheduledAt) {
        console.log(`Newer message found since scheduling, rescheduling AI processing for session ${sessionId}`);
        
        // Get AI configurations for new batching delay
        const aiConfig = await ctx.runQuery("aiConfigurations:getByOrg", {
          orgId
        });
        const batchingDelay = aiConfig?.batchingDelayMs || 120000;
        
        // Schedule again with fresh delay
        await ctx.scheduler.runAfter(batchingDelay, internal.ai.processScheduledReply, {
          orgId,
          sessionId,
          scheduledAt: Date.now()
        });
        
        return { 
          rescheduled: true, 
          newDelay: batchingDelay,
          reason: "newer_messages_found"
        };
      }

      // Get AI configurations for context
      const aiConfig = await ctx.runQuery("aiConfigurations:getByOrg", {
        orgId
      });

      // Get messages for context (dynamic limit from config)
      const maxMessages = aiConfig?.maxMessagesContext || 20;
      const messagesDesc = await ctx.runQuery(internal.messages.listBySession, { 
        sessionId,
        limit: maxMessages,
      });

      // Reverse to chronological order for proper context building
      const messages = messagesDesc.reverse();

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

      // Save collected data to session variables BEFORE updating insights
      const collectedInfo = analyzeCollectedData(messages.filter(m => m.direction === "inbound").map(m => m.text));
      await saveCollectedDataToSession(ctx, sessionId, collectedInfo);
      
      // Update session with AI insights and reset processing lock
      await updateSessionFromResponse(ctx, sessionId, response, session);
      
      // Reset processing lock
      await ctx.runMutation(internal.sessions.resetProcessing, {
        sessionId
      });
      
      console.log(`AI reply completed for session ${sessionId}: "${response.substring(0, 100)}..."`);

      return {
        success: true,
        response: response.substring(0, 100) + "...",
        messagesProcessed: messages.length
      };

    } catch (error) {
      console.error("Error processing scheduled AI reply:", error);
      
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
  
  // Get PERSISTENT data from session variables (PRIMARY SOURCE)
  const persistedData = session.variables?.collectedData || {
    name: [],
    personType: [],
    business: [],
    contact: []
  };
  
  // Also analyze current messages for ADDITIONAL data
  const userResponses = messages
    .filter(msg => msg.direction === "inbound")
    .map(msg => msg.text);
  
  const assistantResponses = messages
    .filter(msg => msg.direction === "outbound")
    .map(msg => msg.text);

  // Extract collected data from user responses (SECONDARY)
  const currentAnalysis = analyzeCollectedData(userResponses);
  
  // MERGE persisted data with current analysis
  const collectedInfo = {
    name: [...new Set([...persistedData.name, ...currentAnalysis.name])],
    personType: [...new Set([...persistedData.personType, ...currentAnalysis.personType])],
    business: [...new Set([...persistedData.business, ...currentAnalysis.business])],
    contact: [...new Set([...persistedData.contact, ...currentAnalysis.contact])]
  };
  
  console.log('Persisted data from DB:', JSON.stringify(persistedData));
  console.log('Current analysis:', JSON.stringify(currentAnalysis));
  console.log('Final merged info:', JSON.stringify(collectedInfo));
  
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
    // Determine conversation status based on persisted data
    const hasName = collectedInfo.name.length > 0;
    const hasPersonType = collectedInfo.personType.length > 0;
    const hasBusinessInfo = collectedInfo.business.length > 0;
    
    let nextAction = "";
    if (!hasPersonType) {
      nextAction = "Perguntar se é pessoa física ou jurídica";
    } else if (hasPersonType && !hasBusinessInfo) {
      nextAction = "Cliente já é pessoa jurídica - Perguntar sobre a NECESSIDADE/PROBLEMA específico";
    } else {
      nextAction = "Iniciar qualificação SPIN sobre a necessidade específica";
    }

    contextInstructions = `
**DADOS PERSISTIDOS NO SISTEMA:**
- Nome: ${collectedInfo.name.length > 0 ? collectedInfo.name.join(', ') : 'NÃO COLETADO'}
- Tipo: ${collectedInfo.personType.length > 0 ? collectedInfo.personType.join(', ') : 'NÃO COLETADO'}
- Empresa: ${collectedInfo.business.length > 0 ? collectedInfo.business.join(', ') : 'NÃO COLETADO'}

**REGRA FUNDAMENTAL:** NUNCA repita perguntas sobre dados já coletados acima.

**PRÓXIMA AÇÃO:** ${nextAction}

**SUAS ÚLTIMAS RESPOSTAS:**
${recentResponses.slice(-2).map((resp, i) => `${i + 1}. ${resp.substring(0, 100)}...`).join('\n')}
`;
  }

  return {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}

${contextInstructions}

**HISTÓRICO DA CONVERSA:**
${conversationHistory}

**INSTRUÇÕES FINAIS:**
- Use os dados persistidos do sistema
- NÃO repita perguntas já respondidas
- Siga a próxima ação indicada
- Seja direto e empático
- Máximo 2 frases`
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
    const text = response.toLowerCase().trim();
    const originalResponse = response.trim();
    
    // Detect person type (física/jurídica) - EXPANDED PATTERNS
    if (/(pessoa\s*(física|juridica|jurídica)|^(física|jurídica|pj|pf)$|represento|empresa|iceberg|juridica|juridic)/i.test(originalResponse)) {
      info.personType.push(originalResponse);
    }
    
    // Detect names (improved heuristic) - but exclude business-related responses
    const namePattern = /^[a-záêçõúíó\s0-9]{2,50}$/i; // Allow numbers for usernames like "Guigodomingos"
    const excludeWords = /(^(sim|não|ok|tudo|bem|oi|olá|empresa|negócio|pessoa|física|jurídica|represento|sou|trabalho|atuo|para|minha)$)/i;
    const businessExcludes = /(marketing|vendas|consultoria|tecnologia|software|agência|iceberg|ltda)/i;
    
    if (namePattern.test(originalResponse) && 
        originalResponse.split(' ').length >= 1 && 
        originalResponse.split(' ').length <= 4 &&
        originalResponse.length >= 3 && // Minimum 3 characters
        !excludeWords.test(originalResponse) && // Check full response, not just lowercase
        !businessExcludes.test(text)) {
      // Additional check: not common greetings or business terms
      if (!/(^(ola|oi|tudo|bem|bom|dia|tarde|noite|obrigad|para|uma)$)/.test(text) &&
          !/(assessoria|empresa|negocio)/.test(text)) {
        info.name.push(originalResponse);
      }
    }
    
    // Detect business/company info - MUCH MORE COMPREHENSIVE
    const businessPatterns = [
      /(empresa|negócio|trabalho|atuo|sou|faço|vendo|presto|serviço)/i,
      /(represento|iceberg|ltda|ltd|s\.a\.|sa|mei|eireli)/i,
      /(marketing|vendas|consultoria|tecnologia|software|agência)/i,
      /(agencia|agency|consulting|development|sistemas)/i
    ];
    
    if (businessPatterns.some(pattern => pattern.test(originalResponse))) {
      info.business.push(originalResponse);
    }
    
    // Detect contact info
    if (/(whatsapp|telefone|email|contato|\@|\.com|\.br|\d{10,})/i.test(text)) {
      info.contact.push(originalResponse);
    }
  });

  // Remove duplicates and filter
  info.name = [...new Set(info.name)].filter(n => n.length > 1);
  info.business = [...new Set(info.business)].filter(b => b.length > 2);
  info.contact = [...new Set(info.contact)];
  info.personType = [...new Set(info.personType)].filter(p => p.length > 1);

  return info;
}

async function saveCollectedDataToSession(ctx: any, sessionId: string, collectedInfo: any) {
  const session = await ctx.runQuery(internal.sessions.getById, { sessionId });
  if (!session) return;

  let variables = session.variables || {};
  
  // Initialize collected data structure if not exists
  if (!variables.collectedData) {
    variables.collectedData = {
      name: [],
      personType: [],
      business: [],
      contact: [],
      lastUpdated: Date.now()
    };
  }

  // Merge new data with existing, avoiding duplicates
  if (collectedInfo.name.length > 0) {
    variables.collectedData.name = [...new Set([...variables.collectedData.name, ...collectedInfo.name])];
  }
  if (collectedInfo.personType.length > 0) {
    variables.collectedData.personType = [...new Set([...variables.collectedData.personType, ...collectedInfo.personType])];
  }
  if (collectedInfo.business.length > 0) {
    variables.collectedData.business = [...new Set([...variables.collectedData.business, ...collectedInfo.business])];
  }
  if (collectedInfo.contact.length > 0) {
    variables.collectedData.contact = [...new Set([...variables.collectedData.contact, ...collectedInfo.contact])];
  }

  variables.collectedData.lastUpdated = Date.now();

  console.log('Saving collected data to session:', JSON.stringify(variables.collectedData));

  // Save to database
  await ctx.runMutation(internal.sessions.updateVariables, {
    sessionId,
    variables
  });
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

  // Concatenate all parts from Gemini response
  const parts = data.candidates[0].content.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No content parts in Gemini response");
  }
  
  // Join all text parts together
  const fullText = parts
    .filter(part => part.text) // Only include parts with text
    .map(part => part.text)
    .join('');
    
  if (!fullText.trim()) {
    throw new Error("Empty response from Gemini API");
  }
  
  return fullText;
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

// Enhanced conversation context builder with Redis state integration
function buildEnhancedSpinConversationWithRedis(
  messages: any[], 
  session: any, 
  promptData: any,
  sessionState: any,
  pendingMessages: any[]
) {
  const systemMessage = promptData?.systemMessage || getDefaultSpinPrompt();
  const userPrompt = promptData?.userPrompt || getDefaultSpinPrompt();
  
  // Get user responses for analysis
  const userResponses = messages
    .filter(m => m.direction === "inbound")
    .map(m => m.text);
  
  // Analyze collected data including Redis facts
  const currentAnalysis = analyzeCollectedDataWithRedis(userResponses, sessionState.facts);
  
  // Build context with Redis state awareness
  let contextualPrompt = `${systemMessage}\n\n---\n\n${userPrompt}`;
  
  // Add Redis state context
  if (sessionState.stage && sessionState.stage !== 'S') {
    contextualPrompt += `\n\n**CONTEXTO REDIS:**\n`;
    contextualPrompt += `- Estágio SPIN atual: ${getStageLabel(sessionState.stage)}\n`;
    contextualPrompt += `- Perguntas já feitas: ${Array.from(sessionState.asked).join(', ')}\n`;
    contextualPrompt += `- Tópicos respondidos: ${Array.from(sessionState.answered).join(', ')}\n`;
  }
  
  // Add facts from Redis
  if (Object.keys(sessionState.facts).length > 0) {
    contextualPrompt += `\n**DADOS COLETADOS (Redis):**\n`;
    if (sessionState.facts.name) contextualPrompt += `- Nome: ${sessionState.facts.name}\n`;
    if (sessionState.facts.personType) contextualPrompt += `- Tipo: ${sessionState.facts.personType}\n`;
    if (sessionState.facts.business) contextualPrompt += `- Empresa: ${sessionState.facts.business}\n`;
    if (sessionState.facts.contact) contextualPrompt += `- Contato: ${sessionState.facts.contact}\n`;
  }
  
  // Add batching context
  contextualPrompt += `\n**CONTEXTO DO LOTE:**\n`;
  contextualPrompt += `- Mensagens no lote: ${pendingMessages.length}\n`;
  contextualPrompt += `- Total de mensagens na conversa: ${messages.length}\n`;
  contextualPrompt += `- Última atividade do usuário: ${new Date(sessionState.lastUserTs).toLocaleString('pt-BR')}\n`;
  
  // Build conversation history
  contextualPrompt += `\n**HISTÓRICO DA CONVERSA:**\n`;
  messages.forEach(msg => {
    const prefix = msg.direction === "inbound" ? "Cliente" : "Você";
    contextualPrompt += `${prefix}: ${msg.text}\n`;
  });
  
  // Add analysis and guidelines
  contextualPrompt += `\n**ANÁLISE ATUAL:**\n`;
  contextualPrompt += `- Dados coletados: ${JSON.stringify(currentAnalysis, null, 2)}\n`;
  
  // Add final instructions for batched response
  contextualPrompt += `\n**INSTRUÇÕES PARA RESPOSTA:**\n`;
  contextualPrompt += `- Responda com BASE em TODAS as mensagens do lote\n`;
  contextualPrompt += `- Mantenha resposta ÚNICA e consolidada\n`;
  contextualPrompt += `- Progrida naturalmente na metodologia SPIN\n`;
  contextualPrompt += `- Evite repetir perguntas já feitas (verificar Redis)\n`;
  contextualPrompt += `- Mantenha tom conversacional e profissional\n`;
  
  return contextualPrompt;
}

// Enhanced data analysis with Redis facts integration
function analyzeCollectedDataWithRedis(userResponses: string[], redisFacts: any) {
  // Start with Redis facts as base
  const analysis = {
    name: redisFacts.name ? [redisFacts.name] : [],
    personType: redisFacts.personType ? [redisFacts.personType] : [],
    business: redisFacts.business ? [redisFacts.business] : [], 
    contact: redisFacts.contact ? [redisFacts.contact] : [],
    lastUpdated: Date.now()
  };
  
  // Enhance with NLP analysis of recent messages
  userResponses.forEach(response => {
    const text = response.toLowerCase();
    
    // Name extraction (preserve Redis data but add new findings)
    const namePatterns = [
      /meu nome é ([a-záêç\s]+)/i,
      /me chamo ([a-záêç\s]+)/i,
      /sou ([a-záêç\s]+)/i,
    ];
    
    namePatterns.forEach(pattern => {
      const match = response.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && !analysis.name.includes(name)) {
          analysis.name.push(name);
        }
      }
    });
    
    // Person type detection
    if (/\b(cnpj|empresa|companhia|ltda|mei|pj)\b/i.test(text)) {
      if (!analysis.personType.includes('PJ')) {
        analysis.personType.push('PJ');
      }
    } else if (/\b(cpf|pessoa física|individual|pf)\b/i.test(text)) {
      if (!analysis.personType.includes('PF')) {
        analysis.personType.push('PF');
      }
    }
    
    // Business/company extraction
    const businessPatterns = [
      /trabalho na ([^.!?]+)/i,
      /empresa (.+?)(?:\.|$)/i,
      /da ([a-zA-Z\s]{3,20})(?:\s|$)/i,
    ];
    
    businessPatterns.forEach(pattern => {
      const match = response.match(pattern);
      if (match && match[1]) {
        const business = match[1].trim();
        if (business.length > 2 && !analysis.business.includes(business)) {
          analysis.business.push(business);
        }
      }
    });
    
    // Contact extraction
    const phonePattern = /\b\d{2}\s?\d{4,5}-?\d{4}\b/;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    
    if (phonePattern.test(text)) {
      const phone = text.match(phonePattern)?.[0];
      if (phone && !analysis.contact.includes(phone)) {
        analysis.contact.push(phone);
      }
    }
    
    if (emailPattern.test(text)) {
      const email = text.match(emailPattern)?.[0];
      if (email && !analysis.contact.includes(email)) {
        analysis.contact.push(email);
      }
    }
  });
  
  return analysis;
}

// NLP processing and Redis state update
async function processNLPAndUpdateRedisState(sessionManager: any, response: string, messages: any[]) {
  const userMessages = messages.filter(m => m.direction === "inbound").map(m => m.text);
  const currentFacts = await sessionManager.getFacts();
  
  // Analyze and extract new information
  const newAnalysis = analyzeCollectedDataWithRedis(userMessages, currentFacts);
  
  // Update Redis facts with new findings
  if (newAnalysis.name.length > 0 && newAnalysis.name[0] !== currentFacts.name) {
    await sessionManager.setFact('name', newAnalysis.name[0]);
  }
  
  if (newAnalysis.personType.length > 0 && newAnalysis.personType[0] !== currentFacts.personType) {
    await sessionManager.setFact('personType', newAnalysis.personType[0]);
  }
  
  if (newAnalysis.business.length > 0 && newAnalysis.business[0] !== currentFacts.business) {
    await sessionManager.setFact('business', newAnalysis.business[0]);
  }
  
  if (newAnalysis.contact.length > 0 && newAnalysis.contact[0] !== currentFacts.contact) {
    await sessionManager.setFact('contact', newAnalysis.contact[0]);
  }
  
  // Determine what was asked in the response
  const questionsAsked = extractQuestionsFromResponse(response);
  for (const question of questionsAsked) {
    await sessionManager.addAsked(question);
  }
  
  // Determine what was answered by user
  const topicsAnswered = extractTopicsAnswered(userMessages[userMessages.length - 1] || "");
  for (const topic of topicsAnswered) {
    await sessionManager.addAnswered(topic);
  }
  
  // Update SPIN stage based on gating logic
  const currentStage = await sessionManager.getStage();
  const newStage = determineNextSpinStage(currentStage, newAnalysis);
  
  if (newStage !== currentStage) {
    await sessionManager.setStage(newStage);
    console.log(`SPIN stage progressed from ${currentStage} to ${newStage}`);
  }
}

function getStageLabel(stage: string): string {
  const labels = {
    'S': 'Situação',
    'P': 'Problema', 
    'I': 'Implicação',
    'N': 'Necessidade'
  };
  return labels[stage] || stage;
}

function extractQuestionsFromResponse(response: string): string[] {
  const sentences = response.split(/[.!?]/);
  return sentences
    .filter(s => s.includes('?') || /\b(que|qual|quando|onde|como|poderia)\b/i.test(s))
    .map(s => s.replace(/[^\w\s]/g, '').trim().toLowerCase())
    .filter(s => s.length > 5);
}

function extractTopicsAnswered(userResponse: string): string[] {
  const topics = [];
  const text = userResponse.toLowerCase();
  
  // Common topics that indicate answers
  if (text.includes('trabalho') || text.includes('empresa')) topics.push('trabalho');
  if (text.includes('problema') || text.includes('dificuldade')) topics.push('problemas');
  if (text.includes('objetivo') || text.includes('meta')) topics.push('objetivos');
  if (text.includes('orçamento') || text.includes('investir')) topics.push('orcamento');
  if (text.includes('prazo') || text.includes('quando')) topics.push('cronograma');
  
  return topics;
}

function determineNextSpinStage(currentStage: string, analysis: any): string {
  // Gating logic: require name + personType + business before advancing from S
  if (currentStage === 'S') {
    const hasName = analysis.name.length > 0;
    const hasPersonType = analysis.personType.length > 0;
    const hasBusiness = analysis.business.length > 0;
    
    if (hasName && hasPersonType && hasBusiness) {
      return 'P'; // Can advance to Problem
    }
    return 'S'; // Stay in Situation
  }
  
  // Simple progression for other stages
  const stageOrder = ['S', 'P', 'I', 'N'];
  const currentIndex = stageOrder.indexOf(currentStage);
  
  if (currentIndex < stageOrder.length - 1) {
    return stageOrder[currentIndex + 1];
  }
  
  return currentStage; // Stay at final stage
}