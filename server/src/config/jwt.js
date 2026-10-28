import dotenv from 'dotenv';
dotenv.config();

/**
 * HookZ Centralized JWT Configuration
 * In production (NODE_ENV === 'production'), a secure random JWT_SECRET is strictly required.
 * In development, a development fallback is permitted with a clear console warning.
 */
function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length < 32) {
    if (process.env.NODE_ENV === 'production') {
      const errMsg = 'FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is missing or shorter than 32 characters.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is unset or under 32 chars. Using fallback key. Set JWT_SECRET in .env.');
    return 'startupz_dev_only_local_jwt_secret_do_not_use_in_production_2026';
  }

  return secret.trim();
}

export const JWT_SECRET = resolveJwtSecret();

