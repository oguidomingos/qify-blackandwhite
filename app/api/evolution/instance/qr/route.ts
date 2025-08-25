import { NextRequest, NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json(
        { success: false, message: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`🔍 Getting QR code for instance: ${instanceName}`);

    // Tentar múltiplos endpoints para QR code
    const qrEndpoints = [
      `/instance/connect/${instanceName}`,
      `/instance/connectionState/${instanceName}`,
      `/instance/qrcode/${instanceName}`
    ];

    let qrData = null;
    let lastError = null;

    for (const endpoint of qrEndpoints) {
      try {
        console.log(`🔄 Trying QR endpoint: ${endpoint}`);
        
        const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ QR endpoint working: ${endpoint}`, result);
          
          // Procurar QR code nos diferentes formatos de resposta
          if (result.qrcode) {
            qrData = result.qrcode;
            break;
          } else if (result.qr) {
            qrData = result.qr;
            break;
          } else if (result.base64) {
            qrData = result.base64;
            break;
          } else if (typeof result === 'string' && result.includes('data:image')) {
            qrData = result;
            break;
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ QR endpoint ${endpoint} failed: ${response.status} - ${errorText}`);
          lastError = new Error(`${endpoint}: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`🚨 Error with QR endpoint ${endpoint}:`, error);
        lastError = error instanceof Error ? error : new Error(`Failed: ${endpoint}`);
      }
    }

    if (!qrData) {
      // Se não conseguiu QR, tente reconectar a instância
      console.log(`🔄 Attempting to restart instance: ${instanceName}`);
      
      try {
        const restartResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/restart/${instanceName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!
          }
        });

        if (restartResponse.ok) {
          // Aguardar um momento e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY!
            }
          });

          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            if (retryResult.qrcode || retryResult.qr || retryResult.base64) {
              qrData = retryResult.qrcode || retryResult.qr || retryResult.base64;
            }
          }
        }
      } catch (restartError) {
        console.log("Failed to restart instance:", restartError);
      }
    }

    if (qrData) {
      // Garantir que o QR code está no formato correto
      if (!qrData.startsWith('data:image')) {
        qrData = `data:image/png;base64,${qrData}`;
      }

      return NextResponse.json({
        success: true,
        message: "QR Code gerado com sucesso!",
        qrCode: qrData,
        instanceName,
        timestamp: new Date().toISOString()
      });
    }

    throw lastError || new Error('Nenhum endpoint de QR code funcionou');

  } catch (error) {
    console.error("🚨 Error getting QR code:", error);
    
    return NextResponse.json({
      success: false,
      message: "Erro ao obter QR Code. Instância pode já estar conectada ou precisa ser recriada.",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      suggestion: "Tente criar uma nova instância com nome diferente"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST para obter QR code de uma instância",
    example: {
      instanceName: "qify-test-123"
    },
    endpoints_tried: [
      "/instance/connect/{instanceName}",
      "/instance/connectionState/{instanceName}",
      "/instance/qrcode/{instanceName}"
    ]
  });
}