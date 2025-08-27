#!/usr/bin/env node

/**
 * Teste de Batching 120 segundos
 * Envia 3 mensagens em <5s e valida batching de 120s
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

class BatchingTest {
  constructor() {
    this.testCorrelationId = uuidv4();
    this.testSessionId = `test-session-${uuidv4()}`;
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';
    this.results = {
      messages: [],
      batchingWorked: false,
      responseGenerated: false
    };
  }

  log(message, data = null) {
    console.log(`[BATCHING-TEST] ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  error(message, error = null) {
    console.error(`[BATCHING-TEST] ❌ ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }

  success(message, data = null) {
    console.log(`[BATCHING-TEST] ✅ ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendTestMessage(text, delay = 0) {
    if (delay > 0) {
      await this.sleep(delay);
    }

    const messageId = `batch-test-${Date.now()}-${Math.random()}`;
    const payload = {
      text,
      providerMessageId: messageId,
      sessionId: this.testSessionId,
      instanceName: 'test-batching'
    };

    this.log(`📤 Sending message: "${text}"`);

    try {
      // Using curl instead of node-fetch to avoid ES module issues
      const { execSync } = require('child_process');
      
      const curlCommand = `curl -X POST "${this.baseUrl}/api/webhook/test" \\
        -H "Content-Type: application/json" \\
        -d '${JSON.stringify(payload)}' \\
        --max-time 30 \\
        --silent`;

      const response = execSync(curlCommand, { encoding: 'utf8' });
      const result = JSON.parse(response);

      if (result.success) {
        this.success(`Message sent: ${messageId}`);
        this.results.messages.push({
          messageId,
          text,
          timestamp: Date.now(),
          batchWindow: result.result?.batchWindow,
          correlationId: result.correlationId
        });
        return result;
      } else {
        this.error(`Failed to send message: ${result.error}`);
        return null;
      }

    } catch (error) {
      this.error(`HTTP error sending message`, error);
      return null;
    }
  }

  async testBatchingBehavior() {
    this.log('🔄 Testing 120s batching behavior...');
    this.log(`Using test session: ${this.testSessionId}`);

    const messages = [
      'Sou o Guilherme',
      'da Iceberg Marketing',
      'preciso de assessoria de vendas'
    ];

    // Send 3 messages with 1 second intervals (all within 5 seconds)
    const startTime = Date.now();
    const sendPromises = [];

    for (let i = 0; i < messages.length; i++) {
      sendPromises.push(
        this.sendTestMessage(messages[i], i * 1000) // 0s, 1s, 2s delays
      );
    }

    const results = await Promise.allSettled(sendPromises);
    const sendEndTime = Date.now();
    const sendingDuration = sendEndTime - startTime;

    this.log(`All messages sent in ${sendingDuration}ms`);

    // Check results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    if (successful !== messages.length) {
      this.error(`Only ${successful}/${messages.length} messages sent successfully`);
      return false;
    }

    // Check that all messages share the same batch window
    const batchWindows = this.results.messages
      .map(m => m.batchWindow)
      .filter(Boolean);

    if (batchWindows.length === 0) {
      this.error('No batch windows returned from messages');
      return false;
    }

    const uniqueWindows = [...new Set(batchWindows)];
    if (uniqueWindows.length !== 1) {
      this.error(`Messages assigned to different batch windows:`, uniqueWindows);
      return false;
    }

    const batchWindow = uniqueWindows[0];
    const batchWindowDate = new Date(batchWindow);
    const expectedDelay = batchWindow - startTime;

    this.success(`All messages assigned to same batch window: ${batchWindowDate.toISOString()}`);
    this.success(`Expected processing delay: ${Math.round(expectedDelay / 1000)}s`);

    // Check if batch window is approximately 120 seconds from now
    const approximateDelay = expectedDelay / 1000;
    if (approximateDelay >= 115 && approximateDelay <= 125) {
      this.success('Batch delay is within expected 120s ± 5s range');
      this.results.batchingWorked = true;
    } else {
      this.error(`Batch delay ${approximateDelay}s is outside expected range (115-125s)`);
      return false;
    }

    return true;
  }

  async checkRedisState() {
    this.log('🔍 Checking Redis state after batch sending...');
    
    try {
      const { SessionStateManager } = require('../lib/sessionState');
      const sessionManager = new SessionStateManager(this.testSessionId);

      // Check pending messages count
      const pendingCount = await sessionManager.getPendingMessageCount();
      this.log(`Pending messages in Redis: ${pendingCount}`);

      // Check batch window
      const batchUntil = await sessionManager.getBatchUntil();
      if (batchUntil) {
        this.log(`Batch window ends at: ${new Date(batchUntil).toISOString()}`);
        this.log(`Time until processing: ${Math.round((batchUntil - Date.now()) / 1000)}s`);
      }

      // Check session state
      const state = await sessionManager.getState();
      this.log(`Session SPIN stage: ${state.stage}`);
      this.log(`Asked questions: ${Array.from(state.asked).join(', ')}`);
      this.log(`Facts collected:`, state.facts);

      return {
        pendingCount,
        batchUntil,
        stage: state.stage,
        asked: Array.from(state.asked),
        facts: state.facts
      };

    } catch (error) {
      this.error('Error checking Redis state', error);
      return null;
    }
  }

  async waitForBatchProcessing(timeoutSeconds = 180) {
    this.log(`⏳ Waiting up to ${timeoutSeconds}s for batch processing...`);
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    const checkInterval = 10000; // Check every 10 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { SessionStateManager } = require('../lib/sessionState');
        const sessionManager = new SessionStateManager(this.testSessionId);

        const pendingCount = await sessionManager.getPendingMessageCount();
        const batchUntil = await sessionManager.getBatchUntil();
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.log(`Check at ${elapsed}s: ${pendingCount} pending, batch until ${batchUntil ? new Date(batchUntil).toISOString() : 'null'}`);

        // If no more pending messages and no batch window, processing is done
        if (pendingCount === 0 && !batchUntil) {
          this.success('Batch processing completed - queue drained!');
          this.results.responseGenerated = true;
          return true;
        }

        // If batch window has passed but there are still pending messages, something's wrong
        if (batchUntil && Date.now() > batchUntil && pendingCount > 0) {
          this.error('Batch window passed but messages still pending');
          return false;
        }

      } catch (error) {
        this.log(`Error checking processing status: ${error.message}`);
      }

      await this.sleep(checkInterval);
    }

    this.error('Timeout waiting for batch processing');
    return false;
  }

  async cleanup() {
    this.log('🧹 Cleaning up test session...');
    
    try {
      const { SessionStateManager } = require('../lib/sessionState');
      const sessionManager = new SessionStateManager(this.testSessionId);
      
      await sessionManager.cleanup();
      this.success('Test session cleaned up');
      
    } catch (error) {
      this.error('Error during cleanup', error);
    }
  }

  async run() {
    console.log('🧪 Starting 120s Batching Test...');
    console.log(`Test correlation ID: ${this.testCorrelationId}`);
    console.log(`Test session ID: ${this.testSessionId}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Test batching behavior
      const batchingOk = await this.testBatchingBehavior();
      if (!batchingOk) {
        this.error('Batching behavior test failed');
        return false;
      }

      // Step 2: Check Redis state
      const redisState = await this.checkRedisState();
      if (!redisState) {
        this.error('Redis state check failed');
        return false;
      }

      // Step 3: Wait for processing (shortened for testing)
      // Note: In production this would be 120s, but we can reduce for testing
      const processingOk = await this.waitForBatchProcessing(30); // 30s timeout for testing
      if (!processingOk) {
        this.error('Batch processing wait failed');
      }

      return processingOk;

    } finally {
      await this.cleanup();
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCHING TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Test ID: ${this.testCorrelationId}`);
    console.log(`Session ID: ${this.testSessionId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('\nResults:');
    console.log(JSON.stringify(this.results, null, 2));
    console.log('='.repeat(60));

    return this.results;
  }
}

// Main execution
async function main() {
  const tester = new BatchingTest();
  
  try {
    const success = await tester.run();
    await tester.generateReport();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('Fatal error during batching test:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BatchingTest };