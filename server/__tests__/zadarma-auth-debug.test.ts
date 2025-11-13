/**
 * Debug Zadarma API Authentication
 * Test signature generation with simple endpoint
 */

import crypto from 'crypto';

function generateSignature(
  method: string,
  params: Record<string, string>,
  apiSecret: string
): string {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  const paramsString = new URLSearchParams(sortedParams).toString();
  const paramsMd5 = crypto.createHash('md5').update(paramsString).digest('hex');
  const signString = method + paramsString + paramsMd5;
  
  // HMAC-SHA1 as hex, then base64 encode (matches PHP: base64_encode(hash_hmac()))
  const hmacHex = crypto
    .createHmac('sha1', apiSecret)
    .update(signString)
    .digest('hex');
  
  const signature = Buffer.from(hmacHex).toString('base64');
  
  console.log('\n🔍 Signature Generation Debug:');
  console.log('  Method:', method);
  console.log('  Params:', params);
  console.log('  Params String:', paramsString);
  console.log('  Params MD5:', paramsMd5);
  console.log('  Sign String:', signString);
  console.log('  HMAC (hex):', hmacHex);
  console.log('  Signature (base64):', signature);
  
  return signature;
}

async function testSimpleEndpoint() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          ZADARMA API AUTHENTICATION DEBUG                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const apiKey = process.env.ZADARMA_API_KEY;
  const apiSecret = process.env.ZADARMA_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ API credentials not found');
    process.exit(1);
  }

  console.log('✓ API Key:', apiKey.substring(0, 10) + '...');
  console.log('✓ API Secret:', '*'.repeat(apiSecret.length) + '\n');

  // Test 1: Balance endpoint (NO params - matches Zadarma's exact example)
  console.log('📋 TEST 1: /v1/info/balance/ (no parameters)');
  console.log('═'.repeat(65));
  
  const balanceMethod = '/v1/info/balance/';
  const balanceParams = {};  // Empty params, matching Zadarma's PHP example
  const balanceSignature = generateSignature(balanceMethod, balanceParams, apiSecret);
  
  try {
    const balanceUrl = `https://api.zadarma.com${balanceMethod}`;
    console.log('\n  Request URL:', balanceUrl);
    console.log('  Authorization:', `${apiKey}:${balanceSignature.substring(0, 20)}...`);
    
    const balanceResponse = await fetch(balanceUrl, {
      method: 'GET',
      headers: {
        'Authorization': `${apiKey}:${balanceSignature}`,
      },
    });

    console.log('\n  Response Status:', balanceResponse.status);
    const balanceText = await balanceResponse.text();
    console.log('  Response Body:', balanceText);
    
    if (balanceResponse.ok) {
      console.log('\n  ✅ Authentication successful!\n');
    } else {
      console.log('\n  ❌ Authentication failed\n');
    }
  } catch (error: any) {
    console.error('\n  ❌ Request error:', error.message, '\n');
  }

  // Test 2: PBX Internal endpoint
  console.log('📋 TEST 2: /v1/pbx/internal/');
  console.log('═'.repeat(65));
  
  const pbxMethod = '/v1/pbx/internal/';
  const pbxParams = { format: 'json' };
  const pbxSignature = generateSignature(pbxMethod, pbxParams, apiSecret);
  
  try {
    const pbxUrl = `https://api.zadarma.com${pbxMethod}?format=json`;
    console.log('\n  Request URL:', pbxUrl);
    console.log('  Authorization:', `${apiKey}:${pbxSignature.substring(0, 20)}...`);
    
    const pbxResponse = await fetch(pbxUrl, {
      method: 'GET',
      headers: {
        'Authorization': `${apiKey}:${pbxSignature}`,
      },
    });

    console.log('\n  Response Status:', pbxResponse.status);
    const pbxText = await pbxResponse.text();
    console.log('  Response Body:', pbxText);
    
    if (pbxResponse.ok) {
      console.log('\n  ✅ PBX endpoint accessible!\n');
    } else {
      console.log('\n  ❌ PBX endpoint not accessible\n');
    }
  } catch (error: any) {
    console.error('\n  ❌ Request error:', error.message, '\n');
  }
}

testSimpleEndpoint()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
