import { NextRequest, NextResponse } from "next/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_API_TOKEN;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const { instanceName } = params;

    if (!instanceName) {
      return NextResponse.json(
        { error: "Instance name is required" },
        { status: 400 }
      );
    }

    // Try multiple endpoints to get accurate status
    let response;

    // First try the connectionState endpoint
    if (!EVOLUTION_API_KEY || !EVOLUTION_BASE_URL) {
      const account = await fetchQuery(api.wa.getByInstance, { instanceName });
      return NextResponse.json({
        success: true,
        connected: account?.status === "connected",
        status: account?.status || "unknown",
        instanceName,
        rawData: account || null,
      });
    }

    response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      // Try the fetchInstances endpoint as fallback
      const fetchResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      if (fetchResponse.ok) {
        const instances = await fetchResponse.json();
        console.log('All instances:', instances);
        
        // Find our instance in the list
        const ourInstance = instances.find((inst: any) => 
          inst.instance?.instanceName === instanceName || 
          inst.instanceName === instanceName
        );
        
        if (ourInstance) {
          console.log('Found our instance:', ourInstance);
          const state = ourInstance.instance?.state || ourInstance.state || 'unknown';
          const isConnected = state === 'open' || state === 'connected';
          
          await fetchMutation(api.wa.updateStatus, {
            instanceId: instanceName,
            status: isConnected ? "connected" : state,
          });

          return NextResponse.json({
            success: true,
            connected: isConnected,
            status: state,
            instanceName,
            rawData: ourInstance
          });
        }
      }
      
      throw new Error(`Evolution API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Status check for ${instanceName}:`, data);

    // A Evolution API pode retornar diferentes formatos de resposta
    let state;
    let isConnected = false;

    if (data.instance) {
      state = data.instance.state;
    } else if (data.state) {
      state = data.state;
    } else {
      state = 'unknown';
    }

    // Verificar diferentes possíveis estados de conexão
    if (state === 'open' || state === 'connected' || state === 'qr' || data.connected === true) {
      isConnected = true;
    }

    console.log(`Processed status - State: ${state}, Connected: ${isConnected}`);

    await fetchMutation(api.wa.updateStatus, {
      instanceId: instanceName,
      status: isConnected ? "connected" : state,
    });

    return NextResponse.json({
      success: true,
      connected: isConnected,
      status: state,
      instanceName,
      rawData: data // Para debug
    });

  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    return NextResponse.json(
      { error: "Failed to get WhatsApp status" },
      { status: 500 }
    );
  }
}
