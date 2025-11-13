/**
 * End-to-End Tests for Zadarma Telephony Integration
 * Tests actual Zadarma API calls and webhook flows
 * 
 * NOTE: Requires valid Zadarma credentials in environment variables:
 * ZADARMA_API_KEY and ZADARMA_API_SECRET
 */

/**
 * Simple test runner without Jest dependency
 * Run with: tsx server/__tests__/zadarma-e2e.test.ts
 */
import { storage } from '../storage';
import { ZadarmaProvider } from '../services/telephony-providers/zadarma-provider';
import crypto from 'crypto';

async function runZadarmaE2ETests() {
  let providerId: string;
  let apiKeyId: string;

  console.log('\n🧪 Starting Zadarma E2E Tests\n');

  try {
    // Initialize test environment

    const apiKey = await storage.createApiKey({
      name: 'Zadarma E2E Test Key',
      userId: 'test-user-zadarma',
      limits: {
        rateLimit: 100,
        maxUsage: 1000000
      }
    });
    apiKeyId = apiKey.id;

    // Check for Zadarma credentials
    const zadarmaApiKey = process.env.ZADARMA_API_KEY;
    const zadarmaApiSecret = process.env.ZADARMA_API_SECRET;

    if (!zadarmaApiKey || !zadarmaApiSecret) {
      console.log('⚠️  Zadarma credentials not found. Set ZADARMA_API_KEY and ZADARMA_API_SECRET to run full E2E tests.\n');
      console.log('Running signature validation tests only...\n');
    } else {
      // Create Zadarma provider
      const provider = await storage.createTelephonyProvider({
        apiKeyId,
        name: 'Zadarma Test Provider',
        provider: 'zadarma',
        credentials: {
          apiKey: zadarmaApiKey,
          apiSecret: zadarmaApiSecret
        },
        active: true
      });
      providerId = provider.id;
      console.log('✓ Zadarma provider configured\n');
    }

    // Test 1: Webhook signature validation
    console.log('Test 1: Zadarma webhook signature validation');
    const testApiSecret = 'test-secret-key';
    const testParams = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      called_did: '+15555555678',
      call_start: '2024-01-01 12:00:00'
    };

    const sortedParams = Object.keys(testParams)
      .sort()
      .map(key => `${key}${testParams[key]}`)
      .join('');
    
    const validSignature = crypto
      .createHash('md5')
      .update(sortedParams + testApiSecret)
      .digest('hex');

    const isValid = ZadarmaProvider.validateWebhookSignature(
      testApiSecret,
      validSignature,
      testParams
    );

    if (isValid) {
      console.log('✅ Webhook signature validation passed\n');
    } else {
      throw new Error('Webhook signature validation failed');
    }

    // Test 2: ZSML generation
    console.log('Test 2: ZSML generation');
    const zsml = ZadarmaProvider.generateZSML({
      message: 'Hello from VoiceForge API',
      recordingEnabled: true,
      streamUrl: 'wss://example.com/stream'
    });

    if (zsml.includes('<?xml version="1.0"') && 
        zsml.includes('<pbx>') &&
        zsml.includes('<say>Hello from VoiceForge API</say>') &&
        zsml.includes('<record/>')) {
      console.log('✅ ZSML generation passed');
      console.log('Generated ZSML:', zsml);
      console.log('');
    } else {
      throw new Error('ZSML generation failed');
    }

    // Test 3: Get account balance (if credentials provided)
    if (process.env.ZADARMA_API_KEY && providerId) {
      console.log('Test 3: Get Zadarma account balance');
      const provider = await storage.getTelephonyProvider(providerId);
      if (provider) {
        const zadarmaProvider = new ZadarmaProvider(provider);
        const balance = await zadarmaProvider.getBalance();
        console.log(`✅ Account balance: $${balance}\n`);
      }
    }

    // Cleanup
    if (providerId) {
      await storage.deleteTelephonyProvider(providerId);
    }
    if (apiKeyId) {
      await storage.deleteApiKey(apiKeyId);
    }

    console.log('✅ All Zadarma E2E tests passed!\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runZadarmaE2ETests();
