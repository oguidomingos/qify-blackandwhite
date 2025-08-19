#!/usr/bin/env node

/**
 * Backfill script to populate Convex with demo data
 * This simulates existing Evolution API data to populate dashboards
 */

import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Demo data to simulate existing Evolution conversations
const DEMO_DATA = {
  organization: {
    name: "Demo Organization",
    clerkOrgId: "demo-org-qify-5561999449983",
    billingPlan: "starter",
    onboardingCompleted: true
  },
  
  agentConfig: {
    agentName: "SDR Agent Demo",
    phoneNumber: "5561999449983",
    personality: "professional", 
    toneOfVoice: "Profissional e consultivo",
    language: "pt-BR",
    responseTime: 3
  },

  whatsappAccount: {
    provider: "evolution",
    instanceId: "qify-5561999449983",
    instanceName: "WhatsApp Demo 5561999449983",
    phoneNumber: "5561999449983",
    status: "connected",
    webhookVerified: true
  },

  contacts: [
    {
      name: "João Silva",
      externalId: "5561987654321@s.whatsapp.net",
      channel: "whatsapp"
    },
    {
      name: "Maria Santos", 
      externalId: "5561876543210@s.whatsapp.net",
      channel: "whatsapp"
    },
    {
      name: "Pedro Costa",
      externalId: "5561765432109@s.whatsapp.net", 
      channel: "whatsapp"
    },
    {
      name: "Ana Oliveira",
      externalId: "5561654321098@s.whatsapp.net",
      channel: "whatsapp"
    },
    {
      name: "Carlos Ferreira",
      externalId: "5561543210987@s.whatsapp.net",
      channel: "whatsapp"
    }
  ],

  conversations: [
    {
      contactName: "João Silva",
      externalId: "5561987654321@s.whatsapp.net",
      stage: "problem",
      spinScore: 75,
      messages: [
        { direction: "inbound", text: "Olá, estou interessado em saber mais sobre gestão de vendas", hours: 2 },
        { direction: "outbound", text: "Olá João! Que bom falar com você. Me conta, como vocês fazem a gestão de vendas atualmente?", hours: 2 },
        { direction: "inbound", text: "Usamos planilhas mas está muito desorganizado", hours: 1.5 },
        { direction: "outbound", text: "Entendo. E qual o principal problema que isso gera no dia a dia?", hours: 1.5 },
        { direction: "inbound", text: "Perdemos muitas oportunidades, não sabemos acompanhar os leads", hours: 1 }
      ]
    },
    {
      contactName: "Maria Santos",
      externalId: "5561876543210@s.whatsapp.net", 
      stage: "qualified",
      spinScore: 85,
      messages: [
        { direction: "inbound", text: "Preciso urgente de uma solução de CRM", hours: 4 },
        { direction: "outbound", text: "Olá Maria! Vou te ajudar. Me conta mais sobre sua situação atual.", hours: 4 },
        { direction: "inbound", text: "Somos uma equipe de 15 vendedores e está tudo bagunçado", hours: 3.5 },
        { direction: "outbound", text: "Entendo. Esse descontrole está impactando as vendas?", hours: 3.5 },
        { direction: "inbound", text: "Sim, estamos perdendo pelo menos 30% das oportunidades", hours: 3 },
        { direction: "outbound", text: "E se continuasse assim pelos próximos 6 meses?", hours: 3 },
        { direction: "inbound", text: "Seria um desastre! Vamos perder muito dinheiro", hours: 2.5 },
        { direction: "outbound", text: "Que bom que está buscando uma solução. Quando podemos agendar uma demonstração?", hours: 2.5 },
        { direction: "inbound", text: "Pode ser amanhã de manhã?", hours: 2 }
      ]
    },
    {
      contactName: "Pedro Costa",
      externalId: "5561765432109@s.whatsapp.net",
      stage: "situation", 
      spinScore: 45,
      messages: [
        { direction: "inbound", text: "Oi, vi o anúncio de vocês", hours: 6 },
        { direction: "outbound", text: "Olá Pedro! Obrigado pelo contato. Em que posso ajudar?", hours: 6 },
        { direction: "inbound", text: "Queria saber sobre CRM", hours: 5.5 },
        { direction: "outbound", text: "Claro! Me conta, como vocês gerenciam clientes hoje?", hours: 5.5 }
      ]
    },
    {
      contactName: "Ana Oliveira", 
      externalId: "5561654321098@s.whatsapp.net",
      stage: "implication",
      spinScore: 68,
      messages: [
        { direction: "inbound", text: "Estamos com dificuldades para acompanhar leads", hours: 8 },
        { direction: "outbound", text: "Olá Ana! Entendo sua preocupação. Me fala mais sobre isso.", hours: 8 },
        { direction: "inbound", text: "Temos uma equipe de 8 pessoas e ninguém sabe quem está falando com quem", hours: 7.5 },
        { direction: "outbound", text: "Isso deve gerar conflitos e perda de oportunidades, não é?", hours: 7.5 },
        { direction: "inbound", text: "Exato! Já aconteceu de 3 vendedores ligarem para o mesmo cliente", hours: 7 },
        { direction: "outbound", text: "E como isso afeta a imagem da empresa com os clientes?", hours: 7 },
        { direction: "inbound", text: "Eles ficam irritados e alguns já reclamaram", hours: 6.5 }
      ]
    },
    {
      contactName: "Carlos Ferreira",
      externalId: "5561543210987@s.whatsapp.net", 
      stage: "need",
      spinScore: 72,
      messages: [
        { direction: "inbound", text: "Precisamos de uma solução urgente", hours: 12 },
        { direction: "outbound", text: "Olá Carlos! Vou te ajudar. Qual é a urgência?", hours: 12 },
        { direction: "inbound", text: "Nossa planilha corrompeu e perdemos dados de 200 clientes", hours: 11.5 },
        { direction: "outbound", text: "Nossa! E isso está impactando as vendas?", hours: 11.5 },
        { direction: "inbound", text: "Sim, não conseguimos mais acompanhar os prospects", hours: 11 },
        { direction: "outbound", text: "Se isso se repetir, qual seria o impacto?", hours: 11 },
        { direction: "inbound", text: "Perderia meu emprego! O chefe já está nervoso", hours: 10.5 },
        { direction: "outbound", text: "Entendo. Precisa de uma solução que evite essa dependência de planilhas então?", hours: 10.5 },
        { direction: "inbound", text: "Sim! Algo confiável e seguro", hours: 10 }
      ]
    }
  ]
};

