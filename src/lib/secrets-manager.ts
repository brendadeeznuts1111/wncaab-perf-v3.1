/**
 * Secrets Management - Bun.secrets API Integration
 * 
 * Uses Bun 1.3's native credential storage for encrypted secrets.
 * 
 * @module src/lib/secrets-manager
 */

import { secrets } from "bun";

const SERVICE_NAME = "wncaab-perf-v3.1";

export interface SecretConfig {
  service: string;
  name: string;
}

/**
 * Set a secret value using Bun.secrets
 * 
 * @param name - Secret name (e.g., "csrf-secret", "jwt-secret")
 * @param value - Secret value to store
 */
export async function setSecret(name: string, value: string): Promise<void> {
  try {
    await secrets.set({
      service: SERVICE_NAME,
      name,
      value,
    });
  } catch (error) {
    throw new Error(`Failed to set secret "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a secret value using Bun.secrets
 * 
 * @param name - Secret name
 * @returns Secret value or null if not found
 */
export async function getSecret(name: string): Promise<string | null> {
  try {
    return await secrets.get({
      service: SERVICE_NAME,
      name,
    });
  } catch (error) {
    console.error(`[Secrets Manager] Failed to get secret "${name}":`, error);
    return null;
  }
}

/**
 * Delete a secret
 * 
 * @param name - Secret name to delete
 */
export async function deleteSecret(name: string): Promise<void> {
  try {
    await secrets.delete({
      service: SERVICE_NAME,
      name,
    });
  } catch (error) {
    throw new Error(`Failed to delete secret "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get or create CSRF secret
 * 
 * Falls back to environment variable if secret not found
 */
export async function getCsrfSecret(): Promise<string> {
  const secret = await getSecret("csrf-secret");
  if (secret) {
    return secret;
  }
  
  // Fallback to environment variable
  const envSecret = process.env.CSRF_SECRET || Bun.env.CSRF_SECRET;
  if (envSecret) {
    // Store in secrets for future use
    await setSecret("csrf-secret", envSecret);
    return envSecret;
  }
  
  // Generate a new secret if none exists
  const newSecret = crypto.randomUUID() + "-" + Date.now();
  await setSecret("csrf-secret", newSecret);
  return newSecret;
}

/**
 * Get or create JWT secret
 * 
 * Falls back to environment variable if secret not found
 */
export async function getJwtSecret(): Promise<string> {
  const secret = await getSecret("jwt-secret");
  if (secret) {
    return secret;
  }
  
  // Fallback to environment variable
  const envSecret = process.env.JWT_SECRET || Bun.env.JWT_SECRET;
  if (envSecret) {
    // Store in secrets for future use
    await setSecret("jwt-secret", envSecret);
    return envSecret;
  }
  
  // Generate a new secret if none exists
  const newSecret = crypto.randomUUID() + "-" + Date.now();
  await setSecret("jwt-secret", newSecret);
  return newSecret;
}

/**
 * Get or create Telegram bot token
 * 
 * Priority:
 * 1. Bun.secrets (most secure)
 * 2. Environment variable (TELEGRAM_BOT_TOKEN)
 * 3. Bun.env (Bun-specific env)
 * 
 * Falls back to environment variable if secret not found
 */
export async function getTelegramBotToken(): Promise<string | null> {
  // Try Bun.secrets first (most secure)
  const secret = await getSecret("telegram-bot-token");
  if (secret) {
    return secret;
  }
  
  // Fallback to environment variable
  const envToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
  if (envToken) {
    return envToken;
  }
  
  return null;
}

/**
 * Set Telegram bot token in Bun.secrets
 * 
 * @param token - Telegram bot token to store securely
 */
export async function setTelegramBotToken(token: string): Promise<void> {
  await setSecret("telegram-bot-token", token);
}

/**
 * Initialize secrets on startup
 * 
 * Ensures all required secrets exist
 */
export async function initializeSecrets(): Promise<void> {
  try {
    // Ensure CSRF secret exists
    await getCsrfSecret();
    
    // Ensure JWT secret exists
    await getJwtSecret();
    
    console.log('[Secrets Manager] ✅ Secrets initialized');
  } catch (error) {
    console.error('[Secrets Manager] ⚠️  Failed to initialize secrets:', error);
    console.warn('[Secrets Manager] Falling back to environment variables');
  }
}

