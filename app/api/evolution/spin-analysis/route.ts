import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

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

function analyzeSPINStage(text: string): { stage: keyof SPINPatterns | null; confidence: number; keywords: string[] } {
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
    return { stage: null, confidence: 0, keywords: [] };
  }

  // Sort by number of matches, get the highest
  results.sort((a, b) => b.matches - a.matches);
  const bestMatch = results[0];
  
  // Calculate confidence based on matches and text length
  const stagePatterns = SPIN_PATTERNS[bestMatch.stage];
  const confidence = Math.min(100, (bestMatch.matches / stagePatterns.length) * 100 + (bestMatch.keywords.length * 10));
  
  return {
    stage: bestMatch.stage,
    confidence: Math.round(confidence),
    keywords: bestMatch.keywords
  };
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


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const period = searchParams.get('period') || 'week';

    console.log('🎯 SPIN Analysis - Starting...', { contactId, period });

    let messagesUrl = `/api/evolution/messages?period=${period}&limit=200`;
    if (contactId) {
      messagesUrl += `&contactId=${contactId}`;
    }

    console.log('📞 Fetching messages from:', messagesUrl);

    try {
      // Fetch messages from our messages API
      const messagesResponse = await fetch(`${request.url.split('/api')[0]}${messagesUrl}`);
      
      console.log('📊 Messages response status:', messagesResponse.status);
      
      if (!messagesResponse.ok) {
        throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    // Group messages by contact
    const contactMessages: { [key: string]: AnalyzedMessage[] } = {};
    
    messages.forEach((msg: any) => {
      if (!contactMessages[msg.contactId]) {
        contactMessages[msg.contactId] = [];
      }

      const analysis = analyzeSPINStage(msg.text);
      contactMessages[msg.contactId].push({
        text: msg.text,
        direction: msg.direction,
        timestamp: msg.createdAt,
        spinStage: analysis.stage,
        confidence: analysis.confidence,
        keywords: analysis.keywords
      });
    });

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
      const contactName = messages.find((m: any) => m.contactId === contactId)?.senderName || 
                         contactId.split('@')[0] || 'Contato Desconhecido';

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

      console.log('✅ Real SPIN analysis completed:', spinSessions.length, 'sessions');
      
      return NextResponse.json({
        success: true,
        sessions: spinSessions,
        statistics,
        period,
        fallback: false
      });

    } catch (apiError) {
      console.log('🚨 SPIN Analysis failed - Messages API unavailable:', apiError);
      
      // Return clear error when messages API fails
      const errorMessage = apiError instanceof Error ? apiError.message : "Messages API unavailable";
      
      if (contactId) {
        return NextResponse.json({
          success: false,
          session: null,
          contactId,
          error: errorMessage,
          message: "Análise SPIN indisponível - Mensagens não acessíveis"
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        sessions: [],
        statistics: {
          totalSessions: 0,
          qualified: 0,
          stageDistribution: { S: 0, P: 0, I: 0, N: 0 },
          averageScore: 0
        },
        period,
        fallback: false,
        error: errorMessage,
        message: "Análise SPIN indisponível - API de mensagens offline"
      }, { status: 503 });
    }

  } catch (error) {
    console.error("🚨 SPIN analysis critical error:", error);
    
    // Return clear system error
    return NextResponse.json({
      success: false,
      sessions: [],
      statistics: {
        totalSessions: 0,
        qualified: 0,
        stageDistribution: { S: 0, P: 0, I: 0, N: 0 },
        averageScore: 0
      },
      period: searchParams.get('period') || 'all',
      fallback: false,
      error: error instanceof Error ? error.message : "Sistema indisponível",
      message: "Erro crítico na análise SPIN - Entre em contato com suporte"
    }, { status: 500 });
  }
}