async function createOrganization() {
  console.log("🏢 Creating organization...");
  
  try {
    const orgId = await convex.mutation("organizations.create", {
      name: DEMO_DATA.organization.name,
      clerkOrgId: DEMO_DATA.organization.clerkOrgId,
      billingPlan: DEMO_DATA.organization.billingPlan
    });

    // Update onboarding status
    await convex.mutation("organizations.updateOnboardingStep", {
      orgId,
      step: "completed", 
      completed: true
    });

    console.log(`✅ Organization created: ${orgId}`);
    return orgId;
  } catch (error) {
    console.log("Organization might already exist, trying to find it...");
    const existing = await convex.query("organizations.getByClerkId", {
      clerkId: DEMO_DATA.organization.clerkOrgId
    });
    
    if (existing) {
      console.log(`✅ Using existing organization: ${existing._id}`);
      return existing._id;
    }
    
    throw error;
  }
}

async function createAgentConfiguration(orgId) {
  console.log("🤖 Creating agent configuration...");
  
  const agentId = await convex.mutation("agentConfigurations.create", {
    orgId,
    agentName: DEMO_DATA.agentConfig.agentName,
    phoneNumber: DEMO_DATA.agentConfig.phoneNumber,
    personality: DEMO_DATA.agentConfig.personality,
    toneOfVoice: DEMO_DATA.agentConfig.toneOfVoice,
    language: DEMO_DATA.agentConfig.language,
    responseTime: DEMO_DATA.agentConfig.responseTime,
    workingHours: {
      start: "09:00",
      end: "18:00", 
      timezone: "America/Sao_Paulo",
      workDays: ["mon", "tue", "wed", "thu", "fri"]
    }
  });

  console.log(`✅ Agent configuration created: ${agentId}`);
  return agentId;
}

