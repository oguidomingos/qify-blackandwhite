import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrgAndKind = query({
  args: {
    orgId: v.id("organizations"),
    kind: v.string(),
  },
  handler: async (ctx, { orgId, kind }) => {
    return await ctx.db
      .query("ai_prompts")
      .withIndex("by_org_kind_active", (q: any) => 
        q.eq("orgId", orgId).eq("kind", kind).eq("active", true)
      )
      .first();
  },
});

export const getActivePrompt = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, { orgId }) => {
    const prompt = await ctx.db
      .query("ai_prompts")
      .withIndex("by_org_kind_active", (q: any) => 
        q.eq("orgId", orgId).eq("kind", "spin_sdr").eq("active", true)
      )
      .first();
    
    if (!prompt) {
      // Return default prompt structure
      return {
        content: getDefaultSpinPrompt(),
        kind: "spin_sdr",
        version: 1,
        active: true
      };
    }
    
    return prompt;
  },
});

export const createOrUpdatePrompt = mutation({
  args: {
    orgId: v.id("organizations"),
    content: v.string(),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, content, kind = "spin_sdr" }) => {
    // Deactivate existing prompts of this kind
    const existingPrompts = await ctx.db
      .query("ai_prompts")
      .filter((q) => q.and(
        q.eq(q.field("orgId"), orgId),
        q.eq(q.field("kind"), kind),
        q.eq(q.field("active"), true)
      ))
      .collect();
    
    for (const prompt of existingPrompts) {
      await ctx.db.patch(prompt._id, { active: false });
    }
    
    // Create new active prompt
    return await ctx.db.insert("ai_prompts", {
      orgId,
      kind,
      version: 1,
      content,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const getFullPrompt = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, { orgId }) => {
    const activePrompt = await ctx.db
      .query("ai_prompts")
      .withIndex("by_org_kind_active", (q: any) => 
        q.eq("orgId", orgId).eq("kind", "spin_sdr").eq("active", true)
      )
      .first();

    const userPrompt = activePrompt?.content || getDefaultSpinPrompt();
    const systemMessage = getSystemMessage();
    
    return {
      systemMessage,
      userPrompt,
      fullPrompt: `${systemMessage}\n\n---\n\n${userPrompt}`
    };
  },
});

function getSystemMessage(): string {
  return `🎯 **Role of the Assistant**
Você é um assistente virtual e SDR especializado em qualificação de prospects. Seu objetivo é **converter leads em agendamentos confirmados**, garantindo precisão e uma experiência humana, empática e profissional.

* **Objetivo principal:** qualificar o prospect e agendar reunião comercial de forma rápida e assertiva.
* **Método:** entender o contexto → coletar dados essenciais → aplicar metodologia de qualificação → conduzir ao agendamento.
* **Não repetir saudações**: Após a primeira mensagem, nunca repita cumprimentos ou se reapresente.

📋 **Coleta de Dados Obrigatória (SEMPRE coletar)**

**1️⃣ Informações Básicas do Prospect:**
* **Nome completo** {{#if facts.name}}✅ Coletado: {{facts.name}}{{else}}❌ Pendente{{/if}}
* **Tipo de pessoa:** Física ou Jurídica {{#if facts.personType}}✅ Coletado: {{facts.personType}}{{else}}❌ Pendente{{/if}}
* **Se Jurídica:** Nome da empresa {{#if facts.business}}✅ Coletado: {{facts.business}}{{else}}❌ Pendente{{/if}}
* **Contato/WhatsApp** {{#if facts.contact}}✅ Coletado: {{facts.contact}}{{else}}❌ Pendente{{/if}}
* **Gênero:** Perceber pela forma de escrever (não perguntar diretamente)

**2️⃣ Contexto do Interesse:**
* **Motivo do contato** (necessidade, problema, interesse)
* **Urgência** (quando precisa resolver)
* **Orçamento/Budget** (se aplicável)

🎯 **Estado Atual da Conversa**
* **Estágio SPIN:** {{currentStage}} ({{stageLabel}})
* **Perguntas já feitas:** {{askedQuestions}}
* **Tópicos já respondidos:** {{answeredTopics}}

🎯 **Processo de Qualificação**

**GATING LOGIC - CRÍTICO:**
- ❌ NÃO pode avançar para estágio "P" (Problema) até coletar: Nome + Tipo de Pessoa + Empresa (se PJ)
- ✅ Só avance quando todos os dados obrigatórios estiverem coletados
- 🚫 NUNCA pule etapas do SPIN sem coletar dados básicos

**1️⃣ Primeira Interação (Estágio S - Situação):**
- Cumprimento profissional e empático
- Coleta do nome e tipo de pessoa
- Se PJ: coletar nome da empresa
- Entendimento inicial do motivo do contato

**2️⃣ Coleta de Dados (Ainda Estágio S):**
- Completar dados obrigatórios pendentes
- Confirmar informações coletadas
- Só então partir para problemas/dores

**3️⃣ Qualificação (Estágios P, I, N):**
- Usar metodologia definida pelo usuário
- Focar em qualificar fit e necessidade
- Manter conversa fluida e natural

**4️⃣ Condução ao Agendamento:**
- Apresentar valor da solução
- Oferecer agendamento com time comercial
- Confirmar dados para agendamento

💬 **Diretrizes de Comunicação**
✅ **Idioma:** Português brasileiro (padrão)
✅ **Tom:** Profissional, empático e consultivo
✅ **Respostas:** Concisas (2-3 frases máximo)
✅ **Foco:** Sempre conduzir para qualificação e agendamento
✅ **Dados:** Nunca perder informações já coletadas
✅ **Fluxo:** Uma pergunta por vez, progressão lógica

🚨 **Regras Importantes**
- NUNCA repetir perguntas já respondidas (verificar {{askedQuestions}})
- SEMPRE manter dados coletados em contexto
- Perceber gênero pela escrita (não perguntar)
- Ser empático mas manter foco comercial
- Conduzir naturalmente para agendamento
- RESPEITAR O GATING: não avançar estágios sem dados obrigatórios

📅 **Data atual:** {{currentDate}}
🕐 **Última atividade:** {{lastActivity}}`;
}

function getDefaultSpinPrompt(): string {
  return `## METODOLOGIA SPIN PARA QUALIFICAÇÃO

**SUA ABORDAGEM:**
Como SDR especialista, use a metodologia SPIN para qualificar prospects e agendar reuniões comerciais.

**ETAPAS SPIN:**

**1. SITUATION (Situação)**
- Entenda o contexto atual do prospect
- Perguntas sobre como trabalham hoje
- Identifique o cenário atual da empresa/pessoa

**2. PROBLEM (Problema)**
- Identifique dores e desafios específicos
- Explore dificuldades que enfrentam
- Descubra gaps no processo atual

**3. IMPLICATION (Implicação)**
- Explore consequências dos problemas
- Mostre impactos no negócio/vida
- Crie urgência para resolução

**4. NEED-PAYOFF (Necessidade)**
- Apresente benefícios da solução
- Faça o prospect verbalizar valor
- Conduza para agendamento comercial

**DIRETRIZES:**
- Uma pergunta por vez
- Seja natural e conversacional
- Progrida logicamente pelas etapas
- Mantenha foco no agendamento
- Use linguagem simples e direta

**EXEMPLOS DE PERGUNTAS:**

*Situation:* "Como vocês lidam com [área relevante] atualmente?"
*Problem:* "Que tipo de dificuldades vocês enfrentam com isso?"
*Implication:* "Como isso impacta o dia a dia da equipe?"
*Need-payoff:* "Se resolvêssemos isso, qual seria o maior benefício?"

**OBJETIVO FINAL:** Descobrir fit e agendar conversa com time comercial.`;
}

// Template substitution function for dynamic prompt variables
function substitutePromptTemplate(template: string, variables: any): string {
  let result = template;
  
  // Handle special $now variable first
  result = result.replace(/\{\{\$now\}\}/g, () => {
    return new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });
  
  // Simple variable substitution like {{variableName}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : match;
  });
  
  // Conditional substitution like {{#if variable}}content{{else}}alternative{{/if}}
  result = result.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/gs, (match, varPath, ifContent, elseContent) => {
    const value = getNestedProperty(variables, varPath);
    return value ? ifContent : elseContent;
  });
  
  // Simple conditionals without else
  result = result.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/if\}\}/gs, (match, varPath, content) => {
    const value = getNestedProperty(variables, varPath);
    return value ? content : '';
  });
  
  // Nested property access like {{facts.name}}
  result = result.replace(/\{\{(\w+\.\w+)\}\}/g, (match, varPath) => {
    const value = getNestedProperty(variables, varPath);
    return value !== undefined ? String(value) : match;
  });
  
  return result;
}

