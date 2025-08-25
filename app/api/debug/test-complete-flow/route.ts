import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

interface FlowTestResult {
  success: boolean;
  step: string;
  details: any;
  error?: string;
  timestamp: string;
}

async function testInstanceConnection(instanceName: string): Promise<FlowTestResult> {
  try {
    console.log(`🔍 Testing connection to instance: ${instanceName}`);
    
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      timeout: 10000
    });

    const data = await response.json();
    
    return {
      success: response.ok && data.state === 'open',
      step: 'instance_connection',
      details: {
        instanceName,
        status: response.status,
        state: data.state,
        response: data
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      step: 'instance_connection',
      details: { instanceName },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

async function testMessageSending(instanceName: string, targetNumber: string, message: string): Promise<FlowTestResult> {
  try {
    console.log(`📤 Testing message sending via ${instanceName} to ${targetNumber}`);
    
    const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        number: targetNumber,
        text: message,
        delay: 0
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        step: 'message_sending',
        details: {
          instanceName,
          targetNumber,
          message,
          response: data
        },
        timestamp: new Date().toISOString()
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      step: 'message_sending',
      details: {
        instanceName,
        targetNumber,
        status: response.status,
        errorText
      },
      error: `Failed to send: ${response.status} - ${errorText}`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      step: 'message_sending',
      details: { instanceName, targetNumber },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

async function testWebhookProcessing(instanceName: string, simulatedMessage: any): Promise<FlowTestResult> {
  try {
    console.log(`🔗 Testing webhook processing for ${instanceName}`);
    
    // Simulate webhook call to our own endpoint
    const webhookUrl = `http://localhost:3000/api/webhook/whatsapp/${instanceName}`;
    
    const webhookPayload = {
      event: "messages.upsert",
      data: simulatedMessage
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload),
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        step: 'webhook_processing',
        details: {
          instanceName,
          webhookUrl,
          response: data,
          simulatedMessage
        },
        timestamp: new Date().toISOString()
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      step: 'webhook_processing',
      details: {
        instanceName,
        webhookUrl,
        status: response.status,
        errorText
      },
      error: `Webhook failed: ${response.status} - ${errorText}`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      step: 'webhook_processing',
      details: { instanceName },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

async function getWorkingInstances(): Promise<string[]> {
  try {
    console.log('🔍 Finding working instances...');
    
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      timeout: 10000
    });

    if (response.ok) {
      const instances = await response.json();
      console.log(`📋 Found ${instances.length} total instances`);
      
      // Filter for open/connected instances (any instance, not just qify- prefixed)
      const workingInstances = instances
        .filter((instance: any) => instance.connectionStatus === 'open' || instance.connectionStatus?.state === 'open')
        .map((instance: any) => instance.instanceName || instance.name)
        .filter((name: string) => name && name.trim().length > 0);

      console.log(`✅ Working instances: ${workingInstances.join(', ')}`);
      return workingInstances;
    }
    
    return [];
  } catch (error) {
    console.error('🚨 Error getting working instances:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const { targetNumber, testMessage, skipWebhookTest } = await request.json();
  
  const defaultTarget = targetNumber || "5561999449983";
  const defaultMessage = testMessage || `🔧 Teste completo do sistema Qify - ${new Date().toLocaleString()}`;
  
  console.log('🧪 Starting complete flow test...');
  console.log('📞 Target number:', defaultTarget);
  console.log('💬 Test message:', defaultMessage);

  const results: FlowTestResult[] = [];

  try {
    // Step 1: Get working instances
    console.log('\n🔍 STEP 1: Finding working instances...');
    const workingInstances = await getWorkingInstances();
    
    if (workingInstances.length === 0) {
      results.push({
        success: false,
        step: 'find_instances',
        details: { message: 'No working instances found' },
        error: 'No working Evolution API instances available',
        timestamp: new Date().toISOString()
      });
    } else {
      results.push({
        success: true,
        step: 'find_instances',
        details: { 
          totalFound: workingInstances.length,
          instances: workingInstances 
        },
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Test connection to each instance
    console.log('\n🔗 STEP 2: Testing instance connections...');
    const connectionPromises = workingInstances.map(instance => testInstanceConnection(instance));
    const connectionResults = await Promise.all(connectionPromises);
    results.push(...connectionResults);

    // Get successfully connected instances
    const connectedInstances = connectionResults
      .filter(result => result.success)
      .map(result => result.details.instanceName);

    // Step 3: Test message sending
    if (connectedInstances.length > 0) {
      console.log('\n📤 STEP 3: Testing message sending...');
      
      // Test with first working instance
      const testInstance = connectedInstances[0];
      const sendResult = await testMessageSending(testInstance, defaultTarget, defaultMessage);
      results.push(sendResult);
      
      // Step 4: Test webhook processing (if not skipped)
      if (!skipWebhookTest && sendResult.success) {
        console.log('\n🔗 STEP 4: Testing webhook processing...');
        
        const simulatedWebhookData = {
          key: {
            id: `test-${Date.now()}`,
            remoteJid: `${defaultTarget}@s.whatsapp.net`,
            fromMe: false
          },
          message: {
            conversation: "Teste de mensagem para webhook"
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: "Teste Usuario"
        };

        const webhookResult = await testWebhookProcessing(testInstance, simulatedWebhookData);
        results.push(webhookResult);
      }
    } else {
      results.push({
        success: false,
        step: 'message_sending',
        details: { message: 'No connected instances available' },
        error: 'Cannot test sending - no instances connected',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate overall success
    const successfulSteps = results.filter(r => r.success).length;
    const totalSteps = results.length;
    const overallSuccess = successfulSteps === totalSteps;

    console.log(`\n📊 TEST COMPLETED: ${successfulSteps}/${totalSteps} steps successful`);

    return NextResponse.json({
      success: overallSuccess,
      summary: {
        totalSteps,
        successfulSteps,
        failedSteps: totalSteps - successfulSteps,
        overallSuccess,
        testTarget: defaultTarget,
        testMessage: defaultMessage
      },
      results,
      workingInstances,
      connectedInstances: connectedInstances || [],
      timestamp: new Date().toISOString(),
      message: overallSuccess 
        ? '✅ Todos os testes passaram! Sistema funcionando corretamente.' 
        : '⚠️ Alguns testes falharam. Verifique os detalhes acima.'
    });

  } catch (error) {
    console.error('🚨 Critical error in flow test:', error);
    
    return NextResponse.json({
      success: false,
      summary: {
        totalSteps: results.length,
        successfulSteps: results.filter(r => r.success).length,
        failedSteps: results.filter(r => !r.success).length,
        overallSuccess: false
      },
      results,
      error: error instanceof Error ? error.message : 'Unknown critical error',
      message: '🚨 Erro crítico durante teste do sistema',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint to run complete flow test",
    example: {
      targetNumber: "5561999449983",
      testMessage: "Custom test message",
      skipWebhookTest: false
    },
    steps: [
      "1. Find working Evolution API instances",
      "2. Test connection to each instance",
      "3. Test message sending via working instance",
      "4. Test webhook processing (optional)"
    ]
  });
}