import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface SPINPatterns {
  S: string[]; // Situation
  P: string[]; // Problem  
  I: string[]; // Implication
  N: string[]; // Need-Payoff
}

interface AnalyzedMessage {
  text: string;
  direction: "inbound" | "outbound";
  timestamp: number;
  spinStage?: keyof SPINPatterns;
  confidence: number;
  keywords: string[];
}

interface SPINSession {
  contactId: string;
  contactName: string;
  currentStage: keyof SPINPatterns;
  score: number;
  stageProgression: Array<{
    stage: keyof SPINPatterns;
    timestamp: number;
    confidence: number;
    triggerMessage: string;
  }>;
  lastActivity: number;
  totalMessages: number;
  qualified: boolean;
  summary: string;
}

const SPIN_PATTERNS: SPINPatterns = {
  S: [
    // Situation - Initial contact, introductions
    'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite',
    'quero saber', 'gostaria de', 'trabalham com', 'vocês fazem',
    'me chamo', 'sou da empresa', 'empresa', 'trabalho',
    'vi vocês', 'encontrei', 'indicação', 'recomendação',
    'atualmente uso', 'hoje trabalho com', 'nossa situação'
  ],
  P: [
    // Problem - Client mentions pain points
    'problema', 'dificuldade', 'não consigo', 'não funciona',
    'não está', 'preciso resolver', 'está ruim', 'não aguento',
    'demora muito', 'muito caro', 'não atende', 'insatisfeito',
    'reclamação', 'frustração', 'limitação', 'defeito',
    'erro', 'falha', 'bug', 'não resolve', 'complicado'
  ],
  I: [
    // Implication - Discussion of consequences
    'se não resolver', 'pode afetar', 'impacto', 'consequência',
    'prejudica', 'atrasa', 'perde cliente', 'perde dinheiro',
    'demora', 'custo alto', 'desperdício', 'ineficiência',
    'se continuar assim', 'vai piorar', 'pode quebrar',
    'risco', 'perigo', 'ameaça', 'competição', 'concorrente'
  ],
  N: [
    // Need-Payoff - Interest in solutions
    'quanto custa', 'qual preço', 'como funciona', 'quando podemos',
    'valor', 'investimento', 'orçamento', 'proposta',
    'quero contratar', 'vamos fechar', 'me interessa',
    'benefício', 'vantagem', 'melhora', 'resolve',
    'quando começa', 'prazo', 'cronograma', 'implementação',
    'pode ajudar', 'solução', 'alternativa', 'saída'
  ]
};

