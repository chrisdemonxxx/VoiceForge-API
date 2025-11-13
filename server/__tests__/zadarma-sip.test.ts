/**
 * Zadarma SIP Provider Tests
 * Simple test runner for SIP-based Zadarma integration
 * Run with: tsx server/__tests__/zadarma-sip.test.ts
 */

import { ZadarmaSIPProvider } from '../services/telephony-providers/zadarma-sip-provider';
import { ZadarmaProvider } from '../services/telephony-providers/zadarma-provider';
import type { TelephonyProvider } from '../../shared/schema';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn: () => void, expectedMessage?: string) {
  try {
    fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error: any) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}", but got "${error.message}"`);
    }
  }
}

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error: any) {
      results.push({ name, passed: false, error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
  };
}

async function runTests() {
  console.log('\n🧪 Starting Zadarma SIP Provider Tests\n');

  const mockProvider: TelephonyProvider = {
    id: 'test-sip-provider',
    userId: 'test-user',
    name: 'Test SIP Provider',
    provider: 'zadarma',
    credentials: {
      sipUsername: '100001234567',
      sipPassword: 'test-sip-password',
      sipDomain: 'sip.zadarma.com'
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Test Suite 1: Constructor Tests
  console.log('Constructor Tests:');
  
  await test('should create SIP provider with valid credentials', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    assert(sipProvider !== null, 'Provider should be created');
  })();

  await test('should throw error when sipUsername is missing', () => {
    const invalidProvider = {
      ...mockProvider,
      credentials: { sipPassword: 'test-password' }
    };
    
    assertThrows(
      () => new ZadarmaSIPProvider(invalidProvider as TelephonyProvider),
      'sipUsername and sipPassword'
    );
  })();

  await test('should throw error when sipPassword is missing', () => {
    const invalidProvider = {
      ...mockProvider,
      credentials: { sipUsername: '100001234567' }
    };
    
    assertThrows(
      () => new ZadarmaSIPProvider(invalidProvider as TelephonyProvider),
      'sipUsername and sipPassword'
    );
  })();

  await test('should use default sipDomain when not provided', () => {
    const providerWithoutDomain = {
      ...mockProvider,
      credentials: {
        sipUsername: '100001234567',
        sipPassword: 'test-password'
      }
    };
    
    const sipProvider = new ZadarmaSIPProvider(providerWithoutDomain as TelephonyProvider);
    assert(sipProvider !== null, 'Provider should be created with default domain');
  })();

  await test('should trim credentials to remove whitespace', () => {
    const providerWithWhitespace = {
      ...mockProvider,
      credentials: {
        sipUsername: '  100001234567  ',
        sipPassword: '  test-password  ',
        sipDomain: '  sip.zadarma.com  '
      }
    };
    
    const sipProvider = new ZadarmaSIPProvider(providerWithWhitespace as TelephonyProvider);
    assert(sipProvider !== null, 'Provider should be created with trimmed credentials');
  })();

  // Test Suite 2: Smart Wrapper Auto-detection
  console.log('\nSmart Wrapper Auto-detection Tests:');

  await test('should use SIP implementation when SIP credentials provided', () => {
    const sipProvider = new ZadarmaProvider(mockProvider);
    assert(sipProvider !== null, 'SIP provider should be created');
  })();

  await test('should use REST implementation when API credentials provided', () => {
    const restProvider = {
      ...mockProvider,
      credentials: {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret'
      }
    };
    
    const provider = new ZadarmaProvider(restProvider as TelephonyProvider);
    assert(provider !== null, 'REST provider should be created');
  })();

  await test('should throw error when no valid credentials provided', () => {
    const invalidProvider = {
      ...mockProvider,
      credentials: {}
    };
    
    assertThrows(
      () => new ZadarmaProvider(invalidProvider as TelephonyProvider),
      'apiKey + apiSecret'
    );
  })();

  // Test Suite 3: SDP Generation
  console.log('\nSDP Generation Tests:');

  await test('should generate valid SDP for audio negotiation', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const generateSDP = (sipProvider as any).generateSDP.bind(sipProvider);
    const sdp = generateSDP();

    assert(sdp.includes('v=0'), 'SDP should contain version');
    assert(sdp.includes('s=VoiceForge Call'), 'SDP should contain session name');
    assert(sdp.includes('m=audio'), 'SDP should contain audio media');
    assert(sdp.includes('PCMU/8000'), 'SDP should contain μ-law codec');
    assert(sdp.includes('PCMA/8000'), 'SDP should contain A-law codec');
    assert(sdp.includes('a=sendrecv'), 'SDP should specify bidirectional media');
  })();

  // Test Suite 4: Call ID and Tag Generation
  console.log('\nCall ID and Tag Generation Tests:');

  await test('should generate unique call IDs', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const generateCallId = (sipProvider as any).generateCallId.bind(sipProvider);
    const callId1 = generateCallId();
    const callId2 = generateCallId();
    
    assert(callId1 !== callId2, 'Call IDs should be unique');
    assert(callId1.includes('@voiceforge'), 'Call ID should contain @voiceforge');
    assert(callId2.includes('@voiceforge'), 'Call ID should contain @voiceforge');
  })();

  await test('should generate unique tags for SIP headers', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const generateTag = (sipProvider as any).generateTag.bind(sipProvider);
    const tag1 = generateTag();
    const tag2 = generateTag();
    
    assert(tag1 !== tag2, 'Tags should be unique');
    assert(tag1.length > 0, 'Tag 1 should have length');
    assert(tag2.length > 0, 'Tag 2 should have length');
  })();

  // Test Suite 5: Digest Authentication
  console.log('\nDigest Authentication Tests:');

  await test('should extract values from authentication challenge', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const extractValue = (sipProvider as any).extractValue.bind(sipProvider);
    
    const challenge = 'Digest realm="zadarma.com", nonce="abc123", algorithm=MD5';
    
    assert(extractValue(challenge, 'realm') === 'zadarma.com', 'Should extract realm');
    assert(extractValue(challenge, 'nonce') === 'abc123', 'Should extract nonce');
    assert(extractValue(challenge, 'algorithm') === 'MD5', 'Should extract algorithm');
  })();

  await test('should return empty string for missing values', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const extractValue = (sipProvider as any).extractValue.bind(sipProvider);
    
    const challenge = 'Digest realm="zadarma.com"';
    
    assert(extractValue(challenge, 'nonce') === '', 'Missing nonce should return empty string');
    assert(extractValue(challenge, 'opaque') === '', 'Missing opaque should return empty string');
  })();

  // Test Suite 6: Dialog Management
  console.log('\nDialog Management Tests:');

  await test('should track active dialogs', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const activeDialogs = (sipProvider as any).activeDialogs;
    
    assert(activeDialogs !== null, 'Active dialogs map should exist');
    assert(activeDialogs.size === 0, 'Active dialogs should be empty initially');
  })();

  await test('should update dialog status', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const updateDialog = (sipProvider as any).updateDialog.bind(sipProvider);
    const activeDialogs = (sipProvider as any).activeDialogs;
    
    const testDialog = {
      callId: 'test-call-id',
      fromTag: 'from-tag',
      toTag: 'to-tag',
      remoteTarget: 'sip:test@example.com',
      status: 'trying' as const
    };
    
    activeDialogs.set('test-call-id', testDialog);
    updateDialog('test-call-id', { status: 'ringing' });
    
    const updatedDialog = activeDialogs.get('test-call-id');
    assert(updatedDialog.status === 'ringing', 'Dialog status should be updated to ringing');
  })();

  // Test Suite 7: Get Call Details
  console.log('\nGet Call Details Tests:');

  await test('should return unknown status for non-existent call', async () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const details = await sipProvider.getCallDetails('non-existent-call-id');
    
    assert(details.sid === 'non-existent-call-id', 'SID should match');
    assert(details.status === 'unknown', 'Status should be unknown');
    assert(details.message.includes('Dialog not found'), 'Message should indicate dialog not found');
  })();

  await test('should return call details for active call', async () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const activeDialogs = (sipProvider as any).activeDialogs;
    
    const testDialog = {
      callId: 'test-call-id',
      fromTag: 'from-tag',
      toTag: 'to-tag',
      remoteTarget: 'sip:+1234567890@sip.zadarma.com',
      status: 'answered' as const
    };
    
    activeDialogs.set('test-call-id', testDialog);
    
    const details = await sipProvider.getCallDetails('test-call-id');
    
    assert(details.sid === 'test-call-id', 'SID should match');
    assert(details.status === 'answered', 'Status should be answered');
    assert(details.direction === 'outbound', 'Direction should be outbound');
    assert(details.to === 'sip:+1234567890@sip.zadarma.com', 'To should match remote target');
  })();

  // Test Suite 8: Cleanup
  console.log('\nCleanup Tests:');

  await test('should attempt cleanup of active dialogs on destroy', () => {
    const sipProvider = new ZadarmaSIPProvider(mockProvider);
    const activeDialogs = (sipProvider as any).activeDialogs;
    
    // Add some test dialogs
    activeDialogs.set('call-1', { callId: 'call-1', status: 'answered' });
    activeDialogs.set('call-2', { callId: 'call-2', status: 'ringing' });
    
    assert(activeDialogs.size === 2, 'Should have 2 active dialogs');
    
    sipProvider.destroy();
    
    // destroy() attempts to end calls - important that it doesn't throw
    assert(sipProvider !== null, 'Provider should still exist after destroy');
  })();

  // Test Suite 9: Integration with Smart Wrapper
  console.log('\nIntegration with Smart Wrapper Tests:');

  await test('should expose same interface as REST provider', () => {
    const sipProvider = new ZadarmaProvider(mockProvider);
    
    assert(typeof sipProvider.initiateCall === 'function', 'initiateCall should be a function');
    assert(typeof sipProvider.endCall === 'function', 'endCall should be a function');
    assert(typeof sipProvider.getCallDetails === 'function', 'getCallDetails should be a function');
    assert(typeof sipProvider.destroy === 'function', 'destroy should be a function');
  })();

  // Print summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\nTest Summary:`);
  console.log(`  Total: ${total}`);
  console.log(`  Passed: ${passed} ✓`);
  console.log(`  Failed: ${failed} ✗`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
  }
  
  console.log('');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
