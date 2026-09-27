import { User, Investor, StartupOpportunity } from '../types';

/**
 * Curated Fallback Data:
 * Demo / mock accounts removed to display strictly real registered users from the database.
 */
export const FALLBACK_BUILDERS: Record<string, User[]> = {
  founders: [],
  cofounders: [],
  marketers: [],
  investors: [],
  other: [],
};

export const FALLBACK_INVESTORS: Investor[] = [];

export const FALLBACK_OPPORTUNITIES: StartupOpportunity[] = [];