// Enhanced SPIN analysis using Gemini AI
async function analyzeSPINStageWithAI(text: string, context: string[] = []): Promise<{ stage: keyof SPINPatterns | null; confidence: number; keywords: string[]; reasoning: string }> {
  try {
    const contextStr = context.length > 0 ? `\nContexto da conversa anterior: ${context.slice(-3).join(' → ')}` : '';
    
    const prompt = `Analise esta mensagem de vendas e determine o estágio SPIN (Sales methodology).

ESTÁGIOS SPIN:
- S (Situação): Cliente explica contexto atual, empresa, cargo, situação presente
- P (Problema): Cliente menciona dores, problemas, insatisfações, dificuldades  
- I (Implicação): Cliente fala sobre impactos, consequências, custos dos problemas
- N (Necessidade): Cliente demonstra interesse em soluções, pergunta preços, prazos

MENSAGEM: "${text}"${contextStr}

Responda EXATAMENTE neste formato JSON:
{
  "stage": "S|P|I|N|null",
  "confidence": 0-100,
  "keywords": ["palavra1", "palavra2"],
  "reasoning": "Breve explicação do motivo"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response from Gemini AI');
    }

    // Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      stage: parsed.stage === 'null' ? null : parsed.stage,
      confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      reasoning: parsed.reasoning || ''
    };

  } catch (error) {
    console.error('AI SPIN analysis failed, falling back to keyword matching:', error);
    
    // Fallback to original keyword-based analysis
    const normalizedText = text.toLowerCase();
    const results: Array<{ stage: keyof SPINPatterns; matches: number; keywords: string[] }> = [];

    Object.entries(SPIN_PATTERNS).forEach(([stage, patterns]) => {
      const keywords = patterns.filter(pattern => normalizedText.includes(pattern));
      if (keywords.length > 0) {
        results.push({
          stage: stage as keyof SPINPatterns,
          matches: keywords.length,
          keywords
        });
      }
    });

    if (results.length === 0) {
      return { stage: null, confidence: 0, keywords: [], reasoning: 'No SPIN indicators found' };
    }

    results.sort((a, b) => b.matches - a.matches);
    const bestMatch = results[0];
    
    const stagePatterns = SPIN_PATTERNS[bestMatch.stage];
    const confidence = Math.min(100, (bestMatch.matches / stagePatterns.length) * 100 + (bestMatch.keywords.length * 10));
    
    return {
      stage: bestMatch.stage,
      confidence: Math.round(confidence),
      keywords: bestMatch.keywords,
      reasoning: `Keyword-based analysis: ${bestMatch.keywords.join(', ')}`
    };
  }
}

function calculateSPINScore(stageProgression: SPINSession['stageProgression'], totalMessages: number): number {
  let score = 30; // Base score

  // Points for reaching each stage
  const stageReached = {
    S: stageProgression.some(s => s.stage === 'S'),
    P: stageProgression.some(s => s.stage === 'P'),
    I: stageProgression.some(s => s.stage === 'I'),
    N: stageProgression.some(s => s.stage === 'N')
  };

  if (stageReached.S) score += 10;
  if (stageReached.P) score += 20;
  if (stageReached.I) score += 25;
  if (stageReached.N) score += 35;

  // Bonus for message volume (engagement)
  if (totalMessages >= 5) score += 5;
  if (totalMessages >= 10) score += 5;
  if (totalMessages >= 20) score += 10;

  // Bonus for recent progression
  const recentProgression = stageProgression.filter(s => 
    Date.now() - s.timestamp < 24 * 60 * 60 * 1000
  );
  score += recentProgression.length * 3;

  return Math.min(100, Math.max(0, score));
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const period = searchParams.get('period') || 'week';

    console.log('🎯 SPIN Analysis - Starting with Convex data...', { contactId, period });

    // Get authenticated user and organization
    const { userId, orgId } = await auth();
    
    console.log('🔐 SPIN Analysis - Authentication result:', { 
      userId: userId ? 'Present' : 'Missing', 
      orgId: orgId ? 'Present' : 'Missing',
      timestamp: new Date().toISOString()
    });
    
    if (!userId) {
      console.log('❌ SPIN Analysis - No userId provided');
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized",
        message: "Usuário não autenticado. Faça login novamente.",
        code: "AUTH_REQUIRED"
      }, { status: 401 });
    }

    // Get organization from Convex based on authenticated user's org
    let organization = null;
    
    try {
      if (orgId) {
        console.log('🔍 SPIN Analysis - Looking for organization with clerkOrgId:', orgId);
        // Try to get organization by Clerk orgId first
        organization = await convex.query(api.auth.getOrganization, {
          clerkOrgId: orgId
        });
      }
      
      if (!organization) {
        console.log('❌ SPIN Analysis - Organization not found for user', { userId, orgId });
        
        // Try to list available organizations for debugging
        try {
          const allOrgs = await convex.query(api.organizations.list);
          console.log('📋 SPIN Analysis - Available organizations:', allOrgs.length);
          allOrgs.slice(0, 3).forEach(org => {
            console.log(`  - ${org.name} (${org.clerkOrgId})`);
          });
        } catch (listError) {
          console.log('❌ Failed to list organizations for debug:', listError);
        }
        
        return NextResponse.json({ 
          success: false,
          error: "Organization not found",
          message: "Organização não encontrada. Complete o onboarding primeiro.",
          code: "ORG_NOT_FOUND",
          requiresOnboarding: true
        }, { status: 403 });
      }
      
      console.log('✅ SPIN Analysis - Found user organization:', {
        name: organization.name,
        id: organization._id,
        clerkOrgId: organization.clerkOrgId
      });
    } catch (error) {
      console.error('❌ SPIN Analysis - Failed to fetch user organization:', error);
      return NextResponse.json({ 
        success: false,
        error: "Authentication failed",
        message: "Falha na autenticação da organização. Tente novamente.",
        code: "AUTH_ERROR"
      }, { status: 500 });
    }
    
    console.log('🏢 Organization authenticated:', organization.name, organization._id);

    // Get real SPIN sessions from Convex for the authenticated organization
    try {
      // First, check if we have existing SPIN sessions
      const spinSessions = await convex.query(api.sessions.listSpin, {
        orgId: organization._id
      });

      console.log('📊 Found SPIN sessions:', spinSessions?.length || 0);

      // If we have real SPIN data, return it
      if (spinSessions && spinSessions.length > 0) {
        const analytics = {
          totalSessions: spinSessions.length,
          qualified: spinSessions.filter((s: any) => s.qualified || s.score > 70).length,
          stageDistribution: {
            S: spinSessions.filter((s: any) => s.currentStage === 'S').length,
            P: spinSessions.filter((s: any) => s.currentStage === 'P').length,
            I: spinSessions.filter((s: any) => s.currentStage === 'I').length,
            N: spinSessions.filter((s: any) => s.currentStage === 'N').length
          },
          averageScore: spinSessions.length > 0 ? 
            Math.round(spinSessions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / spinSessions.length) : 0
        };

        return NextResponse.json({
          success: true,
          sessions: spinSessions,
          statistics: analytics,
          period,
          fallback: false,
          message: `Análise SPIN de ${spinSessions.length} sessões reais`
        });
      }

      // No existing SPIN sessions, analyze messages to create them
      console.log('📊 No SPIN sessions found, analyzing messages to create them...');
    } catch (error) {
      console.error('❌ Error checking SPIN sessions:', error);
    }

    // Get messages from Convex
    const messagesResult = await convex.query(api.messages.listRecent, {
      orgId: organization._id,
      limit: 200
    });
    
    const messages = messagesResult.messages || [];

    // Get contacts for names
    const contacts = await convex.query(api.contacts.listByOrg, {
      orgId: organization._id
    });

    // Group messages by contact and analyze with AI
    const contactMessages: { [key: string]: AnalyzedMessage[] } = {};
    
    // Process messages sequentially to build conversation context
    for (const msg of messages) {
      if (!contactMessages[msg.contactId]) {
        contactMessages[msg.contactId] = [];
      }

      // Get previous messages for context
      const previousMessages = contactMessages[msg.contactId]
        .filter(m => m.direction === 'inbound') // Only inbound messages for context
        .map(m => m.text);

      // Analyze message with AI including context
      const analysis = await analyzeSPINStageWithAI(msg.text, previousMessages);
      
      contactMessages[msg.contactId].push({
        text: msg.text,
        direction: msg.direction,
        timestamp: msg.createdAt,
        spinStage: analysis.stage,
        confidence: analysis.confidence,
        keywords: analysis.keywords
      });
    }

    // Analyze each contact's SPIN progression
    const spinSessions: SPINSession[] = [];

    Object.entries(contactMessages).forEach(([contactId, msgs]) => {
      const sortedMessages = msgs.sort((a, b) => a.timestamp - b.timestamp);
      
      // Build stage progression
      const stageProgression: SPINSession['stageProgression'] = [];
      let currentStage: keyof SPINPatterns = 'S';
      
      sortedMessages.forEach(msg => {
        if (msg.spinStage && msg.confidence > 30) {
          // Only add if it's a progression (S->P->I->N)
          const stageOrder = { S: 1, P: 2, I: 3, N: 4 };
          const currentOrder = stageOrder[currentStage];
          const newOrder = stageOrder[msg.spinStage];
          
          if (newOrder >= currentOrder) {
            stageProgression.push({
              stage: msg.spinStage,
              timestamp: msg.timestamp,
              confidence: msg.confidence,
              triggerMessage: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '')
            });
            currentStage = msg.spinStage;
          }
        }
      });

      const totalMessages = sortedMessages.length;
      const score = calculateSPINScore(stageProgression, totalMessages);
      const qualified = score >= 70 && currentStage === 'N';
      const lastActivity = Math.max(...sortedMessages.map(m => m.timestamp));
      const contact = contacts.find((c: any) => c._id === contactId);
      const contactName = contact?.name || 'Contato Desconhecido';

      // Generate summary
      let summary = `Contato em estágio ${currentStage}`;
      if (qualified) {
        summary = `Lead qualificado! Score: ${score}. Pronto para proposta.`;
      } else if (currentStage === 'N') {
        summary = `Demonstrando interesse em soluções. Score: ${score}.`;
      } else if (currentStage === 'I') {
        summary = `Discutindo impactos dos problemas. Score: ${score}.`;
      } else if (currentStage === 'P') {
        summary = `Identificou problemas/dores. Score: ${score}.`;
      }

      spinSessions.push({
        contactId,
        contactName,
        currentStage,
        score,
        stageProgression,
        lastActivity,
        totalMessages,
        qualified,
        summary
      });
    });

    // Sort by score descending
    spinSessions.sort((a, b) => b.score - a.score);

    // If specific contact requested, return just that one
    if (contactId) {
      const session = spinSessions.find(s => s.contactId === contactId);
      return NextResponse.json({
        success: true,
        session: session || null,
        contactId
      });
    }

    // Return all sessions with statistics
    const statistics = {
      totalSessions: spinSessions.length,
      qualified: spinSessions.filter(s => s.qualified).length,
      stageDistribution: {
        S: spinSessions.filter(s => s.currentStage === 'S').length,
        P: spinSessions.filter(s => s.currentStage === 'P').length,
        I: spinSessions.filter(s => s.currentStage === 'I').length,
        N: spinSessions.filter(s => s.currentStage === 'N').length
      },
      averageScore: spinSessions.length > 0 ? 
        Math.round(spinSessions.reduce((sum, s) => sum + s.score, 0) / spinSessions.length) : 0
    };

    // Handle empty results properly
    if (spinSessions.length === 0) {
      console.log('📊 SPIN Analysis - No sessions created from messages');
      return NextResponse.json({
        success: true,
        sessions: [],
        statistics: {
          totalSessions: 0,
          qualified: 0,
          stageDistribution: { S: 0, P: 0, I: 0, N: 0 },
          averageScore: 0
        },
        period,
        fallback: false,
        message: "Nenhuma sessão SPIN criada. Inicie conversas para começar a análise automática."
      });
    }

    console.log('✅ SPIN analysis completed with Convex data:', spinSessions.length, 'sessions');
    
    return NextResponse.json({
      success: true,
      sessions: spinSessions,
      statistics,
      period,
      message: `Análise SPIN de ${spinSessions.length} sessões concluída`
    });

  } catch (error) {
    console.error("🚨 SPIN Analysis - Unexpected error:", error);
    
    return NextResponse.json({
      success: false,
      sessions: [],
      statistics: {
        totalSessions: 0,
        qualified: 0,
        stageDistribution: { S: 0, P: 0, I: 0, N: 0 },
        averageScore: 0
      },
      error: "Internal server error",
      message: "Erro interno na análise SPIN. Tente novamente em alguns momentos.",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}