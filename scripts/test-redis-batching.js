#!/usr/bin/env node

/**
 * Redis batching system test script
 * Tests Redis SessionStateManager functionality
 */

require('dotenv').config();
const { SessionStateManager, checkRedisConnection } = require('../lib/sessionState');
const { v4: uuidv4 } = require('uuid');

class RedisBatchingTest {
  constructor() {
    this.testSessionId = `test-session-${uuidv4()}`;
    this.sessionManager = new SessionStateManager(this.testSessionId);
    this.results = {
      connection: false,
      locks: false,
      batching: false,
      state: false,
      cleanup: false
    };
  }

  log(message, data = null) {
    console.log(`[REDIS-TEST] ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  error(message, error = null) {
    console.error(`[REDIS-TEST] ❌ ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }

  success(message, data = null) {
    console.log(`[REDIS-TEST] ✅ ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async testRedisConnection() {
    this.log('Testing Redis connection...');
    
    try {
      const connected = await checkRedisConnection();
      
      if (connected) {
        this.success('Redis connection successful');
        this.results.connection = true;
        return true;
      } else {
        this.error('Redis connection failed');
        return false;
      }
      
    } catch (error) {
      this.error('Redis connection error', error);
      return false;
    }
  }

  async testLockOperations() {
    this.log('Testing lock operations...');
    
    try {
      // Test acquiring lock
      const lockAcquired = await this.sessionManager.acquireLock(5000);
      if (!lockAcquired) {
        this.error('Failed to acquire lock');
        return false;
      }
      this.success('Lock acquired successfully');

      // Test acquiring same lock again (should fail)
      const duplicateLock = await this.sessionManager.acquireLock(1000);
      if (duplicateLock) {
        this.error('Duplicate lock should have failed');
        return false;
      }
      this.success('Duplicate lock correctly rejected');

      // Release lock
      await this.sessionManager.releaseLock();
      this.success('Lock released successfully');

      // Test acquiring after release (should work)
      const lockReacquired = await this.sessionManager.acquireLock(1000);
      if (!lockReacquired) {
        this.error('Failed to reacquire lock after release');
        return false;
      }
      this.success('Lock reacquired after release');

      await this.sessionManager.releaseLock();
      
      this.results.locks = true;
      return true;
      
    } catch (error) {
      this.error('Lock operations test failed', error);
      return false;
    }
  }

  async testBatchingOperations() {
    this.log('Testing batching operations...');
    
    try {
      const now = Date.now();
      const batchUntil = now + 120000; // 2 minutes from now
      
      // Set batch window
      await this.sessionManager.setBatchUntil(batchUntil);
      this.success(`Batch window set to: ${new Date(batchUntil).toISOString()}`);

      // Get batch window
      const retrievedBatchUntil = await this.sessionManager.getBatchUntil();
      if (retrievedBatchUntil !== batchUntil) {
        this.error(`Batch window mismatch: expected ${batchUntil}, got ${retrievedBatchUntil}`);
        return false;
      }
      this.success('Batch window retrieved correctly');

      // Add pending messages
      const testMessages = [
        { id: '1', text: 'Hello', timestamp: now },
        { id: '2', text: 'How are you?', timestamp: now + 1000 },
        { id: '3', text: 'I need help', timestamp: now + 2000 }
      ];

      for (const msg of testMessages) {
        await this.sessionManager.addPendingMessage(msg);
      }
      this.success(`Added ${testMessages.length} pending messages`);

      // Check pending count
      const pendingCount = await this.sessionManager.getPendingMessageCount();
      if (pendingCount !== testMessages.length) {
        this.error(`Pending count mismatch: expected ${testMessages.length}, got ${pendingCount}`);
        return false;
      }
      this.success(`Pending message count correct: ${pendingCount}`);

      // Drain pending messages
      const drainedMessages = await this.sessionManager.drainPendingMessages();
      if (drainedMessages.length !== testMessages.length) {
        this.error(`Drained count mismatch: expected ${testMessages.length}, got ${drainedMessages.length}`);
        return false;
      }
      this.success('Pending messages drained correctly', drainedMessages);

      // Verify queue is empty
      const remainingCount = await this.sessionManager.getPendingMessageCount();
      if (remainingCount !== 0) {
        this.error(`Queue should be empty, but has ${remainingCount} messages`);
        return false;
      }
      this.success('Queue correctly emptied after drain');

      // Clear batch window
      await this.sessionManager.clearBatchUntil();
      const clearedBatch = await this.sessionManager.getBatchUntil();
      if (clearedBatch !== null) {
        this.error(`Batch window should be null after clear, got ${clearedBatch}`);
        return false;
      }
      this.success('Batch window cleared successfully');

      this.results.batching = true;
      return true;
      
    } catch (error) {
      this.error('Batching operations test failed', error);
      return false;
    }
  }

  async testStateOperations() {
    this.log('Testing SPIN state operations...');
    
    try {
      // Test stage management
      await this.sessionManager.setStage('P');
      const stage = await this.sessionManager.getStage();
      if (stage !== 'P') {
        this.error(`Stage mismatch: expected P, got ${stage}`);
        return false;
      }
      this.success('Stage set and retrieved correctly');

      // Test asked/answered tracking
      const testQuestions = ['nome', 'empresa', 'problema'];
      const testAnswers = ['trabalho', 'orcamento', 'prazo'];

      for (const question of testQuestions) {
        await this.sessionManager.addAsked(question);
      }

      for (const answer of testAnswers) {
        await this.sessionManager.addAnswered(answer);
      }

      const asked = await this.sessionManager.getAsked();
      const answered = await this.sessionManager.getAnswered();

      if (asked.size !== testQuestions.length) {
        this.error(`Asked size mismatch: expected ${testQuestions.length}, got ${asked.size}`);
        return false;
      }

      if (answered.size !== testAnswers.length) {
        this.error(`Answered size mismatch: expected ${testAnswers.length}, got ${answered.size}`);
        return false;
      }

      this.success('Asked/answered tracking works correctly', {
        asked: Array.from(asked),
        answered: Array.from(answered)
      });

      // Test facts management
      await this.sessionManager.setFact('name', 'João Silva');
      await this.sessionManager.setFact('personType', 'PJ');
      await this.sessionManager.setFact('business', 'TechCorp Ltda');
      await this.sessionManager.setFact('contact', '61999887766');

      const facts = await this.sessionManager.getFacts();
      
      const expectedFacts = {
        name: 'João Silva',
        personType: 'PJ', 
        business: 'TechCorp Ltda',
        contact: '61999887766'
      };

      for (const [key, value] of Object.entries(expectedFacts)) {
        // Use loose comparison for numeric strings that Redis may convert
        if (facts[key] != value) {
          this.error(`Fact mismatch for ${key}: expected "${value}" (${typeof value}), got "${facts[key]}" (${typeof facts[key]})`);
          return false;
        }
      }

      this.success('Facts management works correctly', facts);

      // Test timestamp tracking
      const testTimestamp = Date.now();
      await this.sessionManager.setLastUserTimestamp(testTimestamp);
      const retrievedTimestamp = await this.sessionManager.getLastUserTimestamp();

      if (retrievedTimestamp !== testTimestamp) {
        this.error(`Timestamp mismatch: expected ${testTimestamp}, got ${retrievedTimestamp}`);
        return false;
      }

      this.success('Timestamp tracking works correctly');

      // Test complete state getter
      const completeState = await this.sessionManager.getState();
      
      this.success('Complete state retrieved successfully', {
        stage: completeState.stage,
        askedCount: completeState.asked.size,
        answeredCount: completeState.answered.size,
        factsCount: Object.keys(completeState.facts).length,
        hasTimestamp: !!completeState.lastUserTs
      });

      this.results.state = true;
      return true;
      
    } catch (error) {
      this.error('State operations test failed', error);
      return false;
    }
  }

  async testCleanup() {
    this.log('Testing cleanup operations...');
    
    try {
      // Cleanup all session data
      await this.sessionManager.cleanup();
      this.success('Session cleanup completed');

      // Verify everything was cleaned up
      const stage = await this.sessionManager.getStage();
      const asked = await this.sessionManager.getAsked();
      const answered = await this.sessionManager.getAnswered();
      const facts = await this.sessionManager.getFacts();
      const batchUntil = await this.sessionManager.getBatchUntil();
      const pendingCount = await this.sessionManager.getPendingMessageCount();
      const timestamp = await this.sessionManager.getLastUserTimestamp();

      const cleanupResults = {
        stage: stage === 'S', // Should default back to S
        asked: asked.size === 0,
        answered: answered.size === 0,
        facts: Object.keys(facts).every(key => !facts[key]),
        batchUntil: batchUntil === null,
        pendingCount: pendingCount === 0,
        timestamp: timestamp === null
      };

      const allClean = Object.values(cleanupResults).every(Boolean);
      
      if (allClean) {
        this.success('All session data cleaned up successfully', cleanupResults);
        this.results.cleanup = true;
        return true;
      } else {
        this.error('Some session data was not cleaned up', cleanupResults);
        return false;
      }
      
    } catch (error) {
      this.error('Cleanup test failed', error);
      return false;
    }
  }

  async run() {
    console.log('🧪 Starting Redis batching system tests...');
    console.log(`Test session ID: ${this.testSessionId}`);
    console.log('='.repeat(60));

    const tests = [
      { name: 'Redis Connection', fn: () => this.testRedisConnection() },
      { name: 'Lock Operations', fn: () => this.testLockOperations() },
      { name: 'Batching Operations', fn: () => this.testBatchingOperations() },
      { name: 'State Operations', fn: () => this.testStateOperations() },
      { name: 'Cleanup Operations', fn: () => this.testCleanup() }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        this.log(`\n🔄 Running test: ${test.name}`);
        const result = await test.fn();
        
        if (result) {
          passed++;
          this.success(`Test passed: ${test.name}`);
        } else {
          failed++;
          this.error(`Test failed: ${test.name}`);
        }
        
      } catch (error) {
        failed++;
        this.error(`Test error: ${test.name}`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 REDIS BATCHING TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total tests: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
    console.log('\nDetailed results:');
    console.log(JSON.stringify(this.results, null, 2));
    console.log('='.repeat(60));

    const overallSuccess = failed === 0;
    
    if (overallSuccess) {
      this.success('🎉 All Redis batching tests PASSED!');
    } else {
      this.error('❌ Some Redis batching tests FAILED');
    }

    return { 
      success: overallSuccess, 
      passed, 
      failed, 
      results: this.results 
    };
  }
}

// Main execution
async function main() {
  const tester = new RedisBatchingTest();
  
  try {
    const result = await tester.run();
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('Fatal error during Redis testing:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { RedisBatchingTest };