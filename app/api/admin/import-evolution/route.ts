import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

async function fetchEvolutionData(endpoint: string) {
  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    
    if (action === "create-demo") {
      // Create demo organization using direct creation
      const orgId = await convex.mutation("organizations.create", {
        name: "Demo Organization for Qify",
        clerkOrgId: "demo-qify-5561999449983",
        billingPlan: "starter"
      });
      
      return NextResponse.json({
        success: true,
        message: "Demo organization created",
        orgId: orgId
      });
    }
    
    if (action === "import-contacts") {
      const { orgId } = body;
      
      // Fetch contacts from Evolution API
      const contacts = await fetchEvolutionData(`/chat/findContacts/${INSTANCE_NAME}`);
      
      if (!contacts || !Array.isArray(contacts)) {
        return NextResponse.json({
          success: false,
          message: "Failed to fetch contacts from Evolution API"
        });
      }
      
      let imported = 0;
      let errors = 0;
      
      // Import first 10 contacts for testing
      for (const contact of contacts.slice(0, 10)) {
        try {
          await convex.mutation("contacts.upsertFromEvolution", {
            orgId: orgId,
            evolutionData: contact
          });
          imported++;
        } catch (error) {
          console.error("Failed to import contact:", error);
          errors++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Imported ${imported} contacts, ${errors} errors`,
        imported,
        errors
      });
    }
    
    if (action === "import-messages") {
      const { orgId } = body;
      
      // Fetch messages from Evolution API
      const messages = await fetchEvolutionData(`/chat/findMessages/${INSTANCE_NAME}`);
      
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({
          success: false,
          message: "Failed to fetch messages from Evolution API"
        });
      }
      
      let imported = 0;
      let errors = 0;
      
      // Import first 20 messages for testing
      for (const message of messages.slice(0, 20)) {
        try {
          await convex.mutation("messages.upsertFromEvolution", {
            orgId: orgId,
            evolutionData: message
          });
          imported++;
        } catch (error) {
          console.error("Failed to import message:", error);
          errors++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Imported ${imported} messages, ${errors} errors`,
        imported,
        errors
      });
    }
    
    return NextResponse.json({
      success: false,
      message: "Invalid action"
    });
    
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}