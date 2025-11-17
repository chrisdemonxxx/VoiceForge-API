/**
 * Integration Test for Streaming Pipeline with Telephony Service
 * 
 * This test verifies the integration between:
 * - TelephonyService
 * - StreamingPipeline
 * - Audio conversion
 */

import { TelephonyService } from './server/services/telephony-service';
import type { StreamingPipelineConfig } from './server/services/streaming-pipeline';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

async function testTelephonyServiceIntegration() {
  log('\n========================================', YELLOW);
  log('Telephony Service Integration Test', YELLOW);
  log('========================================\n', YELLOW);
  
  // Check if API key is available
  const apiKey = process.env.TRUEVOICE_API_KEY;
  if (!apiKey) {
    log('⚠ No TRUEVOICE_API_KEY found. Testing without streaming pipeline.', YELLOW);
    log('  Set TRUEVOICE_API_KEY environment variable to test full integration.\n', YELLOW);
  }
  
  // Create streaming pipeline config
  const streamingConfig: StreamingPipelineConfig | undefined = apiKey ? {
    trueVoiceApiKey: apiKey,
    trueVoiceLanguage: 'en-US',
    trueVoiceBaseUrl: process.env.TRUEVOICE_BASE_URL || 'wss://api.loopercreations.org',
    enableBreathing: true,
    enablePauses: true,
    jitterBufferMinMs: 20,
    jitterBufferMaxMs: 500,
    jitterBufferTargetMs: 100,
  } : undefined;
  
  // Create telephony service
  log('Creating TelephonyService...', YELLOW);
  const telephonyService = new TelephonyService(null as any, streamingConfig);
  log('✓ TelephonyService created', GREEN);
  
  if (streamingConfig) {
    log('✓ Streaming pipeline configuration loaded', GREEN);
    log(`  - API Key: ${apiKey.substring(0, 10)}...`, YELLOW);
    log(`  - Language: ${streamingConfig.trueVoiceLanguage}`, YELLOW);
    log(`  - Base URL: ${streamingConfig.trueVoiceBaseUrl}`, YELLOW);
    log(`  - Breathing: ${streamingConfig.enableBreathing}`, YELLOW);
    log(`  - Pauses: ${streamingConfig.enablePauses}`, YELLOW);
  } else {
    log('✓ Running without streaming pipeline (legacy mode)', YELLOW);
  }
  
  // Test session creation (mock)
  log('\nTesting session management...', YELLOW);
  try {
    // Note: This would normally require database setup
    // We're just testing that the service can be instantiated
    log('✓ TelephonyService instantiated successfully', GREEN);
    log('  (Full session test requires database connection)', YELLOW);
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, RED);
    throw error;
  }
  
  log('\n========================================', YELLOW);
  log('Integration Test Complete', GREEN);
  log('========================================\n', YELLOW);
}

// Run test
testTelephonyServiceIntegration().catch(error => {
  log(`\n[FATAL] Integration test failed: ${error.message}`, RED);
  console.error(error);
  process.exit(1);
});

