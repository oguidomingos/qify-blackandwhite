import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

export const dynamic = 'force-dynamic';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "oguidomingos";

export async function POST(request: Request) {
  try {
    console.log('🚀 Setting up admin123 user with oguidomingos instance...');

    const client = new ConvexHttpClient(CONVEX_URL);

    // 1. Check if organization already exists for oguidomingos
    let existingOrg;
    try {
      existingOrg = await client.query("organizations.getByClerkId", {
        clerkId: "admin123-org"
      });
      console.log('Existing organization:', existingOrg);
    } catch (error) {
      console.log('No existing organization found, will create new one');
    }

    let orgId;

    if (existingOrg) {
      orgId = existingOrg._id;
      console.log('✅ Using existing organization:', orgId);

      // Update onboarding to completed
      await client.mutation("organizations.updateOnboardingStep", {
        orgId: orgId,
        step: "completed",
        completed: true
      });
    } else {
      // 2. Create organization for admin123
      orgId = await client.mutation("organizations.create", {
        name: "Admin123 Organization",
        clerkOrgId: "admin123-org",
        billingPlan: "enterprise"
      });
      console.log('✅ Created organization:', orgId);

      // 3. Set onboarding as completed
      await client.mutation("organizations.updateOnboardingStep", {
        orgId: orgId,
        step: "completed",
        completed: true
      });
      console.log('✅ Onboarding completed');
    }

    // 4. Check if WhatsApp account already exists
    const existingAccounts = await client.query("whatsapp_accounts.getByOrg", {
      orgId: orgId
    });

    if (!existingAccounts || existingAccounts.length === 0) {
      // 5. Create WhatsApp account for oguidomingos
      await client.mutation("whatsapp_accounts.create", {
        orgId: orgId,
        provider: "evolution",
        instanceId: INSTANCE_NAME,
        instanceName: INSTANCE_NAME,
        phoneNumber: "oguidomingos",
        status: "connected",
        sharedToken: "admin123_shared_token_32chars",
        baseUrl: EVOLUTION_BASE_URL || "https://api.icebergcompany.com.br",
        token: EVOLUTION_API_KEY || "509dbd54-c20c-4a5b-b889-a0494a861f5a",
        webhookVerified: true,
        createdAt: Date.now()
      });
      console.log('✅ Created WhatsApp account for oguidomingos');
    } else {
      console.log('✅ WhatsApp account already exists');
    }

    // 6. Check if agent configuration exists
    const existingAgent = await client.query("agentConfigurations.getByOrg", {
      orgId: orgId
    });

    if (!existingAgent) {
      // 7. Create agent configuration
      await client.mutation("agentConfigurations.create", {
        orgId: orgId,
        agentName: "Assistente Virtual Admin123",
        phoneNumber: "oguidomingos",
        personality: "professional",
        toneOfVoice: "Profissional, prestativo e consultivo",
        language: "pt-BR",
        responseTime: 2,
        workingHours: {
          start: "00:00",
          end: "23:59",
          timezone: "America/Sao_Paulo",
          workDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        }
      });
      console.log('✅ Created agent configuration');
    } else {
      console.log('✅ Agent configuration already exists');
    }

    // 8. Test Evolution API connection
    let evolutionStatus = "not_tested";
    try {
      const testResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${INSTANCE_NAME}`, {
        headers: {
          'apikey': EVOLUTION_API_KEY!
        }
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        evolutionStatus = data.state || "connected";
        console.log('✅ Evolution API connection test:', evolutionStatus);
      }
    } catch (error) {
      console.log('⚠️ Evolution API test failed:', error);
      evolutionStatus = "error";
    }

    return NextResponse.json({
      success: true,
      message: "Admin123 user setup completed successfully",
      data: {
        orgId: orgId,
        instanceName: INSTANCE_NAME,
        evolutionApiUrl: EVOLUTION_BASE_URL,
        evolutionStatus: evolutionStatus,
        credentials: {
          clerkOrgId: "admin123-org",
          username: "admin123"
        }
      }
    });

  } catch (error) {
    console.error("🚨 Setup error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to setup admin123 user"
    }, { status: 500 });
  }
}
