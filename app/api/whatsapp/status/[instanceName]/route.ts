import { NextRequest, NextResponse } from "next/server";

// API key protegida
const EVOLUTION_API_KEY = "509dbd54-c20c-4a5b-b889-a0494a861f5a";

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
    response = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      // Try the fetchInstances endpoint as fallback
      const fetchResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/fetchInstances`, {
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