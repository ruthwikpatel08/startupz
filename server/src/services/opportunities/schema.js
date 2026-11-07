/**
 * HookZ Worldwide Opportunities & Events Schema & Validation
 * Defines standard data structures, categories, modes, and security validators.
 */

export const OPPORTUNITY_CATEGORIES = {
  HACKATHON: 'Hackathon',
  CODING_COMPETITION: 'Coding Competition',
  STARTUP_COMPETITION: 'Startup Competition',
  INNOVATION_CHALLENGE: 'Innovation Challenge',
  GOOGLE_DEVELOPER_EVENT: 'Google Developer Event',
  MICROSOFT_EVENT: 'Microsoft Event',
  AWS_WORKSHOP: 'AWS Workshop',
  AI_ML_EVENT: 'AI & Machine Learning Event',
  CERTIFICATE_PROGRAMME: 'Certificate Programme',
  SKILL_CLASS: 'Skill Development Class',
  ONLINE_COURSE: 'Online Course & Training',
  TECHNICAL_WORKSHOP: 'Technical Workshop',
  WEBINAR: 'Webinar',
  STUDENT_DEVELOPER_PROGRAMME: 'Student Developer Programme',
  INTERNSHIP_LEARNING: 'Internship & Learning Opportunity',
  OTHER: 'Other Opportunity',
};

export const PARTICIPATION_MODES = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  HYBRID: 'HYBRID',
};

export const LOGO_PERMISSION_STATUS = {
  VERIFIED_PERMITTED: 'VERIFIED_PERMITTED',         // Verified open brand asset for event aggregation
  PUBLIC_FAVICON_FALLBACK: 'PUBLIC_FAVICON_FALLBACK', // Domain favicon fallback
  TEXT_FALLBACK: 'TEXT_FALLBACK',                   // Use clean styled text-based initials badge
  RESTRICTED: 'RESTRICTED',                         // Do not render third-party logo asset
};

export const OPPORTUNITY_STATUS = {
  APPROVED: 'APPROVED',           // Publicly visible in active listings
  PENDING_REVIEW: 'PENDING_REVIEW', // Awaiting admin approval (curated/untrusted sources)
  CANCELLED: 'CANCELLED',         // Organizer cancelled the event (hidden from public, kept for history)
  EXPIRED: 'EXPIRED',             // Past event date / deadline (hidden from active listings)
  COMPLETED: 'COMPLETED',         // Past event date (kept for history/portfolio)
  WITHDRAWN: 'WITHDRAWN',         // Withdrawn by organizer
  REJECTED: 'REJECTED',           // Rejected by HookZ admin
};

export const SOURCE_COLLECTION_METHOD = {
  PUBLIC_API: 'PUBLIC_API',
  RSS: 'RSS',
  ICAL: 'ICAL',
  PUBLIC_JSON: 'PUBLIC_JSON',
  PARTNER_INTEGRATION: 'PARTNER_INTEGRATION',
  MANUAL_ENTRY: 'MANUAL_ENTRY',
};

export const SOURCE_PERMISSION_STATUS = {
  VERIFIED_OPEN_PUBLIC: 'VERIFIED_OPEN_PUBLIC',         // Verified public syndication (e.g. Bevy public API, RSS)
  REQUIRES_API_KEY: 'REQUIRES_API_KEY',                 // Requires registered platform developer key
  REQUIRES_WRITTEN_PERMISSION: 'REQUIRES_WRITTEN_PERMISSION', // Scraping disallowed; requires explicit partnership
  MANUAL_CURATION_PERMITTED: 'MANUAL_CURATION_PERMITTED',   // Permitted for manually curated listings with direct links
};

/**
 * Validates external URL for safety.
 * Only http and https protocols are permitted; rejects javascript:, data:, or malformed URIs.
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes text content against HTML tags or script injection.
 */