// Helper function to get nested properties
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Enhanced getFullPrompt with template substitution
export const getFullPromptWithSubstitution = query({
  args: {
    orgId: v.id("organizations"),
    sessionState: v.optional(v.any()),
    currentStage: v.optional(v.string()),
    facts: v.optional(v.any()),
    askedQuestions: v.optional(v.array(v.string())),
    answeredTopics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { orgId, sessionState, currentStage, facts, askedQuestions, answeredTopics }) => {
    const activePrompt = await ctx.db
      .query("ai_prompts")
      .withIndex("by_org_kind_active", (q: any) => 
        q.eq("orgId", orgId).eq("kind", "spin_sdr").eq("active", true)
      )
      .first();

    const userPrompt = activePrompt?.content || getDefaultSpinPrompt();
    let systemMessage = getSystemMessage();
    
    // Prepare template variables
    const templateVars = {
      currentDate: new Date().toLocaleDateString('pt-BR'),
      lastActivity: sessionState?.lastUserTs ? new Date(sessionState.lastUserTs).toLocaleString('pt-BR') : 'Não disponível',
      currentStage: currentStage || 'S',
      stageLabel: getStageLabel(currentStage || 'S'),
      facts: facts || {},
      askedQuestions: (askedQuestions || []).join(', ') || 'Nenhuma',
      answeredTopics: (answeredTopics || []).join(', ') || 'Nenhum',
    };
    
    // Apply template substitution to system message
    systemMessage = substitutePromptTemplate(systemMessage, templateVars);
    
    // Apply template substitution to user prompt as well
    const processedUserPrompt = substitutePromptTemplate(userPrompt, templateVars);
    
    return {
      systemMessage,
      userPrompt: processedUserPrompt,
      fullPrompt: `${systemMessage}\n\n---\n\n${processedUserPrompt}`,
      templateVars
    };
  },
});

function getStageLabel(stage: string): string {
  const labels = {
    'S': 'Situação - Coletando dados básicos',
    'P': 'Problema - Identificando dores',
    'I': 'Implicação - Explorando consequências',
    'N': 'Necessidade - Criando urgência'
  };
  return labels[stage] || stage;
}