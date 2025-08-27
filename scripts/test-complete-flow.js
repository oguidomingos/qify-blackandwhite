#!/usr/bin/env node

/**
 * Complete end-to-end test script for Qify system
 * Tests the entire flow: webhook -> batching -> AI processing -> response
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  evolutionBaseUrl: process.env.EVOLUTION_BASE_URL || 'https://evolutionapi.centralsupernova.com.br',
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  testInstanceName: 'qify-blackandwhite',
  testPhoneNumber: '5561999449983',
  webhookDelay: 125000, // 125 seconds to test batching
  maxWaitTime: 180000, // 3 minutes max wait
};

// Test data
const testMessages = [
  {
    event: "messages.upsert",
    data: {
      key: {
        remoteJid: "5561987654321@s.whatsapp.net",
        fromMe: false,
        id: `test-msg-${Date.now()}-1`
      },
      message: {
        conversation: "Olá! Gostaria de saber mais sobre seus serviços."
      },
      pushName: "João Silva",
      messageTimestamp: Date.now()
    }
  },
  {
    event: "messages.upsert", 
    data: {
      key: {
        remoteJid: "5561987654321@s.whatsapp.net",
        fromMe: false,
        id: `test-msg-${Date.now()}-2`
      },
      message: {
        conversation: "Meu nome é João Silva e represento a empresa TechCorp Ltda."
      },
      pushName: "João Silva",
      messageTimestamp: Date.now() + 1000
    }
  },
  {
    event: "messages.upsert",
    data: {
      key: {
        remoteJid: "5561987654321@s.whatsapp.net", 
        fromMe: false,
        id: `test-msg-${Date.now()}-3`
      },
      message: {
        conversation: "Estamos procurando soluções de automação para nossa equipe de vendas."
      },
      pushName: "João Silva", 
      messageTimestamp: Date.now() + 2000
    }
  }
];

class TestRunner {
  constructor() {
    this.correlationId = uuidv4();
    this.results = {
      webhook: [],
      batching: null,
      ai: null,
      evolution: null,
      overall: false
    };
  }

  log(message, data = null) {
    console.log(`[${this.correlationId}] ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  error(message, error = null) {
    console.error(`[${this.correlationId}] ❌ ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }

  success(message, data = null) {
    console.log(`[${this.correlationId}] ✅ ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testEvolutionApiHealth() {
    this.log('🔍 Testing Evolution API health...');
    
    try {
      const response = await fetch(`${config.baseUrl}/api/convex/wa/validateEvolutionEndpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: config.evolutionBaseUrl,
          apiKey: config.evolutionApiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      this.results.evolution = result;

      if (result.success) {
        this.success(`Evolution API health check passed: ${result.summary.working}/${result.summary.total} endpoints working`);
        return true;
      } else {
        this.error('Evolution API health check failed', result);
        return false;
      }

    } catch (error) {
      this.error('Failed to test Evolution API health', error);
      this.results.evolution = { success: false, error: error.message };
      return false;
    }
  }

  async sendWebhookMessage(message) {
    this.log(`📤 Sending webhook message: ${message.data.key.id}`);
    
    try {
      const response = await fetch(`${config.baseUrl}/api/webhook/whatsapp/${config.testInstanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API/1.0'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      this.success(`Webhook message sent successfully`, {
        messageId: message.data.key.id,
        correlationId: result.correlationId,
        processingTime: result.processingTimeMs
      });

      this.results.webhook.push({
        messageId: message.data.key.id,
        success: true,
        correlationId: result.correlationId,
        processingTime: result.processingTimeMs,
        batchWindow: result.result?.batchWindow
      });

      return result;

    } catch (error) {
      this.error(`Failed to send webhook message ${message.data.key.id}`, error);
      
      this.results.webhook.push({
        messageId: message.data.key.id,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  async testBatchingBehavior() {
    this.log('🔄 Testing batching behavior with multiple messages...');
    
    const sendPromises = [];
    const sendInterval = 5000; // 5 seconds between messages
    
    // Send messages with staggered timing
    for (let i = 0; i < testMessages.length; i++) {
      sendPromises.push(
        this.sleep(i * sendInterval).then(() => this.sendWebhookMessage(testMessages[i]))
      );
    }

    try {
      const results = await Promise.allSettled(sendPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.log(`Batch sending completed: ${successful} successful, ${failed} failed`);

      if (successful > 0) {
        this.success('At least some messages were processed successfully');
        
        // All successful messages should have the same batch window
        const batchWindows = this.results.webhook
          .filter(r => r.success && r.batchWindow)
          .map(r => r.batchWindow);
          
        if (batchWindows.length > 1) {
          const uniqueWindows = [...new Set(batchWindows)];
          if (uniqueWindows.length === 1) {
            this.success(`All messages assigned to same batch window: ${new Date(uniqueWindows[0]).toISOString()}`);
            this.results.batching = { success: true, batchWindow: uniqueWindows[0] };
          } else {
            this.error('Messages were assigned to different batch windows', uniqueWindows);
            this.results.batching = { success: false, error: 'Multiple batch windows' };
          }
        }

        return successful > 0;
      } else {
        this.error('All webhook messages failed');
        return false;
      }

    } catch (error) {
      this.error('Error during batch testing', error);
      return false;
    }
  }

  async waitForAiResponse() {
    this.log(`⏳ Waiting for AI processing (up to ${config.maxWaitTime / 1000} seconds)...`);
    
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds
    
    while (Date.now() - startTime < config.maxWaitTime) {
      try {
        // Check Redis for any session activity
        const response = await fetch(`${config.baseUrl}/api/test/check-session-activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: '5561987654321',
            correlationId: this.correlationId
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.aiProcessingCompleted) {
            this.success('AI processing completed!', {
              sessionId: data.sessionId,
              responseGenerated: data.responseGenerated,
              processingTime: data.processingTime
            });
            
            this.results.ai = {
              success: true,
              sessionId: data.sessionId,
              processingTime: data.processingTime,
              responseGenerated: data.responseGenerated
            };
            
            return true;
          } else {
            this.log(`AI processing still pending... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
          }
        }

      } catch (error) {
        this.log('Error checking session activity:', error.message);
      }

      await this.sleep(checkInterval);
    }

    this.error('AI processing timeout - no response generated within time limit');
    this.results.ai = { success: false, error: 'Timeout' };
    return false;
  }

  async generateSummaryReport() {
    const webhookSuccess = this.results.webhook.filter(r => r.success).length;
    const webhookTotal = this.results.webhook.length;
    
    const report = {
      testId: this.correlationId,
      timestamp: new Date().toISOString(),
      config: {
        instanceName: config.testInstanceName,
        phoneNumber: config.testPhoneNumber,
        messagesCount: testMessages.length
      },
      results: {
        evolution: this.results.evolution,
        webhook: {
          total: webhookTotal,
          successful: webhookSuccess,
          failed: webhookTotal - webhookSuccess,
          messages: this.results.webhook
        },
        batching: this.results.batching,
        ai: this.results.ai
      },
      overall: this.results.overall
    };

    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));

    return report;
  }

  async run() {
    try {
      this.log('🚀 Starting complete end-to-end test...');
      this.log(`Test ID: ${this.correlationId}`);
      this.log(`Instance: ${config.testInstanceName}`);
      this.log(`Base URL: ${config.baseUrl}`);

      // Step 1: Test Evolution API health
      const evolutionHealthy = await this.testEvolutionApiHealth();
      if (!evolutionHealthy) {
        this.error('Evolution API health check failed - aborting test');
        return await this.generateSummaryReport();
      }

      // Step 2: Test webhook ingestion and batching
      const batchingWorking = await this.testBatchingBehavior();
      if (!batchingWorking) {
        this.error('Webhook/batching test failed - aborting test');
        return await this.generateSummaryReport();
      }

      // Step 3: Wait for AI processing
      const aiWorking = await this.waitForAiResponse();
      
      // Determine overall success
      this.results.overall = evolutionHealthy && batchingWorking && aiWorking;

      if (this.results.overall) {
        this.success('🎉 Complete end-to-end test PASSED!');
      } else {
        this.error('❌ Complete end-to-end test FAILED');
      }

      return await this.generateSummaryReport();

    } catch (error) {
      this.error('Unexpected error during test execution', error);
      return await this.generateSummaryReport();
    }
  }
}

// Main execution
async function main() {
  const testRunner = new TestRunner();
  
  try {
    const report = await testRunner.run();
    
    // Exit with appropriate code
    process.exit(report.overall ? 0 : 1);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestRunner, config, testMessages };