async function createWhatsAppAccount(orgId) {
  console.log("📱 Creating WhatsApp account...");
  
  const accountId = await convex.mutation("wa.createAccount", {
    orgId,
    instanceId: DEMO_DATA.whatsappAccount.instanceId,
    instanceName: DEMO_DATA.whatsappAccount.instanceName,
    phoneNumber: DEMO_DATA.whatsappAccount.phoneNumber,
    baseUrl: process.env.EVOLUTION_API_URL || "https://evolutionapi.centralsupernova.com.br",
    token: process.env.EVOLUTION_API_TOKEN || "demo-token"
  });

  // Update status to connected
  await convex.mutation("wa.updateStatus", {
    instanceId: DEMO_DATA.whatsappAccount.instanceId,
    status: DEMO_DATA.whatsappAccount.status
  });

  console.log(`✅ WhatsApp account created: ${accountId}`);
  return accountId;
}

async function createContacts(orgId) {
  console.log("👥 Creating contacts...");
  
  const contactIds = [];
  
  for (const contactData of DEMO_DATA.contacts) {
    const contactId = await convex.mutation("contacts.create", {
      orgId,
      name: contactData.name,
      channel: contactData.channel,
      externalId: contactData.externalId
    });
    
    contactIds.push({
      id: contactId,
      externalId: contactData.externalId,
      name: contactData.name
    });
    
    console.log(`  ✅ Contact created: ${contactData.name} (${contactId})`);
  }
  
  return contactIds;
}

async function createConversations(orgId, contacts) {
  console.log("💬 Creating conversations and messages...");
  
  for (const conversation of DEMO_DATA.conversations) {
    console.log(`  📝 Processing conversation with ${conversation.contactName}...`);
    
    // Find contact
    const contact = contacts.find(c => c.externalId === conversation.externalId);
    if (!contact) {
      console.log(`  ⚠️ Contact not found: ${conversation.externalId}`);
      continue;
    }

    // Create session
    const sessionId = await convex.mutation("sessions.create", {
      contactId: contact.id,
      orgId,
      channel: "whatsapp",
      status: "active"
    });

    console.log(`    ✅ Session created: ${sessionId}`);

    // Create messages
    let messageCount = 0;
    for (const messageData of conversation.messages) {
      const messageId = await convex.mutation("messages.create", {
        sessionId,
        contactId: contact.id,
        orgId,
        direction: messageData.direction,
        text: messageData.text,
        messageType: "text",
        metadata: {
          whatsappId: `demo-${Date.now()}-${Math.random()}`,
          timestamp: Date.now() - (messageData.hours * 3600000), // Hours ago
          instanceName: DEMO_DATA.whatsappAccount.instanceName
        }
      });
      
      messageCount++;
      console.log(`      💌 Message ${messageCount} created: ${messageData.direction}`);
    }

    // Update session with SPIN data
    const spinData = {
      situation: {
        answers: conversation.stage === "situation" ? ["Interessado em CRM"] : ["Gestão atual com planilhas"],
        completed: conversation.stage !== "situation",
        lastAt: Date.now() - (2 * 3600000)
      },
      problem: {
        answers: conversation.stage === "problem" || conversation.stage === "implication" || conversation.stage === "need" || conversation.stage === "qualified" 
          ? ["Desorganização", "Perda de oportunidades"] : [],
        completed: conversation.stage !== "situation" && conversation.stage !== "problem",
        lastAt: Date.now() - (1.5 * 3600000)
      },
      implication: {
        answers: conversation.stage === "implication" || conversation.stage === "need" || conversation.stage === "qualified"
          ? ["Perda de vendas", "Imagem da empresa"] : [],
        completed: conversation.stage === "need" || conversation.stage === "qualified",
        lastAt: Date.now() - (1 * 3600000)
      },
      needPayoff: {
        answers: conversation.stage === "need" || conversation.stage === "qualified"
          ? ["Solução confiável e segura"] : [],
        completed: conversation.stage === "qualified",
        lastAt: Date.now() - (0.5 * 3600000)
      },
      score: conversation.spinScore,
      stage: conversation.stage,
      summary: `Lead em estágio ${conversation.stage} com score ${conversation.spinScore}. ${
        conversation.stage === "qualified" ? "Pronto para agendamento!" : "Continuar conversa SPIN."
      }`
    };

    await convex.mutation("sessions.updateVariables", {
      sessionId,
      variables: { spin: spinData }
    });

    console.log(`    🎯 SPIN data updated - Stage: ${conversation.stage}, Score: ${conversation.spinScore}`);
  }
}

