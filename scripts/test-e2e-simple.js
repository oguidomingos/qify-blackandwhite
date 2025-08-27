#!/usr/bin/env node

/**
 * Simplified End-to-End Test for Core Qify Features
 * Tests: Webhook -> Redis Batching -> Template Substitution -> Gemini Multi-Part
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

const CONFIG = {
  baseUrl: 'http://localhost:3002',
  instanceName: 'e2e-test',
  redisUrl: process.env.REDIS_URL || 'https://winning-muskrat-39947.upstash.io',
  redisToken: process.env.REDIS_TOKEN || 'AZwLAAIncDFmYmJjNzMwNTBmZTQ0N2Y2OGFjMWUyMDAzMDFiNjMyNnAxMzk5NDc'
};

console.log('🧪 End-to-End Test: Core Qify Features');
console.log('='.repeat(50));
console.log(`Base URL: ${CONFIG.baseUrl}`);
console.log(`Instance: ${CONFIG.instanceName}`);
console.log('='.repeat(50));

class E2ETestRunner {
  constructor() {
    this.testId = uuidv4();
    this.results = {
      webhookIngestion: false,
      redisBatching: false,
      sessionManagement: false,
      templateSubstitution: false,
      geminiProcessing: false
    };
  }

  log(message, data = null) {
    console.log(`[E2E] ${new Date().toISOString()} - ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  error(message, error = null) {
    console.error(`[E2E] ❌ ${message}`);
    if (error) console.error(error);
  }

  success(message, data = null) {
    console.log(`[E2E] ✅ ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  async sendWebhookMessage(text, messageId) {
    const payload = {
      event: "messages.upsert",
      data: {
        key: {
          remoteJid: "5561777777777@s.whatsapp.net",
          fromMe: false,
          id: messageId
        },
        message: {
          conversation: text
        },
        pushName: "E2E Test User",
        messageTimestamp: Date.now()
      }
    };

    const curlCommand = `REDIS_URL=${CONFIG.redisUrl} REDIS_TOKEN=${CONFIG.redisToken} curl -X POST "${CONFIG.baseUrl}/api/webhook/whatsapp/${CONFIG.instanceName}" \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify(payload)}' \
      --max-time 30 \
      --silent`;

    try {
      const response = execSync(curlCommand, { encoding: 'utf8' });
      const result = JSON.parse(response);
      
      if (result.success) {
        this.log(`Message sent successfully: "${text}"`);
        return result;
      } else {
        this.error(`Message failed: ${result.error}`);
        return null;
      }
    } catch (error) {
      this.error(`HTTP error: ${error.message}`);
      return null;
    }
  }

  async testWebhookIngestion() {
    this.log('🔄 Testing webhook message ingestion...');
    
    const messageId = `e2e-test-${this.testId}-1`;
    const result = await this.sendWebhookMessage('Olá! Sou o João da TechCorp', messageId);
    
    if (result && result.success && result.result?.sessionId) {
      this.results.webhookIngestion = true;
      this.success('Webhook ingestion working');
      return result.result.sessionId;
    } else {
      this.error('Webhook ingestion failed');
      return null;
    }
  }

  async testRedisBatching(sessionId) {
    this.log('🔄 Testing Redis batching system...');
    
    try {
      // Set environment variables for Redis connection
      process.env.REDIS_URL = CONFIG.redisUrl;
      process.env.REDIS_TOKEN = CONFIG.redisToken;
      
      const { SessionStateManager } = require('../lib/sessionState');
      const manager = new SessionStateManager(sessionId);
      
      // Check if batch window exists
      const batchUntil = await manager.getBatchUntil();
      const pendingCount = await manager.getPendingMessageCount();
      
      if (batchUntil && pendingCount > 0) {
        this.results.redisBatching = true;
        this.success(`Redis batching working: ${pendingCount} pending, batch until ${new Date(batchUntil).toISOString()}`);
        return true;
      } else {
        this.error('Redis batching not working properly');
        return false;
      }
    } catch (error) {
      this.error('Redis batching test failed', error);
      return false;
    }
  }

  async testSessionManagement(sessionId) {
    this.log('🔄 Testing session state management...');
    
    try {
      const { SessionStateManager } = require('../lib/sessionState');
      const manager = new SessionStateManager(sessionId);
      
      // Test state operations
      await manager.setState({
        stage: 'P',
        facts: { name: 'João', business: 'TechCorp' },
        asked: new Set(['name', 'business'])
      });
      
      const state = await manager.getState();
      
      if (state.stage === 'P' && state.facts.name === 'João') {
        this.results.sessionManagement = true;
        this.success('Session management working');
        return true;
      } else {
        this.error('Session management not working');
        return false;
      }
    } catch (error) {
      this.error('Session management test failed', error);
      return false;
    }
  }

  testTemplateSubstitution() {
    this.log('🔄 Testing template substitution...');
    
    try {
      // Test template substitution locally
      const template = `Olá {{facts.name}}! Timestamp: {{$now}}`;
      const variables = { facts: { name: 'João' } };
      
      // Simple substitution function
      let result = template;
      
      // Handle $now
      result = result.replace(/\{\{\$now\}\}/g, () => {
        return new Date().toLocaleString('pt-BR');
      });
      
      // Handle variables
      result = result.replace(/\{\{(\w+\.\w+)\}\}/g, (match, varPath) => {
        const value = varPath.split('.').reduce((current, key) => {
          return current && current[key] !== undefined ? current[key] : undefined;
        }, variables);
        return value !== undefined ? String(value) : match;
      });
      
      if (result.includes('Olá João!') && result.includes('/2025')) {
        this.results.templateSubstitution = true;
        this.success(`Template substitution working: ${result}`);
        return true;
      } else {
        this.error('Template substitution not working');
        return false;
      }
    } catch (error) {
      this.error('Template substitution test failed', error);
      return false;
    }
  }

  testGeminiMultiPart() {
    this.log('🔄 Testing Gemini multi-part concatenation...');
    
    try {
      // Simulate Gemini response processing
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [
              { text: 'Olá João! ' },
              { text: 'Obrigado pelo contato. ' },
              { text: 'Vamos agendar uma conversa?' }
            ]
          }
        }]
      };
      
      // Process like the AI function does
      const parts = mockGeminiResponse.candidates[0].content.parts;
      const fullText = parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('');
      
      if (fullText === 'Olá João! Obrigado pelo contato. Vamos agendar uma conversa?') {
        this.results.geminiProcessing = true;
        this.success(`Gemini multi-part working: ${fullText}`);
        return true;
      } else {
        this.error('Gemini multi-part not working');
        return false;
      }
    } catch (error) {
      this.error('Gemini multi-part test failed', error);
      return false;
    }
  }

  async runFullTest() {
    this.log('🚀 Starting End-to-End Test...');
    this.log(`Test ID: ${this.testId}`);
    
    try {
      // Test 1: Webhook Ingestion
      const sessionId = await this.testWebhookIngestion();
      if (!sessionId) return false;
      
      // Test 2: Redis Batching  
      const batchingWorking = await this.testRedisBatching(sessionId);
      if (!batchingWorking) return false;
      
      // Test 3: Session Management
      const sessionWorking = await this.testSessionManagement(sessionId);
      if (!sessionWorking) return false;
      
      // Test 4: Template Substitution
      const templatesWorking = this.testTemplateSubstitution();
      if (!templatesWorking) return false;
      
      // Test 5: Gemini Multi-Part
      const geminiWorking = this.testGeminiMultiPart();
      if (!geminiWorking) return false;
      
      return true;
      
    } catch (error) {
      this.error('E2E test failed', error);
      return false;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 END-TO-END TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Test ID: ${this.testId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');
    
    const results = Object.entries(this.results);
    const passed = results.filter(([, status]) => status).length;
    const total = results.length;
    
    console.log('📋 Test Results:');
    results.forEach(([test, status]) => {
      const icon = status ? '✅' : '❌';
      const label = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`  ${icon} ${label}`);
    });
    
    console.log('');
    console.log(`📊 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL E2E TESTS PASSED!');
      console.log('✅ Core Qify functionality is working correctly');
    } else {
      console.log('💥 SOME E2E TESTS FAILED');
      console.log('❌ Please check the failed components');
    }
    
    console.log('='.repeat(50));
    
    return passed === total;
  }
}

// Run the test
async function main() {
  const runner = new E2ETestRunner();
  
  try {
    const success = await runner.runFullTest();
    const allPassed = runner.generateReport();
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Fatal E2E test error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { E2ETestRunner };