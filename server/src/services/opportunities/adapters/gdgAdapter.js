/**
 * Google Developer Groups (GDG) Adapter
 * Fetches public upcoming events from community.dev public search endpoint.
 */

import { OPPORTUNITY_CATEGORIES, LOGO_PERMISSION_STATUS, sanitizeText } from '../schema.js';

export async function fetchGDGEvents(source) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = source.endpoint || 'https://gdg.community.dev/api/search/?result_types=upcoming_event';
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HookZ-Worldwide-Opportunities-Collector/1.0 (+https://hookz.in)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`GDG API returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.results || (Array.isArray(data) ? data : []);

    const opportunities = [];

    for (const item of results) {
      if (!item.title) continue;

      const eventUrl = item.url ? (item.url.startsWith('http') ? item.url : `https://gdg.community.dev${item.url}`) : null;
      if (!eventUrl) continue;

      const city = item.city || item.chapter?.city || null;
      const country = item.country || item.chapter?.country || 'Worldwide';
      const isOnline = Boolean(item.is_virtual || item.event_type === 'virtual' || (!city && !country));

      const opp = {
        id: `opp-gdg-${item.id || item.event_id || Math.abs(hashCode(eventUrl))}`,
        source_id: source.id,
        external_event_id: String(item.id || item.event_id || eventUrl),
        title: item.title,
        organizer_name: item.chapter?.title || 'Google Developer Groups',
        organizer_logo_url: null,
        logo_source_url: null,
        logo_permission_status: LOGO_PERMISSION_STATUS.TEXT_FALLBACK,
        description_summary: sanitizeText(item.description_short || item.description || 'Google Developer Groups technical workshop, developer keynote, and hands-on session.', 1000),
        category: OPPORTUNITY_CATEGORIES.GOOGLE_DEVELOPER_EVENT,
        subcategory: item.tags ? (Array.isArray(item.tags) ? item.tags.join(', ') : item.tags) : 'Developer Workshop',
        country: country,
        city: city,
        location: isOnline ? 'Online / Virtual' : `${city ? city + ', ' : ''}${country}`,
        participation_mode: isOnline ? 'ONLINE' : 'OFFLINE',
        start_date: item.start_date || item.start_date_iso || null,
        end_date: item.end_date || item.end_date_iso || item.start_date || null,
        registration_deadline: item.end_date || item.start_date || null,
        registration_url: eventUrl,
        original_source_url: eventUrl,
        price_type: 'FREE',
        price_amount: 0,
        currency: 'FREE',
        certificate_available: true,
        eligibility: 'Open to all developers, students, and engineers worldwide',
        skills_required: ['Google Cloud', 'Android', 'Web Development', 'AI/ML', 'Firebase'],
        status: item.status === 'Cancelled' ? 'CANCELLED' : 'APPROVED',
      };

      opportunities.push(opp);
    }

    return opportunities;
  } catch (err) {
    clearTimeout(timer);
    // In restricted sandbox environments or when external API is unreachable, throw so caller can record error or use cache
    throw new Error(`GDG Adapter error: ${err.message}`);
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

