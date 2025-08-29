import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "roigem";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    evolutionBaseUrl: EVOLUTION_BASE_URL,
    apiKeyLength: EVOLUTION_API_KEY?.length || 0,
    tests: [] as any[]
  };

  // Test 1: Basic connectivity to Evolution API base
  try {
    console.log('🔍 Testing basic connectivity...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const pingResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Qify/1.0)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    results.tests.push({
      name: "Basic Connectivity (/instance/fetchInstances)",
      success: pingResponse.ok,
      status: pingResponse.status,
      statusText: pingResponse.statusText,
      method: "GET"
    });

    if (pingResponse.ok) {
      const instances = await pingResponse.json();
      results.tests[0].instancesFound = instances?.length || 0;
      results.tests[0].roigemFound = instances?.some((i: any) => i.name === INSTANCE_NAME) || false;
    }

  } catch (error: any) {
    results.tests.push({
      name: "Basic Connectivity (/instance/fetchInstances)",
      success: false,
      error: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      method: "GET"
    });
  }

  // Test 2: Official contacts endpoint (exact Insomnia config)
  try {
    console.log('🔍 Testing official contacts endpoint (Insomnia config)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    results.tests.push({
      name: "Contacts Endpoint (/chat/findContacts/roigem) - Insomnia Config",
      success: contactsResponse.ok,
      status: contactsResponse.status,
      statusText: contactsResponse.statusText,
      method: "POST (Insomnia)"
    });

    if (contactsResponse.ok) {
      const data = await contactsResponse.json();
      results.tests[results.tests.length - 1].dataReceived = Array.isArray(data) ? data.length : 'Object';
    }

  } catch (error: any) {
    results.tests.push({
      name: "Contacts Endpoint (/chat/findContacts/roigem) - Insomnia Config",
      success: false,
      error: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      method: "POST (Insomnia)"
    });
  }

  // Test 3: Try POST method for contacts
  try {
    console.log('🔍 Testing contacts endpoint with POST...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Qify/1.0)'
      },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    results.tests.push({
      name: "Contacts Endpoint (/chat/findContacts/roigem)",
      success: contactsResponse.ok,
      status: contactsResponse.status,
      statusText: contactsResponse.statusText,
      method: "POST"
    });

  } catch (error: any) {
    results.tests.push({
      name: "Contacts Endpoint (/chat/findContacts/roigem)",
      success: false,
      error: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      method: "POST"
    });
  }

  // Test 4: Messages endpoint
  try {
    console.log('🔍 Testing messages endpoint...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const messagesResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findMessages/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Qify/1.0)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    results.tests.push({
      name: "Messages Endpoint (/chat/findMessages/roigem)",
      success: messagesResponse.ok,
      status: messagesResponse.status,
      statusText: messagesResponse.statusText,
      method: "GET"
    });

  } catch (error: any) {
    results.tests.push({
      name: "Messages Endpoint (/chat/findMessages/roigem)",
      success: false,
      error: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      method: "GET"
    });
  }

  // Test 5: Chats endpoint
  try {
    console.log('🔍 Testing chats endpoint...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const chatsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findChats/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Qify/1.0)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    results.tests.push({
      name: "Chats Endpoint (/chat/findChats/roigem)",
      success: chatsResponse.ok,
      status: chatsResponse.status,
      statusText: chatsResponse.statusText,
      method: "GET"
    });

  } catch (error: any) {
    results.tests.push({
      name: "Chats Endpoint (/chat/findChats/roigem)",
      success: false,
      error: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      method: "GET"
    });
  }

  // Summary
  const successfulTests = results.tests.filter(t => t.success).length;
  const totalTests = results.tests.length;
  
  results.summary = {
    successful: successfulTests,
    failed: totalTests - successfulTests,
    total: totalTests,
    overallSuccess: successfulTests === totalTests
  };

  console.log('🎯 Connection test results:', results.summary);

  return NextResponse.json(results);
}