import { NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

export async function GET() {
  try {
    console.log('🔄 Fetching Evolution API data...');
    console.log('📍 URL:', `${EVOLUTION_BASE_URL}/instance/fetchInstances`);
    console.log('🔑 API Key length:', EVOLUTION_API_KEY?.length || 0);
    
    // Fetch all instances to find our specific instance with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const instancesResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📊 Response status:', instancesResponse.status);

    if (!instancesResponse.ok) {
      throw new Error(`Failed to fetch instances: ${instancesResponse.status} ${instancesResponse.statusText}`);
    }

    const instances = await instancesResponse.json();
    console.log('📋 Found instances:', instances?.length || 0);
    
    // Find our specific instance
    const ourInstance = instances.find((instance: any) => 
      instance.name === INSTANCE_NAME
    );

    if (!ourInstance) {
      console.log('❌ Instance not found:', INSTANCE_NAME);
      console.log('📋 Available instances:', instances.map((i: any) => i.name));
      
      // Return fallback data instead of error
      return NextResponse.json({
        totalMessages: 150,
        totalContacts: 45,
        totalChats: 12,
        instanceStatus: "disconnected",
        instanceName: INSTANCE_NAME,
        phoneNumber: "5561999449983",
        profileName: "Qify Assistant",
        lastUpdate: new Date().toISOString(),
        fallback: true,
        message: "Using fallback data - instance not found"
      });
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
      lastUpdate: new Date().toISOString(),
      fallback: false
    };

    console.log('✅ Success:', stats);
    return NextResponse.json(stats);

  } catch (error) {
    console.error("🚨 Evolution API error:", error);
    
    // Return fallback data instead of error
    const fallbackStats = {
      totalMessages: 150,
      totalContacts: 45,
      totalChats: 12,
      instanceStatus: "disconnected",
      instanceName: INSTANCE_NAME,
      phoneNumber: "5561999449983",
      profileName: "Qify Assistant",
      lastUpdate: new Date().toISOString(),
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error"
    };
    
    console.log('🔄 Using fallback data:', fallbackStats);
    return NextResponse.json(fallbackStats);
  }
}