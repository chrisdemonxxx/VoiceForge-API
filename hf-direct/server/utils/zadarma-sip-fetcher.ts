/**
 * Zadarma SIP Credentials Fetcher
 * Automatically retrieves SIP account credentials from Zadarma REST API
 */

import crypto from 'crypto';

interface ZadarmaSIPAccount {
  id: string;
  name: string;
  login: string;
  password: string;
  status: string;
}

interface ZadarmaAPIResponse {
  status: string;
  internals?: ZadarmaSIPAccount[];
  message?: string;
}

/**
 * Generate HMAC-SHA1 signature for Zadarma API authentication
 * Matches the algorithm in Zadarma's official PHP library
 */
function generateZadarmaSignature(
  method: string,
  params: Record<string, string>,
  apiSecret: string
): string {
  // Sort parameters alphabetically and build query string
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  const paramsString = new URLSearchParams(sortedParams).toString();
  const paramsMd5 = crypto.createHash('md5').update(paramsString).digest('hex');
  
  // Build signature string: method + params + md5(params)
  const signString = method + paramsString + paramsMd5;
  
  // Generate HMAC-SHA1 signature (hex string, then base64 encode)
  // This matches PHP: base64_encode(hash_hmac('sha1', ...))
  // PHP hash_hmac() returns hex by default, then base64_encode wraps it
  const hmacHex = crypto
    .createHmac('sha1', apiSecret)
    .update(signString)
    .digest('hex');
  
  const signature = Buffer.from(hmacHex).toString('base64');
  
  return signature;
}

/**
 * Fetch SIP credentials from Zadarma API
 */
export async function fetchZadarmaSIPCredentials(
  apiKey: string,
  apiSecret: string
): Promise<{ sipUsername: string; sipPassword: string; sipDomain: string } | null> {
  console.log('[Zadarma-Fetcher] Fetching SIP credentials from Zadarma API...');

  const method = '/v1/pbx/internal/';
  const params = { format: 'json' }; // Zadarma API always requires format parameter
  
  // Generate signature
  const signature = generateZadarmaSignature(method, params, apiSecret);
  
  console.log('[Zadarma-Fetcher] API Key:', apiKey.substring(0, 10) + '...');
  console.log('[Zadarma-Fetcher] Signature generated');

  try {
    // For GET requests, append params as query string
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.zadarma.com${method}?${queryString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `${apiKey}:${signature}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zadarma-Fetcher] API Error:', response.status, errorText);
      return null;
    }

    const data: ZadarmaAPIResponse = await response.json();
    
    console.log('[Zadarma-Fetcher] API Response Status:', data.status);
    
    if (data.status !== 'success' || !data.internals || data.internals.length === 0) {
      console.error('[Zadarma-Fetcher] No SIP accounts found');
      console.error('[Zadarma-Fetcher] Response:', JSON.stringify(data, null, 2));
      return null;
    }

    // Get the first active SIP account
    const sipAccount = data.internals.find(acc => acc.status === 'active') || data.internals[0];
    
    console.log('[Zadarma-Fetcher] ✓ SIP Account Found:');
    console.log(`  - ID: ${sipAccount.id}`);
    console.log(`  - Name: ${sipAccount.name}`);
    console.log(`  - Login: ${sipAccount.login}`);
    console.log(`  - Status: ${sipAccount.status}`);
    
    return {
      sipUsername: sipAccount.login,
      sipPassword: sipAccount.password,
      sipDomain: 'sip.zadarma.com',
    };

  } catch (error: any) {
    console.error('[Zadarma-Fetcher] Request failed:', error.message);
    return null;
  }
}

/**
 * Get SIP credentials from environment or fetch from API
 */
export async function getZadarmaSIPCredentials(): Promise<{
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
} | null> {
  // Check if SIP credentials are already in environment
  const envUsername = process.env.ZADARMA_SIP_USERNAME;
  const envPassword = process.env.ZADARMA_SIP_PASSWORD;
  
  if (envUsername && envPassword) {
    console.log('[Zadarma-Fetcher] Using SIP credentials from environment');
    return {
      sipUsername: envUsername,
      sipPassword: envPassword,
      sipDomain: process.env.ZADARMA_SIP_DOMAIN || 'sip.zadarma.com',
    };
  }

  // Fetch from API using API key/secret
  const apiKey = process.env.ZADARMA_API_KEY;
  const apiSecret = process.env.ZADARMA_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('[Zadarma-Fetcher] No API credentials found in environment');
    return null;
  }

  console.log('[Zadarma-Fetcher] Fetching SIP credentials from API...');
  return fetchZadarmaSIPCredentials(apiKey, apiSecret);
}