export function sanitizeText(text, maxLength = 5000) {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&nbsp;/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes an raw opportunity payload into HookZ's Common Opportunity Data Structure.
 */
export function normalizeOpportunity(raw, sourceMeta = {}) {
  if (!raw || !raw.title) return null;

  const regUrl = raw.registration_url || raw.registrationUrl || raw.url || raw.link || '';
  if (!isValidUrl(regUrl)) {
    return null; // A valid registration URL is mandatory for discovery redirection
  }

  const origUrl = raw.original_source_url || raw.originalSourceUrl || regUrl;
  const safeOrigUrl = isValidUrl(origUrl) ? origUrl : regUrl;

  const nowIso = new Date().toISOString();

  // Parse and validate dates
  const parseDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };

  const startDate = parseDate(raw.start_date || raw.startDate);
  const endDate = parseDate(raw.end_date || raw.endDate || raw.start_date || raw.startDate);
  const regDeadline = parseDate(raw.registration_deadline || raw.registrationDeadline || endDate);
  const regOpenDate = parseDate(raw.registration_open_date || raw.registrationOpenDate || raw.created_at || raw.createdAt);

  // Auto-expiry detection based on current time
  const now = Date.now();
  let status = raw.status || OPPORTUNITY_STATUS.APPROVED;
  if (endDate && new Date(endDate).getTime() < now) {
    status = OPPORTUNITY_STATUS.EXPIRED;
  }

  // Participation mode
  let mode = String(raw.participation_mode || raw.participationMode || 'ONLINE').toUpperCase();
  if (!['ONLINE', 'OFFLINE', 'HYBRID'].includes(mode)) {
    const locLower = String(raw.location || '').toLowerCase();
    if (locLower.includes('online') || locLower.includes('virtual') || locLower.includes('remote')) {
      mode = 'ONLINE';
    } else if (locLower.includes('hybrid')) {
      mode = 'HYBRID';
    } else if (raw.country && raw.country !== 'Worldwide') {
      mode = 'OFFLINE';
    } else {
      mode = 'ONLINE';
    }
  }

  // Price type
  let priceType = String(raw.price_type || raw.priceType || 'FREE').toUpperCase();
  if (!['FREE', 'PAID'].includes(priceType)) priceType = 'FREE';

  // Skills required array
  let skills = [];
  if (Array.isArray(raw.skills_required || raw.skillsRequired)) {
    skills = (raw.skills_required || raw.skillsRequired).map(s => sanitizeText(s, 50)).filter(Boolean);
  } else if (typeof (raw.skills_required || raw.skillsRequired) === 'string') {
    skills = (raw.skills_required || raw.skillsRequired).split(',').map(s => sanitizeText(s, 50)).filter(Boolean);
  }

  // Logo permission handling
  let logoPermStatus = raw.logo_permission_status || raw.logoPermissionStatus || LOGO_PERMISSION_STATUS.TEXT_FALLBACK;
  let organizerLogo = raw.organizer_logo_url || raw.organizerLogoUrl || null;
  if (organizerLogo && !isValidUrl(organizerLogo)) {
    organizerLogo = null;
    logoPermStatus = LOGO_PERMISSION_STATUS.TEXT_FALLBACK;
  }

  const category = raw.category || OPPORTUNITY_CATEGORIES.OTHER;

  return {
    id: raw.id || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    source_id: raw.source_id || raw.sourceId || sourceMeta.id || 'manual',
    external_event_id: String(raw.external_event_id || raw.externalEventId || raw.id || regUrl).trim(),
    title: sanitizeText(raw.title, 200),
    organizer_name: sanitizeText(raw.organizer_name || raw.organizerName || sourceMeta.name || 'Global Organizer', 120),
    organizer_logo_url: organizerLogo,
    logo_source_url: isValidUrl(raw.logo_source_url || raw.logoSourceUrl) ? (raw.logo_source_url || raw.logoSourceUrl) : null,
    logo_permission_status: logoPermStatus,
    description_summary: sanitizeText(raw.description_summary || raw.descriptionSummary || raw.description || '', 1500),
    category,
    subcategory: sanitizeText(raw.subcategory || '', 80) || null,
    country: sanitizeText(raw.country || 'Worldwide', 80),
    city: raw.city ? sanitizeText(raw.city, 80) : null,
    location: sanitizeText(raw.location || (mode === 'ONLINE' ? 'Online / Virtual' : 'In-Person Event'), 150),
    participation_mode: mode,
    start_date: startDate,
    end_date: endDate,
    registration_open_date: regOpenDate,
    registration_deadline: regDeadline,
    registration_url: regUrl.trim(),
    original_source_url: safeOrigUrl.trim(),
    price_type: priceType,
    price_amount: typeof raw.price_amount === 'number' ? raw.price_amount : (raw.priceAmount ? Number(raw.priceAmount) : 0),
    currency: raw.currency || (priceType === 'FREE' ? 'FREE' : 'USD'),
    certificate_available: Boolean(raw.certificate_available ?? raw.certificateAvailable ?? false),
    eligibility: sanitizeText(raw.eligibility || 'Open to all students, developers, and builders worldwide', 250),
    skills_required: skills,
    status,
    last_verified_at: raw.last_verified_at || raw.lastVerifiedAt || nowIso,
    last_source_update_at: raw.last_source_update_at || raw.lastSourceUpdateAt || nowIso,
    created_at: raw.created_at || raw.createdAt || nowIso,
    updated_at: nowIso,
  };
}

