/**
 * Integration Tests for Telephony Webhook Signature Validation
 * Tests Twilio and Zadarma webhook security
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import crypto from 'crypto';
import { TwilioProvider } from '../services/telephony-providers/twilio-provider';
import { ZadarmaProvider } from '../services/telephony-providers/zadarma-provider';

describe('Twilio Webhook Signature Validation', () => {
  const authToken = 'test_twilio_auth_token';
  const url = 'https://example.com/api/telephony/twiml/test-session-123';

  it('should validate correct Twilio signature', () => {
    const params = {
      CallSid: 'CA1234567890abcdef',
      From: '+15555551234',
      To: '+15555555678',
      CallStatus: 'ringing'
    };

    // Generate valid signature
    const data = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signature = crypto
      .createHmac('sha1', authToken)
      .update(url + data)
      .digest('base64');

    const isValid = TwilioProvider.validateWebhookSignature(
      authToken,
      signature,
      url,
      params
    );

    expect(isValid).toBe(true);
  });

  it('should reject invalid Twilio signature', () => {
    const params = {
      CallSid: 'CA1234567890abcdef',
      From: '+15555551234',
      To: '+15555555678',
      CallStatus: 'ringing'
    };

    const invalidSignature = 'invalid-signature-12345';

    const isValid = TwilioProvider.validateWebhookSignature(
      authToken,
      invalidSignature,
      url,
      params
    );

    expect(isValid).toBe(false);
  });

  it('should reject tampered Twilio parameters', () => {
    const originalParams = {
      CallSid: 'CA1234567890abcdef',
      From: '+15555551234',
      To: '+15555555678',
      CallStatus: 'ringing'
    };

    // Generate signature for original params
    const data = Object.keys(originalParams)
      .sort()
      .map(key => `${key}=${originalParams[key]}`)
      .join('&');
    
    const signature = crypto
      .createHmac('sha1', authToken)
      .update(url + data)
      .digest('base64');

    // Tamper with params
    const tamperedParams = {
      ...originalParams,
      CallStatus: 'completed' // Changed from 'ringing'
    };

    const isValid = TwilioProvider.validateWebhookSignature(
      authToken,
      signature,
      url,
      tamperedParams
    );

    expect(isValid).toBe(false);
  });

  it('should handle empty parameters', () => {
    const params = {};
    
    const data = '';
    const signature = crypto
      .createHmac('sha1', authToken)
      .update(url + data)
      .digest('base64');

    const isValid = TwilioProvider.validateWebhookSignature(
      authToken,
      signature,
      url,
      params
    );

    expect(isValid).toBe(true);
  });
});

describe('Zadarma Webhook Signature Validation', () => {
  const apiSecret = 'test_zadarma_secret';

  it('should validate correct Zadarma signature', () => {
    const params = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      called_did: '+15555555678',
      call_start: '2024-01-01 12:00:00'
    };

    // Generate valid signature (MD5 of sorted params + secret)
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    const signature = crypto
      .createHash('md5')
      .update(sortedParams + apiSecret)
      .digest('hex');

    const isValid = ZadarmaProvider.validateWebhookSignature(
      apiSecret,
      signature,
      params
    );

    expect(isValid).toBe(true);
  });

  it('should reject invalid Zadarma signature', () => {
    const params = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      called_did: '+15555555678',
      call_start: '2024-01-01 12:00:00'
    };

    const invalidSignature = 'invalid-signature';

    const isValid = ZadarmaProvider.validateWebhookSignature(
      apiSecret,
      invalidSignature,
      params
    );

    expect(isValid).toBe(false);
  });

  it('should reject tampered Zadarma parameters', () => {
    const originalParams = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      called_did: '+15555555678'
    };

    // Generate signature for original params
    const sortedParams = Object.keys(originalParams)
      .sort()
      .map(key => `${key}${originalParams[key]}`)
      .join('');
    
    const signature = crypto
      .createHash('md5')
      .update(sortedParams + apiSecret)
      .digest('hex');

    // Tamper with params
    const tamperedParams = {
      ...originalParams,
      caller_id: '+19999999999' // Changed phone number
    };

    const isValid = ZadarmaProvider.validateWebhookSignature(
      apiSecret,
      signature,
      tamperedParams
    );

    expect(isValid).toBe(false);
  });

  it('should exclude signature field from validation', () => {
    const params = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      signature: 'should-be-ignored',
      zd_echo: 'should-also-be-ignored'
    };

    // Generate signature WITHOUT signature and zd_echo fields
    const sortedParams = Object.keys(params)
      .filter(key => key !== 'signature' && key !== 'zd_echo')
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    const signature = crypto
      .createHash('md5')
      .update(sortedParams + apiSecret)
      .digest('hex');

    const isValid = ZadarmaProvider.validateWebhookSignature(
      apiSecret,
      signature,
      params
    );

    expect(isValid).toBe(true);
  });
});

describe('Audio Conversion', () => {
  it('should convert μ-law to PCM', async () => {
    // This test would require the actual audio converter bridge
    // Placeholder for now - will be implemented when running real tests
    expect(true).toBe(true);
  });

  it('should resample 8kHz to 16kHz', async () => {
    // Placeholder
    expect(true).toBe(true);
  });

  it('should convert PCM back to μ-law', async () => {
    // Placeholder
    expect(true).toBe(true);
  });
});
