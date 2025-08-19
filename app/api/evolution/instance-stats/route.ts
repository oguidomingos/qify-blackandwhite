import { NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

export async function GET() {
  try {
    // Fetch all instances to find our specific instance
    const instancesResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      }
    });

    if (!instancesResponse.ok) {
      throw new Error(`Failed to fetch instances: ${instancesResponse.status}`);
    }

    const instances = await instancesResponse.json();
    
    // Find our specific instance
    const ourInstance = instances.find((instance: any) => 
      instance.name === INSTANCE_NAME
    );

    if (!ourInstance) {
      return NextResponse.json({
        error: "Instance not found",
        instanceName: INSTANCE_NAME
      }, { status: 404 });
    }

    // Extract stats from our instance
    const stats = {
      totalMessages: ourInstance._count?.Message || 0,
      totalContacts: ourInstance._count?.Contact || 0,
      totalChats: ourInstance._count?.Chat || 0,
      instanceStatus: ourInstance.connectionStatus || "unknown",
      instanceName: ourInstance.name,
      phoneNumber: ourInstance.ownerJid,
      profileName: ourInstance.profileName,
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Evolution API error:", error);
    return NextResponse.json({
      error: "Failed to fetch Evolution data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}