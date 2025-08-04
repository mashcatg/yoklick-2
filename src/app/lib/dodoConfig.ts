/**
 * Dodo Payments Configuration
 * Handles environment-specific API keys and settings
 */

export interface DodoConfig {
  apiKey: string;
  environment: 'test_mode' | 'live_mode';
  checkoutBaseUrl: string;
  webhookSecret?: string;
}

export function getDodoConfig(): DodoConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Environment-specific API keys
  const apiKey = isDevelopment 
    ? process.env.DODO_API_KEY_TEST || process.env.DODO_API_KEY
    : process.env.DODO_API_KEY_LIVE || process.env.DODO_API_KEY;
  
  const environment = isDevelopment ? 'test_mode' : 'live_mode';
  const checkoutBaseUrl = isDevelopment 
    ? 'https://test.checkout.dodopayments.com' 
    : 'https://checkout.dodopayments.com';
  
  const webhookSecret = isDevelopment 
    ? process.env.DODO_WEBHOOK_SECRET_TEST 
    : process.env.DODO_WEBHOOK_SECRET_LIVE || process.env.DODO_WEBHOOK_SECRET;

  // Debug logging
  console.log('Dodo Config Debug:', {
    NODE_ENV: process.env.NODE_ENV,
    isDevelopment,
    environment,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    checkoutBaseUrl,
    hasWebhookSecret: !!webhookSecret
  });

  if (!apiKey) {
    throw new Error(`Dodo Payments API key not configured for ${environment} environment`);
  }

  return {
    apiKey,
    environment,
    checkoutBaseUrl,
    webhookSecret
  };
}

export function getDodoClient() {
  const config = getDodoConfig();
  const DodoPayments = require('dodopayments');
  
  return new DodoPayments({
    bearerToken: config.apiKey,
    environment: config.environment,
  });
} 