async function createAIConfiguration(orgId) {
  console.log("🧠 Creating AI configuration...");
  
  const aiConfigId = await convex.mutation("aiConfigurations.create", {
    orgId,
    batchingDelayMs: 2000,
    cooldownMs: 5000,
    processingTimeoutMs: 30000,
    maxMessagesContext: 10
  });

  console.log(`✅ AI configuration created: ${aiConfigId}`);
  return aiConfigId;
}

async function displayStats(orgId) {
  console.log("\n📊 DASHBOARD STATISTICS:");
  console.log("========================");
  
  // Get today's messages
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const allMessages = await convex.query("messages.listByOrgRecent", { orgId });
  const todayMessages = allMessages.filter(msg => msg.createdAt >= todayStart.getTime());
  
  console.log(`📨 Messages Today: ${todayMessages.length}`);
  console.log(`   📥 Inbound: ${todayMessages.filter(m => m.direction === "inbound").length}`);
  console.log(`   📤 Outbound: ${todayMessages.filter(m => m.direction === "outbound").length}`);
  
  // Get contacts
  const contacts = await convex.query("contacts.listByOrg", { orgId });
  console.log(`👥 Active Contacts: ${contacts.length}`);
  
  // Get sessions
  const sessions = await convex.query("sessions.listByOrg", { orgId });
  const activeSessions = sessions.filter(s => s.status === "active");
  console.log(`🎯 Active Sessions: ${activeSessions.length}`);
  
  // SPIN Statistics
  const qualifiedSessions = sessions.filter(s => {
    const spinScore = s.variables.spin?.score || 0;
    return spinScore >= 70;
  });
  
  console.log(`\n🎯 SPIN STATISTICS:`);
  console.log(`   🏆 Qualified Sessions: ${qualifiedSessions.length}`);
  console.log(`   📊 Average Score: ${Math.round(sessions.reduce((sum, s) => sum + (s.variables.spin?.score || 0), 0) / sessions.length) || 0}`);
  console.log(`   📈 Conversion Rate: ${Math.round((qualifiedSessions.length / sessions.length) * 100) || 0}%`);
  
  console.log(`\n✅ Backfill completed successfully!`);
  console.log(`🚀 Dashboard should now show real data at http://localhost:3000/dashboard`);
}

async function main() {
  try {
    console.log("🚀 Starting Evolution API data backfill...\n");
    
    // Create organization and core setup
    const orgId = await createOrganization();
    await createAgentConfiguration(orgId);
    await createWhatsAppAccount(orgId);
    await createAIConfiguration(orgId);
    
    // Create contacts and conversations
    const contacts = await createContacts(orgId);
    await createConversations(orgId, contacts);
    
    // Display final statistics
    await displayStats(orgId);
    
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

// Run the script
main();